// lib/montree/mira/tool-definitions.ts
//
// Mira's tool surface. Two read tools (list_my_schools, list_my_codes,
// school_health) + three drafting tools (cold outreach, follow-up, translate).
// All read tools self-scope to auth.userId — see tool-executor.ts for the
// cross-pollination contract.

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const MIRA_TOOLS: Tool[] = [
  // ── READ TOOLS ────────────────────────────────────────────────────────
  {
    name: 'list_my_schools',
    description:
      "List the schools the agent has referred. Returns each school with: id, name, created_at, student_count, revenue_share_pct, revenue_share_active, last_active_at (most recent activity signal — login, photo, or AI call). Use whenever the agent asks 'how are my schools doing?', 'what's in my book?', 'list my schools', or names a school but you don't have its id yet.",
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_my_codes',
    description:
      "List the agent's referral codes. Each entry: code, status ('pending' | 'redeemed' | 'revoked' | 'expired'), pitch_label (the agent's note about which school this code was for), redeemed_by_school_name (if any), revenue_share_pct, created_at. Use when the agent asks 'what codes do I have out there?', 'which codes haven't converted?', 'how is MIRA-2GH4 doing?'. Filter inline if she asks about a specific status.",
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'redeemed', 'revoked', 'expired'],
          description:
            'Optional status filter. Defaults to all statuses. Use "pending" to find schools the agent pitched but who haven\'t signed up yet — those are the follow-up candidates.',
        },
      },
    },
  },
  {
    name: 'school_health',
    description:
      "Read the activity signal of a single school the agent has referred. Returns: student_count, classroom_count, days_since_last_activity, principal_logged_in_at, recent_photo_count_this_week, ai_tier ('free' | 'haiku' | 'sonnet'), and a verdict line ('healthy' | 'quiet' | 'idle' | 'never_started'). Use when the agent names a converted school and wants to know whether to nudge, leave alone, or write off. Requires school_id — call list_my_schools first to resolve a name to an id.",
    input_schema: {
      type: 'object',
      properties: {
        school_id: { type: 'string' },
      },
      required: ['school_id'],
    },
  },

  // ── DRAFT TOOLS ───────────────────────────────────────────────────────
  {
    name: 'draft_outreach_email',
    description:
      "Draft a cold outreach email the agent can copy + send. Returns a single text body (subject line + body separated by a blank line). Use when the agent asks to 'draft an email to [school]', 'write a pitch for [school]', 'cold-pitch [school]'. Pass the school name, country (for cultural register), target language (en/zh/es/de/fr/pt/nl/it/ja/ko/uk/ru), and any context the agent gave you about why this school in particular (e.g., 'they emailed asking for details', 'AMI school, training centre, multi-campus'). The tool will produce a warm, specific, decisive cold pitch in the requested language.",
    input_schema: {
      type: 'object',
      properties: {
        school_name: { type: 'string' },
        country: {
          type: 'string',
          description:
            "Country (or city if city is more specific) — used for cultural register. E.g., 'China' / 'Argentina' / 'Italy'.",
        },
        language: {
          type: 'string',
          enum: ['en', 'zh', 'es', 'de', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru'],
          description: "Target language for the email body. Defaults to 'en' if omitted.",
        },
        context: {
          type: 'string',
          description:
            "Anything the agent told you about this school. Keep it brief — 1-3 sentences. E.g., 'AMI-affiliated, runs a training centre, three campuses across Buenos Aires'.",
        },
      },
      required: ['school_name'],
    },
  },
  {
    name: 'draft_followup_email',
    description:
      "Draft a polite follow-up nudge the agent can send to a school she's already pitched. Returns a single text body. Use when the agent says 'draft a follow-up for [school]', 'nudge [school]', 'they haven't replied to [school]'. Same parameters as draft_outreach_email — the tool generates a warmer, shorter follow-up that references the prior outreach without being apologetic.",
    input_schema: {
      type: 'object',
      properties: {
        school_name: { type: 'string' },
        country: { type: 'string' },
        language: {
          type: 'string',
          enum: ['en', 'zh', 'es', 'de', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru'],
        },
        days_since_first_email: {
          type: 'number',
          description: 'Roughly how many days since the original pitch. Shapes the tone.',
        },
        context: {
          type: 'string',
          description: 'Anything the agent has shared since the original outreach (e.g., reply received, sentiment, anything new about the school).',
        },
      },
      required: ['school_name'],
    },
  },
  {
    name: 'translate_text',
    description:
      "Translate a piece of text the agent has already written into a target language. Use when the agent says 'translate this to Spanish', 'put this in Chinese', or pastes a draft and asks for a localised version. Pass the source text and target language. Returns the translated text only — no commentary, no explanation. The tool preserves tone, register, and line breaks.",
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        target_language: {
          type: 'string',
          enum: ['en', 'zh', 'es', 'de', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru'],
        },
      },
      required: ['text', 'target_language'],
    },
  },

  // ── MESSAGING TOOLS (Phase 4.7 from Session 108 plan) ─────────────────
  // These tools actually WRITE rows to the agent_super_admin messaging
  // tables — they're how Mira-on-behalf-of-the-agent posts to Tredoux.
  // The agent must EXPLICITLY ask ("tell Tredoux X", "reply to that thread
  // saying Y"). Mira NEVER volunteers — see system-prompt.ts for the
  // posture. Cross-pollination is enforced server-side: every write is
  // scoped to deps.agentId.
  {
    name: 'list_my_threads_with_tredoux',
    description:
      "List the agent's existing threads with Tredoux (super-admin). Returns up to 20 most-recent threads with: id, subject, last_message_at, last_message_preview, last_sender ('agent' | 'super_admin'), unread (boolean — whether Tredoux has replied since the agent last read). Use BEFORE calling reply_in_thread to find the right thread, or when the agent asks 'what have I asked Tredoux lately?' / 'any reply from him?'.",
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'start_thread_with_tredoux',
    description:
      "Start a NEW thread with Tredoux on the agent's behalf. ONLY call this when the agent has explicitly asked you to message Tredoux ('tell Tredoux …', 'message Tredoux …', 'ask Tredoux …'). The body MUST be the message the agent wants sent — write it in her voice, short and direct, no greeting padding (the recipient knows who's writing). Returns thread_id + the posted message text. After firing, tell the agent the message is sent and surface the thread_id naturally so she can follow up.",
    input_schema: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description:
            'Short subject line (under 60 chars). Optional but helpful — names what the thread is about. e.g. "Trial pilot pricing for FAMM Argentina".',
        },
        body: {
          type: 'string',
          description:
            "The message body. Must be 1-10000 chars. Write it as the agent would — first person, direct. NO 'Hi Tredoux,' opener — he knows who it's from. NO sign-off — the system handles attribution.",
        },
      },
      required: ['body'],
    },
  },
  // ── DOSSIER PREP TOOLS (Session 133 — Phase D) ───────────────────────
  // get_platform_signal returns live aggregate numbers Mira can quote in
  // any pitch — never quote platform totals from memory. Cached 10 minutes.
  {
    name: 'get_platform_signal',
    description:
      "Pull live, current platform numbers for use as proof points in a pitch. Use whenever the agent needs a number ('how many schools?', 'how much data?', 'how many languages do you support?'). Returns active school count, active children, active classrooms, total confirmed observations, observations confirmed in the last 7 days, distinct languages, distinct countries. ALWAYS prefer this over stating numbers from memory — quoting a 6-month-old figure to a sophisticated principal is a credibility kill.",
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  // prepare_principal_pitch is the dossier builder — Sonnet call ~$0.05,
  // cached 24h. Only call when the agent has explicitly asked for meeting
  // prep, not as a generic info dump.
  {
    name: 'prepare_principal_pitch',
    description:
      "Produce a complete pre-pitch dossier for a meeting with a principal. CALL ONLY when the agent has explicitly asked for meeting prep — phrases like 'help me prepare for the Beijing principal', 'pull together a pitch dossier for [school]', 'I'm meeting [principal] tomorrow about Montree'. Calls get_platform_signal + the Mira knowledge base internally — DO NOT pull those separately first. Output is a structured Markdown dossier the agent reads once and walks into the meeting confident: opening message to send before the meeting, demo plan, pitch script (4 stages), probable objections + handlers, commission-disclosure section (framed as skin-in-the-game), things NOT to say, and three follow-up paths with literal text. Cached 24h. Cost ~\\$0.05 per dossier.",
    input_schema: {
      type: 'object',
      properties: {
        principal_name: {
          type: 'string',
          description: 'The principal\'s name (or best-known label, e.g. "Mrs Chen", "the Beijing principal").',
        },
        school_name: { type: 'string' },
        school_size: {
          type: 'string',
          description: 'Free-text size description, e.g. "250 students across 15 classrooms" or "a single 20-student classroom".',
        },
        country: { type: 'string' },
        language: {
          type: 'string',
          enum: ['en', 'zh', 'es', 'de', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru'],
          description: 'The language the recommended phrasings in the dossier should be in. Defaults to the agent\'s UI locale.',
        },
        known_pain_points: {
          type: 'array',
          items: { type: 'string' },
          description: 'Anything the agent knows about the principal\'s situation — overworked teachers, difficult parents, no Montessori training, etc. Each entry is 1-2 sentences.',
        },
        relationship: {
          type: 'string',
          description: 'Anything about how the agent knows this principal. e.g. "agent is a teacher at this school, principal doesn\'t yet know about Montree" / "principal replied to cold email asking for a demo" / "introduced via FAMM Argentina".',
        },
        output_format: {
          type: 'string',
          enum: ['markdown', 'html', 'json'],
          description: 'Output container. Default \"markdown\" (renders as a copy-card on the agent\'s screen).',
        },
      },
      required: ['principal_name', 'school_name'],
    },
  },
  {
    name: 'reply_in_thread',
    description:
      "Reply to an EXISTING thread with Tredoux. ONLY call this when the agent has explicitly asked you to reply to a specific thread, OR when she's responding to something Tredoux wrote. Requires a thread_id — call list_my_threads_with_tredoux first if you don't have one. Body must be the agent's actual message. Returns the posted message_id.",
    input_schema: {
      type: 'object',
      properties: {
        thread_id: {
          type: 'string',
          description: 'The thread id from list_my_threads_with_tredoux.',
        },
        body: {
          type: 'string',
          description:
            "The reply body. Must be 1-10000 chars. Write as the agent would, in her voice. No greeting / sign-off padding.",
        },
      },
      required: ['thread_id', 'body'],
    },
  },
  // ── KNOWLEDGE TOOL: consult_knowledge ────────────────────────────────
  // The system prompt carries only a SUMMARY of the knowledge base. This
  // tool pulls the FULL content of one topic when the agent needs real
  // depth — teaching a blank-slate agent the product, walking the
  // step-by-step playbook, full objection handlers, demo scripts. Read-only,
  // no scoping (knowledge is universal). After fetching, ALWAYS synthesize a
  // reply in Mira's voice — never dump the file back at the agent.
  {
    name: 'consult_knowledge',
    description:
      "Pull the FULL content of one Montree knowledge file when chat needs depth beyond the system-prompt summary. CALL THIS whenever the agent wants to LEARN or go deep — they're new and don't know the product, they ask 'teach me Montree', 'how do I sell this?', 'walk me through a demo', 'what do I say when they object to price?', 'how do referral codes / payouts work?'. Pick the topic by intent: product = ground-up overview of what Montree is + every surface + magic moment (use this to teach a beginner the product); playbook = the step-by-step agent operating manual from zero to first paid school + the code/signup/payout mechanics + agent economics (use this for 'what do I do?', 'how do I get paid?', 'I have a school interested, now what?'); elevator = the short pitches; features = features by pain point; pricing = price + how to talk about it; proof = proof points; pedagogical = Montessori credibility for heads of school; competitive = positioning vs other tools; personas = who buys and how each one decides; objections = the eight most common objections + handlers; demo_paths = sequenced 10/30/90-minute demo flows; cultural = pitching by country/language; follow_up = follow-up templates by outcome. After fetching, synthesize an answer IN MIRA'S VOICE tailored to the agent's situation — teach it, don't paste it. When teaching a brand-new agent, lead with product, then playbook.",
    input_schema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: [
            'product',
            'playbook',
            'elevator',
            'features',
            'pricing',
            'proof',
            'pedagogical',
            'competitive',
            'personas',
            'objections',
            'demo_paths',
            'cultural',
            'follow_up',
          ],
          description: 'Which knowledge file to pull in full.',
        },
      },
      required: ['topic'],
    },
  },
];
