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

const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
};

const INTAKE_MODE = `MODE: INTAKE
This is a new family. Your goal:
1. Ask about the child — personality, interests, challenges, any Montessori experience
2. Ask 2-3 follow-up questions to understand the child deeply
3. When you have enough info, call save_child_profile with structured data
4. Then set up the shelf: call set_focus_work once for each of the 5 areas
5. Call save_checkin to schedule the first weekly check-in (7 days)
6. Explain what you've set up and walk them through the first work`;

const CHECKIN_MODE = `MODE: WEEKLY CHECK-IN
It's time for this child's weekly check-in. Your goal:
1. Greet warmly, ask how the week went
2. Go through each area on the shelf — ask about each work
3. Based on reports: update_progress for works that changed status
4. Rotate the shelf: set_focus_work for any areas where the child is ready for a new work
5. Save notable observations via save_observation
6. Call save_checkin with a summary and schedule the next check-in
7. Give encouragement and preview what's coming next week`;

const NORMAL_MODE = `MODE: NORMAL CONVERSATION
Answer the parent's question naturally. You may use tools if the conversation warrants it
(e.g., parent says "she mastered it!" → call update_progress), but don't force tool use.`;

const TOOL_USE_INSTRUCTIONS = `You have access to tools that modify the child's learning plan.
Use them naturally during conversation — don't announce "I'm calling a tool."
After using tools, reference what you did conversationally:
  "I've updated the shelf — here's what's new this week..."
  "Great news! I've marked Pink Tower as mastered."
Do NOT call tools unnecessarily. Only call them when the conversation warrants a real change.`;

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
  childSettings?: Record<string, unknown>,
): ConversationalPromptParts {
  const formattedContext = formatContextForPrompt(childContext);
  const formattedKnowledge = formatKnowledgeForPrompt(knowledge);
  const childName = childContext.name?.split(' ')[0] || 'the child';

  // Determine mode — defaults to NORMAL if childSettings not passed
  const intakeComplete = (childSettings?.guru_intake_complete as boolean) ?? false;
  const nextCheckin = (childSettings?.guru_next_checkin as string) ?? null;
  const isCheckinDue = nextCheckin ? new Date(nextCheckin) <= new Date() : false;

  let modeInstructions: string;
  if (!intakeComplete) {
    modeInstructions = INTAKE_MODE;
  } else if (isCheckinDue) {
    modeInstructions = CHECKIN_MODE;
  } else {
    modeInstructions = NORMAL_MODE;
  }

  // Build shelf context
  const shelfContext = childContext.focus_works?.length > 0
    ? "CURRENT SHELF:\n" +
      childContext.focus_works.map(fw =>
        `- ${AREA_LABELS[fw.area] || fw.area}: ${fw.work_name} (since ${new Date(fw.set_at).toLocaleDateString()})`
      ).join("\n")
    : "CURRENT SHELF: Empty — no focus works set. You should set up the shelf.";

  // Build child profile context
  const profileContext = childContext.guru_child_profile
    ? `CHILD PROFILE (from intake):\n${JSON.stringify(childContext.guru_child_profile)}`
    : '';

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

  // Build the system prompt with all sections
  let systemPrompt = CONVERSATIONAL_SYSTEM_PROMPT;
  systemPrompt += '\n\n' + modeInstructions;
  systemPrompt += '\n\n' + TOOL_USE_INSTRUCTIONS;
  systemPrompt += '\n\n' + shelfContext;
  if (profileContext) {
    systemPrompt += '\n\n' + profileContext;
  }
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
