// lib/montree/guru/conversational-prompt.ts
// Conversational system prompt for WhatsApp-style Guru chat (homeschool parents only)
// Teachers continue using buildGuruPrompt() from prompt-builder.ts

import { ChildContext, formatContextForPrompt } from './context-builder';
import { KnowledgeResult, formatKnowledgeForPrompt } from './knowledge-retriever';
import { getConcernById } from './concern-mappings';

const CONVERSATIONAL_SYSTEM_PROMPT = `You are a warm, knowledgeable Montessori guide — like a wise friend who happens to have 30 years of Montessori experience. You're chatting with a homeschool parent through a messaging app.

YOUR PERSONALITY:
- Warm, encouraging, and real — like texting a trusted mentor
- You validate feelings before giving advice
- You celebrate small wins
- You're honest about challenges without being scary
- You speak in natural paragraphs, not structured reports
- You're concise — 3-5 short paragraphs max per message
- You use the child's name naturally

YOUR EXPERTISE:
- Deep knowledge of Maria Montessori's original writings and philosophy
- You understand sensitive periods, normalization, and the prepared environment
- You know every Montessori work across all 5 areas
- You can suggest DIY home alternatives for any material
- You know when something is developmentally normal vs a concern worth investigating

CRITICAL RULES:
1. NEVER use jargon without explaining it simply
2. NEVER output structured sections (no "INSIGHT:", "ROOT CAUSE:", "ACTION PLAN:" headers)
3. ALWAYS write in natural conversational paragraphs
4. When suggesting a Montessori work, briefly explain what it is AND give a home version
5. Reference the child's actual progress data when available
6. Be specific to THIS child — never give generic advice
7. If the parent's concern maps to a real developmental red flag, gently mention it
8. End messages with something encouraging or a gentle prompt ("How does that sound?" or "Let me know how it goes!")

CONVERSATION MEMORY:
If you have previous messages, build on them naturally:
- Reference things you discussed before
- Ask follow-ups ("Last time you mentioned X — how's that going?")
- Notice patterns across conversations
- If previous advice didn't work, try a different approach`;

export interface ConversationalPromptParts {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Build a conversational prompt for the Guru chat thread.
 * Unlike buildGuruPrompt(), this produces natural conversation — no structured sections.
 */
export function buildConversationalPrompt(
  question: string,
  childContext: ChildContext,
  knowledge: KnowledgeResult,
  savedConcerns: string[],
  isFirstMessage: boolean,
): ConversationalPromptParts {
  const formattedContext = formatContextForPrompt(childContext);
  const formattedKnowledge = formatKnowledgeForPrompt(knowledge);
  const childName = childContext.name?.split(' ')[0] || 'the child';

  // Build concern context
  let concernContext = '';
  if (savedConcerns.length > 0) {
    const concernDetails = savedConcerns
      .map(id => getConcernById(id))
      .filter(Boolean)
      .map(c => `- ${c!.title}: ${c!.shortDesc}`)
      .join('\n');
    concernContext = `\nTHIS PARENT'S MAIN CONCERNS:\n${concernDetails}\nKeep these concerns in mind when giving advice. Weave them in naturally when relevant.\n`;
  }

  // Build the system prompt with concern context
  let systemPrompt = CONVERSATIONAL_SYSTEM_PROMPT;
  if (concernContext) {
    systemPrompt += '\n' + concernContext;
  }

  // First message gets a special greeting instruction
  let userPrompt: string;
  if (isFirstMessage) {
    userPrompt = `CHILD PROFILE:\n${formattedContext}\n\n${formattedKnowledge}\n\nThis is your FIRST conversation with this parent about ${childName}. Start with a warm, personal greeting that shows you know something about their child (reference their age, current works, or concerns). Then address their message naturally.\n\nPARENT'S MESSAGE:\n${question}`;
  } else {
    userPrompt = `CHILD PROFILE:\n${formattedContext}\n\n${formattedKnowledge}\n\nPARENT'S MESSAGE:\n${question}`;
  }

  return { systemPrompt, userPrompt };
}

/**
 * Build an opening greeting when the parent first enters the chat after onboarding.
 * This is sent automatically — the parent hasn't asked anything yet.
 */
export function buildGreetingPrompt(
  childContext: ChildContext,
  savedConcerns: string[],
): ConversationalPromptParts {
  const formattedContext = formatContextForPrompt(childContext);
  const childName = childContext.name?.split(' ')[0] || 'your child';

  const concernNames = savedConcerns
    .map(id => getConcernById(id))
    .filter(Boolean)
    .map(c => c!.title.toLowerCase())
    .join(' and ');

  const systemPrompt = CONVERSATIONAL_SYSTEM_PROMPT;

  const userPrompt = `CHILD PROFILE:\n${formattedContext}\n\nThe parent just finished setting up their concerns (${concernNames || 'none specified'}). Write a SHORT, warm opening greeting (2-3 sentences max) that:\n1. Welcomes them by referencing ${childName} by name\n2. Acknowledges their concerns naturally (don't list them — weave them in)\n3. Invites them to ask anything\n\nKeep it brief and warm — this is just a greeting, not a full response. Like a friend saying "Hey! I'm here for you."`;

  return { systemPrompt, userPrompt };
}

/**
 * Build a follow-up greeting when the parent returns after 2+ days.
 */
export function buildFollowUpPrompt(
  childContext: ChildContext,
  savedConcerns: string[],
  lastQuestion: string,
  daysSinceLastChat: number,
): ConversationalPromptParts {
  const formattedContext = formatContextForPrompt(childContext);
  const childName = childContext.name?.split(' ')[0] || 'your child';

  const systemPrompt = CONVERSATIONAL_SYSTEM_PROMPT;

  const userPrompt = `CHILD PROFILE:\n${formattedContext}\n\nThe parent is back after ${daysSinceLastChat} days. Their last question was: "${lastQuestion}"\n\nWrite a SHORT follow-up greeting (2 sentences max) for ${childName}'s parent:\n1. Welcome them back warmly\n2. Ask about how things went since last time (reference their last question naturally)\n\nKeep it brief — just a friendly check-in, not a full response.`;

  return { systemPrompt, userPrompt };
}
