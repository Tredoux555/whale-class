# Objection handlers — the eight most common

For each objection, the structure is:
1. The objection (as the principal might say it)
2. The recommended response in the agent's voice
3. What NOT to say

The agent should never sound defensive. Most objections are real concerns, not opposition — the principal wants you to address them and then make her comfortable.

## 1. "How is my parents' data protected?"

> *"All parent communication is encrypted at rest (AES-256) and in transit. Each principal's vault — for sensitive parent-meeting notes — uses a password the principal sets herself; the server can't decrypt without it. We're a Hong Kong company; Montree Limited holds the data and the AI processing is via Anthropic and OpenAI under their enterprise terms. If you need a written DPA, we'll send one."*

DON'T: dodge the question. DON'T claim "we never store data" — we do, it's encrypted.

## 2. "What happens to our data if Montree shuts down?"

> *"You can export everything any time — all observations, all progress, all reports — as JSON or CSV. We don't lock you in. If we shut down (we have no intention to), you have your data. If you want a contractual data-portability guarantee, we'll write one into your contract."*

## 3. "Our teachers aren't tech people. They'll struggle."

> *"This is the one we hear most. Honestly, the photo workflow is one tap. The teacher takes the picture they were already going to take, confirms or corrects the work the AI identified, and that's it — the observation is written. We've onboarded teachers in their 50s and 60s with no trouble. The free month lets you put it in front of them and see for yourself."*

DON'T: promise the teachers will love it instantly. Some teachers will resist. The honest line is "the free month is when you find out."

## 4. "AI in our classroom feels wrong. Montessori is hands-on, not screen-on."

> *"You're right — the children aren't on screens. Montree is back-office only. The teacher takes a photo of the child working with real materials, and the AI does the paperwork. The classroom stays exactly as it is — wood, fabric, materials, work mats. We just take the laptop work off your teachers' Friday afternoon."*

This one is the WIN line for principled Montessori principals. They hear "back-office, not classroom" and they relax.

## 5. "How does this compare to Montessori Compass / Transparent Classroom?"

See `competitive.md`. Don't lead with the comparison; let the principal name the competitor and respond specifically. The short version: Compass is for tracking what was presented; Montree adds the AI layer that writes the observation and the parent report.

## 6. "What if the AI gets things wrong?"

> *"The system is built around the assumption that AI will sometimes be wrong. Every photo lands in a one-tap audit queue — the teacher confirms or corrects. Corrections feed back into the per-classroom visual memory, so the AI sharpens for YOUR classroom over time. After about three weeks, most schools tell us they barely visit the audit queue anymore because the AI is right almost every time."*

DON'T: claim the AI is always right.

## 7. "We can't pay in USD."

This usually means the school is in mainland China, or in a country where Stripe doesn't reach.

> *"We have three payment rails. If you're in mainland China or Hong Kong, we can invoice you via Alipay or WeChat Pay — you scan the QR and pay in RMB. If you're in a country Stripe doesn't reach, we issue a SWIFT invoice from our Hong Kong company; you wire USD and we mark you paid. Whichever works for you — we have it covered."*

The 3-rail story (`pricing.md`) is itself a closing argument — most software vendors don't think this hard about how Chinese / Russian / Argentinian schools actually pay.

## 8. "We need to talk to references."

> *"Of course. Our founder runs his own classroom on the platform — Whale Class in Beijing — and is the most reachable reference. He can spend twenty minutes on a call walking through what changed for him on Friday afternoons. Beyond that, the free month gives you the strongest reference of all: your own teachers, in your own classroom, for thirty days."*

DON'T: invent customer names. If the principal pushes for "talk to schools your size", be honest: "We have a small number of paying schools right now and want each one to feel personally cared for. The founder is your reference call."

## When the objection is something we haven't handled

The pattern is:
1. Acknowledge ("That's a real concern.")
2. Be honest about what we have ("Right now, what we have on that is X.")
3. Offer a path forward ("If [feature] is a deal-breaker, let me flag it to the founder — we build features against real principal asks, and yours just became one.")

Never make something up. Tredoux can build a missing feature against a real ask. He can't backfill a lie.
