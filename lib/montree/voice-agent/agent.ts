// lib/montree/voice-agent/agent.ts
//
// Astra VOICE agent — starts/stops an Agora Conversational AI Engine agent
// inside an RTC channel via Agora's REST API (Basic auth with
// AGORA_CUSTOMER_KEY / AGORA_CUSTOMER_SECRET — the same credentials already
// used for Cloud Recording). The agent does multilingual ASR + TTS and binds
// the conversation to an LLM.
//
// FOUNDATION SCOPE
//   The LLM is bound DIRECTLY to Anthropic (Astra's voice persona) so the
//   principal can hold a hands-free, multilingual conversation. The
//   ACTION/TOOL layer (book appointment, send message) is the next increment:
//   swap llm.url to a server-side custom-LLM shim that wraps
//   lib/montree/tracy/tool-executor.ts so tool calls run with confirm gates.
//
// DOCS (verified May 2026):
//   POST  /conversational-ai-agent/v2/projects/{appid}/join
//   POST  /conversational-ai-agent/v2/projects/{appid}/agents/{agentId}/leave
//   Auth: Basic base64(customerKey:customerSecret)

import { getAgoraConfig } from '@/lib/montree/appointments/agora/config';
import { AI_MODEL } from '@/lib/ai/anthropic';
import { buildVoiceLlmUrl, isVoiceLlmConfigured } from './llm-auth';

const AGORA_CONVOAI_BASE =
  'https://api.agora.io/api/conversational-ai-agent/v2/projects';

export interface StartVoiceAgentArgs {
  channel: string;
  agentUid: number; // the agent's own RTC uid
  agentToken: string; // token minted for agentUid on this channel
  principalUid: number; // the human the agent subscribes to
  systemPrompt: string;
  greeting: string;
  language: string; // BCP-47, e.g. 'en-US', 'zh-CN'
  // When all three are set AND VOICE_LLM_SHARED_SECRET is configured, the
  // agent's LLM is bound to our tool-capable shim instead of Anthropic direct,
  // giving the voice agent Astra's full (confirm-gated) action tools.
  publicOrigin?: string;
  schoolId?: string;
  principalId?: string;
}

export interface VoiceAgentStartResult {
  agentId: string;
  status: string;
}

function authHeader(): string | null {
  const { config } = getAgoraConfig();
  if (!config || !config.customerKey || !config.customerSecret) return null;
  const basic = Buffer.from(
    `${config.customerKey}:${config.customerSecret}`
  ).toString('base64');
  return `Basic ${basic}`;
}

/**
 * Which required server credentials for the voice agent are absent. Returns
 * the missing ENV VAR NAMES only (never values) so a 503 can tell the
 * operator exactly what to set in Railway instead of an opaque failure.
 * Empty array = fully configured.
 */
export function voiceAgentMissingConfig(): string[] {
  const missing: string[] = [];
  const { config } = getAgoraConfig();
  if (!config?.appId) missing.push('AGORA_APP_ID');
  if (!config?.appCertificate) missing.push('AGORA_APP_CERTIFICATE');
  // ConvoAI REST join uses Basic auth with the same customer key/secret as
  // Cloud Recording — a DIFFERENT credential from the App ID/certificate that
  // signs join tokens. The client can mint a token + join the channel without
  // these, which is why audio connects but the agent never starts.
  if (!config?.customerKey) missing.push('AGORA_CUSTOMER_KEY');
  if (!config?.customerSecret) missing.push('AGORA_CUSTOMER_SECRET');
  if (!process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
  if (!process.env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY'); // required for TTS
  return missing;
}

/**
 * Start the Astra voice agent in a channel. Returns null when Agora /
 * provider keys are not configured (caller maps to 503). Throws on a
 * non-2xx Agora response so the route can surface the reason.
 */
export async function startVoiceAgent(
  args: StartVoiceAgentArgs
): Promise<VoiceAgentStartResult | null> {
  const { config } = getAgoraConfig();
  const auth = authHeader();
  if (!config || !auth) return null;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  // Both required: Anthropic for the brain, OpenAI for multilingual TTS
  // (tts is a REQUIRED block in the Agora contract).
  if (!anthropicKey || !openaiKey) return null;

  // Prefer the tool-capable shim (Astra can act) when it's configured;
  // otherwise bind the LLM straight to Anthropic for a conversation-only agent.
  const shimUrl =
    args.publicOrigin && args.schoolId && args.principalId && isVoiceLlmConfigured()
      ? buildVoiceLlmUrl(args.publicOrigin, args.schoolId, args.principalId)
      : null;
  const llm = shimUrl
    ? {
        url: shimUrl,
        api_key: process.env.VOICE_LLM_SHARED_SECRET,
        style: 'openai',
        greeting_message: args.greeting,
        failure_message: 'One moment please.',
        max_history: 32,
        params: { model: AI_MODEL },
      }
    : {
        url: 'https://api.anthropic.com/v1/messages',
        api_key: anthropicKey,
        // 🚨 REQUIRED by Agora's "anthropic" style. Without the anthropic-version
        // header, api.anthropic.com rejects EVERY request, so the agent connected
        // + did ASR but spoke failure_message ('One moment please.') on every
        // turn and never answered. Agora expects this as a STRINGIFIED JSON
        // object (per Agora's Claude LLM docs sample), not a plain object.
        headers: JSON.stringify({ 'anthropic-version': '2023-06-01' }),
        style: 'anthropic',
        // Agora's documented Claude sample uses role 'user' for system_messages
        // (Anthropic has no 'system' role inside the messages array — Agora maps
        // system_messages to the top-level system param).
        system_messages: [{ role: 'user', content: args.systemPrompt }],
        greeting_message: args.greeting,
        failure_message: 'One moment please.',
        max_history: 32,
        params: { model: AI_MODEL, max_tokens: 1024 },
      };

  const body = {
    name: `astra-${args.channel}-${Date.now()}`,
    properties: {
      channel: args.channel,
      token: args.agentToken,
      agent_rtc_uid: String(args.agentUid),
      remote_rtc_uids: [String(args.principalUid)],
      idle_timeout: 60,
      asr: { language: args.language },
      llm,
      // OpenAI multilingual TTS (key already used for Whisper). Param names
      // follow Agora's TTS Overview — confirm/tune on the first device test.
      tts: {
        vendor: 'openai',
        params: {
          api_key: openaiKey,
          model: 'gpt-4o-mini-tts',
          voice: 'alloy',
        },
      },
    },
  };

  const resp = await fetch(`${AGORA_CONVOAI_BASE}/${config.appId}/join`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(
      `Agora ConvoAI join failed (${resp.status}): ${text.slice(0, 300)}`
    );
  }
  const data = (await resp.json()) as { agent_id?: string; status?: string };
  if (!data.agent_id) {
    throw new Error('Agora ConvoAI join returned no agent_id');
  }
  return { agentId: data.agent_id, status: data.status ?? 'UNKNOWN' };
}

/** Stop a running Astra voice agent. Returns true on a 2xx from Agora. */
export async function stopVoiceAgent(agentId: string): Promise<boolean> {
  const { config } = getAgoraConfig();
  const auth = authHeader();
  if (!config || !auth) return false;
  const resp = await fetch(
    `${AGORA_CONVOAI_BASE}/${config.appId}/agents/${encodeURIComponent(
      agentId
    )}/leave`,
    {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
    }
  );
  return resp.ok;
}
