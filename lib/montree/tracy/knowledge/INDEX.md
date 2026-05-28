# Tracy's psychological knowledge base — index

This directory holds the psychological depth Tracy applies when she helps
the principal prepare for and execute parent meetings. The architecture
mirrors Mira's knowledge base (`lib/montree/mira/knowledge/`) — load on
first use, cache in memory, inject a compact summary into Tracy's chat
system prompt every turn, inject the full bundle into the
`prepare_parent_meeting` dossier-builder Sonnet call.

The principal does not see these files. Tracy quotes from them, applies
their frameworks, lets them inform her tone. The user-facing artifact is
always the brief + dossier — never the framework itself.

## File map

**01 · psychological-foundation.md** — The Montessori developmental frame
for principals. The child you're discussing with the parent sits inside a
multi-year developmental arc. Your job, in any conversation about that
child, is to make the parent see the arc when she came in looking for
the verdict. Includes the prepared environment, sensitive periods,
normalization, concentration as the work of the child, the four planes of
development (with focus on plane 1: birth to six).

**02 · difficult-conversations.md** — Stone, Patton, Heen's three-layer
model (the "what happened" conversation / the feelings conversation / the
identity conversation), separating intent from impact, the "and stance",
and Patterson/Grenny's Crucial Conversations safety patterns. Application
to parent meetings: why "we're worried" breaks identity safety, why
"we've noticed + we're curious" preserves it.

**03 · nonviolent-communication.md** — Marshall Rosenberg's NVC. The
OFNR sequence (Observation, Feeling, Need, Request). The four ways a
person can receive criticism (blame self / blame other / empathy for
self / empathy for other) and why only the last two produce dialogue.
Why validation MUST precede reframing. Specific parent-conversation
examples translated from NVC into principal voice.

**04 · parent-psychology-patterns.md** — Five recognizable archetypes:
EXPECTATION-DRIVEN, ANXIETY-PROJECTING, HANDS-OFF, COMPARISON-TRAPPED,
and DEFENDED. For each: how the principal recognizes the pattern in a
single conversation, the triggers that escalate it, the engagement
moves that work, and specific language pairs (the trap phrase next to
the better phrase). Synthesized from Madeline Levine, Carol Dweck, and
Wendy Mogel.

**05 · cultural-communication.md** — Erin Meyer's Culture Map applied
to the parent populations most common in international Montessori
settings. Eight dimensions: communicating, evaluating, persuading,
leading, deciding, trusting, disagreeing, scheduling. Practical guidance:
when "we'll think about it" means no, when it means yes, the Confucian
authority frame with Chinese families, how to deliver hard observations
indirectly without losing precision, when directness reads as respect vs
when it reads as attack.

**06 · montessori-parent-anxieties.md** — The recurring parent anxieties
unique to Montessori schools. "Is this rigorous enough?" "Why does my
child play all day?" "What about academics?" "How will my child cope in
conventional kindergarten / primary?" For each anxiety: the developmental
truth the parent is missing, the specific language that bridges, the
common trap to avoid. Make the invisible visible without becoming a
lecture.

**07 · de-escalation-toolkit.md** — Motivational Interviewing's OARS
(Open Questions, Affirmations, Reflections, Summaries). The 3-second
pause. Validation loops. When to stop talking. Specific phrase pairs that
de-escalate vs phrases that escalate. The "what would help right now?"
reset. For meetings where the parent arrives already activated and the
first 90 seconds determine whether the next 30 minutes are productive.

## When Tracy consults each file

Most parent meetings touch more than one of these files. The
`prepare_parent_meeting` tool injects the FULL bundle into the dossier
Sonnet's system prompt so the synthesis can draw from any of them. For
chat-mode questions, Tracy has the SUMMARY in her system prompt every
turn — that's enough for most replies. When a chat question needs depth
beyond the summary (the principal wants to think through a difficult
parent in plain prose, not a dossier), Tracy calls
`consult_tracy_knowledge` with the relevant topic to pull the full file.

## The rule

The frameworks here are the THINKING behind the dossier. They are NEVER
the dossier itself. The principal opens her brief in the hallway before
the meeting; she has 15 seconds. What she reads must be specific,
warm, actionable, and grounded in her child's actual record — not in
Rosenberg's grammar. Frameworks live in Tracy's head. Specifics live in
the brief.
