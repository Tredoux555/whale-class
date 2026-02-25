// lib/montree/guru/faq-cache.ts
// Pre-written FAQ answers for common parent questions
// Zero API calls — instant answers for new parents

export interface FAQEntry {
  id: string;
  question: string;
  answer: string; // markdown
  relatedConcerns: string[]; // concern IDs from concern-mappings.ts
  ageRanges: string[]; // e.g. ['2-3', '3-4', '4-5', '5-6']
}

export const FAQ_ENTRIES: FAQEntry[] = [
  {
    id: 'faq-reading',
    question: 'When should my child start reading?',
    answer: `Most Montessori children begin reading between ages 4 and 5, but the range is wide and completely normal. Before reading comes a long preparation period that you might not even notice:

**Ages 2.5–3.5:** Sandpaper letters, sound games ("I spy something that starts with mmm"), spoken vocabulary explosion.

**Ages 3.5–4.5:** Moveable alphabet (spelling words with loose letters before writing them), rhyming games, beginning to recognise written words in the environment.

**Ages 4.5–5.5:** The "explosion into reading" — often happens suddenly after months of quiet preparation.

**What you can do at home:** Read aloud daily, play sound games during car rides, label objects around the house with index cards. The key is never to pressure — when the preparation is complete, reading emerges naturally.

If your child is 5.5+ and showing no interest in letters or sounds, it's worth a chat with a reading specialist — not because something is wrong, but because early support makes everything easier.`,
    relatedConcerns: ['speech-language', 'school-readiness'],
    ageRanges: ['3-4', '4-5', '5-6'],
  },
  {
    id: 'faq-activity-duration',
    question: 'How long should activities last?',
    answer: `There's no single "right" duration — it depends on the child's age and developmental stage:

**Ages 2.5–3:** 3–10 minutes per activity is completely normal. They're still building the capacity for concentration.

**Ages 3–4:** 10–20 minutes. You'll start seeing longer stretches with favourite works.

**Ages 4–6:** 20–45+ minutes. Some children will work for an hour on something that truly captivates them.

**The golden rule:** Never interrupt a concentrating child. Even if it's been "only" 5 minutes, that might be the deepest focus they've ever achieved. Interrupting concentration is one of the biggest mistakes adults make.

**What counts as an activity:** Pouring water back and forth for 15 minutes IS an activity. Sorting socks IS an activity. It doesn't need to look "educational" to be valuable.

**If your child flits between activities:** This is normal for younger children. Offer fewer choices (3–4 works on a tray) rather than an overwhelming shelf. Concentration develops through practice.`,
    relatedConcerns: ['focus-attention', 'daily-routine'],
    ageRanges: ['2-3', '3-4', '4-5', '5-6'],
  },
  {
    id: 'faq-sitting-still',
    question: "My child won't sit still — is that normal?",
    answer: `Yes, completely normal — and in Montessori, we don't ask young children to sit still. Movement is not the enemy of learning; it's the vehicle for it.

**The science:** Young children's brains develop through movement. The cerebellum (movement centre) and prefrontal cortex (thinking centre) are deeply connected. Sitting still actually makes learning harder for most children under 6.

**What Montessori does differently:** Instead of making children sit at desks, we give them work that involves their whole body — carrying heavy objects (Practical Life), walking on a line, scrubbing a table, pouring, sweeping. These "big work" activities satisfy the need for movement AND build concentration.

**At home, try:**
- A pouring station on a low table (two small jugs, dried rice, a tray to catch spills)
- Sweeping with a child-sized broom
- Carrying groceries inside (even just one item at a time)
- Walking on tape lines on the floor while carrying a bell without ringing it

**When to pay attention:** If your child literally cannot stop moving even during activities they love, or if movement seems involuntary rather than purposeful, mention it to your paediatrician. But a child who "won't sit still" during a boring task? That's just being a child.`,
    relatedConcerns: ['focus-attention', 'sensory-needs'],
    ageRanges: ['2-3', '3-4', '4-5'],
  },
  {
    id: 'faq-home-setup',
    question: 'How do I set up a Montessori space at home?',
    answer: `You don't need a dedicated room or expensive materials. Here's what matters:

**The essentials (any room):**
- A low shelf (bookshelf turned sideways works) with 4–8 activities, rotated weekly
- A child-sized table and chair OR a floor mat/rug for working on
- Activities in trays or baskets so they're self-contained and inviting
- Everything at the child's height — they should be able to choose and return work independently

**Kitchen (the best Montessori classroom):**
- A learning tower or sturdy step stool
- Child-safe utensils: butter knife, small cutting board, small pitcher
- A low drawer or shelf with their own plates, cups, and snacks they can access

**Bathroom:**
- Step stool at the sink
- Their own low towel hook
- A small mirror at their height

**What to REMOVE:** Toy boxes where everything gets dumped together. Visual clutter. Anything with batteries that "does the work for them."

**Budget-friendly materials:** Paint swatches for colour matching, dried beans for pouring/sorting, clothespins for fine motor, spray bottle and cloth for window washing (they love this), tongs and pompoms for transfer work.

**The #1 rule:** Less is more. 6 beautiful, well-organised activities beat 60 toys in a pile.`,
    relatedConcerns: ['daily-routine', 'independence'],
    ageRanges: ['2-3', '3-4', '4-5', '5-6'],
  },
  {
    id: 'faq-correct-mistakes',
    question: 'Should I correct my child\'s mistakes?',
    answer: `This is one of the hardest parts of Montessori parenting — and the answer is usually **no**.

**The Montessori principle:** Materials are designed with a "control of error" — the child can see the mistake themselves. The Pink Tower block that doesn't fit, the water that spills when poured too fast, the puzzle piece that won't go in backwards. These are self-correcting.

**Why not to correct:**
- It teaches them to depend on adult approval rather than their own judgement
- It interrupts concentration (the most valuable thing happening)
- It can make them afraid to try new things
- They often know they made a mistake but are working through it

**When you CAN step in:**
- Safety issues (always)
- If they're about to damage materials or the environment
- If they ask for help explicitly
- If frustration has tipped into genuine distress (not just mild frustration — mild frustration is productive)

**What to do instead of correcting:**
- Model the correct way in your own work: "Watch — I'm going to pour very slowly"
- Offer the activity again later with a fresh presentation
- Ask: "Would you like me to show you?" and respect "no" as an answer
- Narrate without judging: "The water went over the edge of the cup"

**The hardest truth:** Your child's "mistake" might actually be experimentation. A child pouring water onto the table isn't failing — they're discovering what happens when water meets a flat surface. Learning IS messy.`,
    relatedConcerns: ['independence', 'emotional-regulation'],
    ageRanges: ['2-3', '3-4', '4-5', '5-6'],
  },
  {
    id: 'faq-activities-per-day',
    question: 'How many activities should we do per day?',
    answer: `**The short answer:** 2–4 focused activities is plenty. Quality over quantity, always.

**A realistic home Montessori day:**
- **Morning:** 1–2 structured activities (your prepared materials on the shelf)
- **Midday:** Practical Life built into real routines (helping prepare lunch, setting the table, sweeping)
- **Afternoon:** 1 activity or free choice from the shelf, plus outdoor time

**What counts as an "activity":** Everything. Washing hands independently. Buttoning a jacket. Peeling a banana. These are ALL Montessori works. You don't need to sit down at a table for it to "count."

**Signs you're doing too much:**
- Your child resists or says "no" to activities
- You feel stressed about fitting everything in
- Activities are rushed rather than peaceful
- Your child seems overwhelmed by choices

**Signs you're doing the right amount:**
- Your child chooses activities voluntarily
- There's calm, focused time each day (even 10 minutes)
- Practical Life is naturally woven into your day
- YOU feel relaxed about the routine

**Permission to relax:** Some of the best Montessori days involve one activity done deeply for 30 minutes, then playing outside. A child who spent the morning transferring beans between bowls with a spoon has done more for their development than a child who rushed through 8 worksheets.`,
    relatedConcerns: ['daily-routine', 'focus-attention'],
    ageRanges: ['2-3', '3-4', '4-5', '5-6'],
  },
  {
    id: 'faq-repeating',
    question: 'My child keeps repeating the same activity over and over',
    answer: `This is one of the BEST signs in Montessori — your child is doing exactly what they should be doing.

**Why repetition matters:** Maria Montessori called this "the repetition of the exercise." When a child repeats an activity over and over, they are:
- Building concentration (the single most important skill)
- Perfecting their movements and coordination
- Experiencing the deep satisfaction of mastery
- Following an inner developmental drive

**What's happening in the brain:** Repetition builds and strengthens neural pathways. Each repetition isn't "the same" to your child — they're refining micro-movements, noticing new details, and deepening their understanding.

**Famous example:** Montessori observed a 3-year-old who did the cylinder blocks 42 times in a row. She tried distracting the child — moving the chair, having other children sing. Nothing broke the concentration. When the child finally stopped, she looked up "as if waking from a dream" and smiled. That moment of deep concentration is what Montessori education is built on.

**What to do:** Nothing. Don't interrupt, don't suggest they "try something new," don't worry they're "stuck." When they've gotten everything they need from that activity, they'll move on naturally.

**When to gently offer variety:** Only if the same activity is the ONLY thing they'll do for 2+ weeks AND they seem bored rather than focused. Then, place a related but slightly more challenging work next to it on the shelf.`,
    relatedConcerns: ['focus-attention', 'independence'],
    ageRanges: ['2-3', '3-4', '4-5', '5-6'],
  },
  {
    id: 'faq-introduce-new',
    question: 'When should I introduce new works?',
    answer: `**The general rhythm:** Introduce 1–2 new works per week at most. Montessori is about depth, not breadth.

**Signs a child is ready for something new:**
- They complete the current work easily, without concentration or interest
- They start using the material in unintended ways (not exploration — more like boredom)
- They haven't chosen that work in over a week
- They explicitly ask for "something new" or "something harder"

**Signs they are NOT ready:**
- They're still deeply engaged with current works (even if they've been at it for weeks)
- They're still making mistakes and self-correcting
- The current work still produces that focused, calm concentration

**How to introduce a new work (the Montessori presentation):**
1. Choose a time when your child is calm and receptive
2. Say: "I have something new to show you. Would you like to see?"
3. Bring it to the table/mat slowly and deliberately
4. Demonstrate silently (or with minimal words) — your hands tell the story
5. Do it once, slowly
6. "Would you like to try?" If no, that's fine — leave it on the shelf
7. Walk away. Don't hover.

**Shelf rotation:** Swap out 2–3 works each week. Remove mastered works, add one new one, keep favourites. Store rotated works in a closet — they'll feel "new" again in a month.

**The curriculum in Montree helps here:** Use the "Recommended" filter to see what's next in the sequence for your child's level.`,
    relatedConcerns: ['daily-routine', 'school-readiness'],
    ageRanges: ['2-3', '3-4', '4-5', '5-6'],
  },
  {
    id: 'faq-behind',
    question: 'Is my child behind?',
    answer: `**The most important thing:** In Montessori, there is no "behind." Each child follows their own developmental timeline, and comparing to other children (or to milestones charts) often causes more harm than good.

**What "normal" actually looks like:**
- Some children read at 4, some at 6. Both are normal.
- Some children master fine motor early, others gross motor. Both are normal.
- Some children talk in sentences at 2, others at 3. Both are normal.
- Development is uneven — a child might be "advanced" in one area and "slower" in another. This is the norm, not the exception.

**What Montessori tracks instead of "ahead/behind":**
- Is the child showing concentration during work? (Even briefly)
- Is the child choosing activities voluntarily?
- Is there progress over time? (Even small, gradual progress)
- Is the child's overall wellbeing good — eating, sleeping, playing, connecting with people?

**When to genuinely seek evaluation:**
- No words by 18 months, or losing words they previously had
- No eye contact or response to their name by 12 months
- Cannot follow simple instructions by age 2.5
- Significant difficulty with balance, coordination, or self-care beyond what's age-appropriate
- Regression — losing skills they previously had

**If you're worried:** Trust your instinct. A developmental screening is quick, free (in many areas), and gives you either reassurance or early access to support. Early intervention (before age 3) has the strongest evidence base. Asking for a screening is not overreacting — it's good parenting.

**What Montree shows you:** Your child's progress page tracks mastered, practicing, and presented works. Look at the trend over months, not days. Progress is almost never linear.`,
    relatedConcerns: ['school-readiness', 'speech-language'],
    ageRanges: ['2-3', '3-4', '4-5', '5-6'],
  },
  {
    id: 'faq-screen-time',
    question: 'How do I handle screen time?',
    answer: `**The Montessori perspective:** Screens are passive — the child watches, taps, and receives. Montessori is active — the child touches, manipulates, creates, and discovers. They're fundamentally different experiences for the developing brain.

**Practical guidelines by age:**
- **Under 2:** Avoid screens entirely (WHO and AAP recommendation). Video calls with family are fine.
- **Ages 2–3:** If any, limit to 30 minutes of high-quality content (nature documentaries, gentle music). Co-watch and talk about what you see.
- **Ages 3–5:** Up to 1 hour total, with breaks. Choose interactive over passive content.
- **Ages 5–6:** 1 hour, with increasing independence but still with boundaries.

**What works better than "banning" screens:**
- Make the alternative more interesting. A well-prepared shelf with inviting activities naturally reduces screen demand.
- Create clear, predictable boundaries: "Screens are for after dinner" (not "no screens ever," which creates obsession).
- Involve your child in real work — cooking, gardening, cleaning. These are more satisfying than screens for most young children.
- Model what you want. If you're always on your phone, they'll want to be too.

**The honest truth:** Most Montessori families use some screens. Don't beat yourself up. The goal isn't perfection — it's making sure screens don't replace hands-on exploration, outdoor time, and human connection.

**One powerful swap:** Replace 30 minutes of screen time with 30 minutes of Practical Life (cooking together, folding laundry, watering plants). Your child gets the same "downtime" feeling but with developmental benefits.`,
    relatedConcerns: ['focus-attention', 'daily-routine'],
    ageRanges: ['2-3', '3-4', '4-5', '5-6'],
  },
];
