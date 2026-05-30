// app/api/montree/admin/voice/llm/route.ts
//
// The voice LLM shim. Agora's Conversational AI Engine calls THIS as its
// "LLM" (style: openai). We are the LLM from Agora's view: we receive the
// conversation, run Astra's real tool-loop server-side (reusing TRACY_TOOLS +
// executeTracyTool), and return the final spoken text. Agora never sees the
// tool calls — it just gets words to speak.
//
// WHY a shim (not llm bound straight to Anthropic): tool execution must run
// inside Montree, authenticated and school-scoped. Agora has no Montree
// session, so we mint a short-lived principal token here (server-side, never
// exposed) and drive the existing authenticated tool path with it.
//
// SECURITY (fail-closed; inert unless VOICE_LLM_SHARED_SECRET is set):
//   1. Bearer must equal VOICE_LLM_SHARED_SECRET (Agora sends it as llm.api_key).
//   2. ?sid&pid must carry a valid HMAC ?sig (only our agent-start can mint it).
//   3. The school's `voice_astra` flag must be on.
// Mutations (book/message/record) are hard-gated on a `confirmed:true` flag —
// Astra must say the action aloud and hear "yes" first.

import { NextRequest, NextResponse } from 'next/server';
import type {
  MessageParam,
  ContentBlockParam,
} from '@anthropic-ai/sdk/resources/messages';
import { getSupabase } from '@/lib/supabase-client';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { isFeatureEnabled } from '@/lib/montree/features';
import { createMontreeToken, MONTREE_AUTH_COOKIE } from '@/lib/montree/server-auth';
import { executeTracyTool } from '@/lib/montree/tracy/tool-executor';
import {
  VOICE_TOOLS,
  needsConfirmation,
  stripConfirmed,
} from '@/lib/montree/voice-agent/voice-tools';
import {
  verifyVoiceLlmBearer,
  verifyVoiceScope,
  isVoiceLlmConfigured,
} from '@/lib/montree/voice-agent/llm-auth';

export const maxDuration = 60;

const MAX_TOOL_ROUNDS = 5;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SYSTEM_PROMPT = [
  'You are Astra, the principal’s spoken chief-of-staff. You are heard, not read.',
  'Speak in short, natural sentences — no markdown, no lists. Reply in the',
  'language the principal speaks.',
  '',
  'You can act using tools (look up children, schedule appointments, send',
  'messages). Rules for ACTIONS:',
  '- Before any tool that books, messages, or records something, describe',
  '  exactly what you will do and ask the principal to confirm out loud.',
  '- Only after they clearly say yes, call the tool again with confirmed:true.',
  '- Never invent names, times, or facts. If unsure, ask.',
].join('\n');

// OpenAI-style request (what Agora sends with style:"openai").
interface OpenAiMessage {
  role: string;
  content?: unknown;
}

function openAiText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) =>
        p && typeof p === 'object' && 'text' in p
          ? String((p as { text?: unknown }).text ?? '')
          : ''
      )
      .join(' ')
      .trim();
  }
  return '';
}

function completion(text: string) {
  return NextResponse.json({
    id: `astra-voice-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    choices: [
      { index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' },
    ],
    usage: {},
  });
}

export async function POST(request: NextRequest) {
  if (!isVoiceLlmConfigured()) {
    return NextResponse.json({ error: 'voice llm not configured' }, { status: 503 });
  }
  if (!verifyVoiceLlmBearer(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const sid = (url.searchParams.get('sid') || '').trim();
  const pid = (url.searchParams.get('pid') || '').trim();
  const sig = (url.searchParams.get('sig') || '').trim();
  if (!UUID_RE.test(sid) || !pid || !sig || !verifyVoiceScope(sid, pid, sig)) {
    return NextResponse.json({ error: 'bad scope' }, { status: 403 });
  }

  if (!anthropic) {
    return completion('Sorry, I’m not available right now.');
  }

  const supabase = getSupabase();
  const enabled = await isFeatureEnabled(supabase, sid, 'voice_astra');
  if (!enabled) {
    return completion('Voice assistant is not enabled for this school yet.');
  }

  // Parse the conversation Agora forwards.
  let body: { messages?: OpenAiMessage[] };
  try {
    body = (await request.json()) as { messages?: OpenAiMessage[] };
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const messages: MessageParam[] = incoming
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m): MessageParam => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: openAiText(m.content),
    }))
    .filter((m) => typeof m.content === 'string' && m.content.length > 0);
  if (messages.length === 0 || messages[0].role !== 'user') {
    messages.unshift({ role: 'user', content: 'Hello' });
  }

  // Mint a short-lived principal token so the existing authenticated tool path
  // works. The token never leaves this server.
  const token = await createMontreeToken({ sub: pid, schoolId: sid, role: 'principal' });
  const internalRequest = new NextRequest('http://127.0.0.1/voice-llm-internal', {
    headers: { cookie: `${MONTREE_AUTH_COOKIE}=${token}` },
  });

  const deps = {
    supabase,
    anthropic,
    schoolId: sid,
    principalId: pid,
    request: internalRequest,
    locale: 'en',
  };

  let finalText = '';
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const resp = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: VOICE_TOOLS,
      messages,
    });

    const textParts = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join(' ')
      .trim();
    if (textParts) finalText = textParts;

    const toolUses = resp.content.filter((b) => b.type === 'tool_use');
    if (toolUses.length === 0) break;

    // Accumulate the assistant turn (Session 137 lesson: keep full history).
    messages.push({ role: 'assistant', content: resp.content });

    const toolResults: ContentBlockParam[] = [];
    for (const tu of toolUses) {
      if (tu.type !== 'tool_use') continue;
      const input = (tu.input ?? {}) as Record<string, unknown>;
      if (needsConfirmation(tu.name, input)) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content:
            'NOT EXECUTED. Describe this exact action to the principal and ask ' +
            'them to confirm out loud. Only after a clear yes, call again with confirmed:true.',
        });
        continue;
      }
      try {
        const result = await executeTracyTool(tu.name, stripConfirmed(input), deps);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(result).slice(0, 6000),
          is_error: result && result.success === false ? true : undefined,
        });
      } catch (err) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: `tool error: ${err instanceof Error ? err.message : 'unknown'}`,
          is_error: true,
        });
      }
    }
    messages.push({ role: 'user', content: toolResults });
  }

  if (!finalText) {
    finalText = 'Okay.';
  }
  return completion(finalText);
}
