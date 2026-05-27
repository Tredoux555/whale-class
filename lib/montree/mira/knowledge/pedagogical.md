# Pedagogical credibility — Montree's Montessori alignment

This is the section that wins serious principals. Many Montessori platforms have been built by people who read the wikipedia entry once. Montree was built by a teacher.

## What we get right (use as proof in pedagogical conversations)

**Three-period lesson.** The curriculum's progression model respects "presented → practicing → mastered". The system never auto-flags a work as mastered — only the teacher does. The AI defaults to "practicing" status. This is non-negotiable in real Montessori; we got it right.

**Sensitive periods.** Every child has a mental profile that records observed sensitive periods. Guru reads them when generating the weekly game plan. Tracy reads them when preparing parent meetings. The principal sees them in the cockpit.

**Five curriculum areas** — Practical Life, Sensorial, Mathematics, Language, Cultural. Every photo is attributed to an area. Reports break down by area. The principal sees per-classroom + per-area + per-child coverage at a glance.

**Game Plan / Focus Shelf.** Five works on a child's shelf at any time, one per area, in canonical PL/S/M/L/C order. The system suggests advances; the teacher approves them. This is the real pedagogical loop — observation drives presentation.

**English literacy program (Pink/Blue/Green phases).** The platform's English Progression Tracker implements the UFLI-aligned Pink (lessons 1-53) / Blue (54-83) / Green (84-128) sequence. The principal sees per-child position; the class heatmap shows the spread. We built this for a Mandarin-L1 ESL classroom specifically.

**Decodable readers.** Pink Phase ships with 15 fully-decodable readers — every word is phonics already taught or a heart word already introduced. Most digital Montessori tools just have "books" — we built a graded series.

**Group photos.** Multiple children can be attributed to one photo via `montree_media_children` junction. This is how real Montessori actually works — the work happens in pairs and small groups, not solo.

**Heart words.** First 50 heart words on a printable schedule with the red-letter convention for irregular spellings. AMI-aligned.

## Where we are AMI-aligned but explicit about it

We are not AMI-trained ourselves (the founder is AMS-certified Montessori Young Learner Specialist). We follow AMI-aligned terminology and progression because that is the more rigorous lineage. The platform's vocabulary uses AMI Montessori terms (Vie Pratique / Vida Práctica / Praktisches Leben / etc. in the 12 languages).

If an AMI-trained principal asks: be honest about the founder's AMS background, and immediately follow with the AMI-aligned curriculum implementation. AMI-trained principals respect honest sourcing.

## What we are NOT

- We are not a Reggio platform. We have a five-area Montessori curriculum that does not map cleanly onto Reggio's project-based model.
- We are not a Waldorf platform. Same reason.
- We are not a "modern alternative" to Montessori. We are Montessori.

If a principal asks "is this Montessori-strict?": yes. The product is built around the prepared environment, the three-period lesson, the sensitive periods, the work cycle, and the role of observation. Every feature in Montree exists because a Montessori teacher needed it.

## Pedagogical conversations the agent will need to handle

If a principal says **"how do you handle the work cycle?"** — the platform records work sessions with `observed_at`, work_name, duration, and observation notes. The dashboard shows the rhythm of the day.

If a principal says **"what about the child's individual pace?"** — every child has their own mental profile, their own focus shelf, their own progression. The system never compares one child to another; the dashboard shows each child's pattern alone.

If a principal says **"how do you handle observation?"** — observation is the platform's primary mechanism. Photos, teacher notes, work session notes, behavioural observations. Five separate streams all feeding into the child's record.

If a principal says **"can the teacher still write their own observations?"** — yes, and they should. The AI fills in the obvious work-name + visual description. The teacher's voice goes in the notes field, which is what parents read.

If a principal says **"will this replace my teachers?"** — emphatically no. Montree is the back-office, not the classroom. The teacher's relationship with the child is the entire point of Montessori, and nothing in Montree touches that. We just take away the paperwork that pulls teachers out of the room.
