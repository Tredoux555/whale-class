# Montree Milestones

## A developmental check-in for Montessori classrooms, ages 3–7

**Methodology & Framework**

Version 1.2 · Item bank 1.11.0 · August 2026

*Version 1.2 adds Montree Canopy, the Grade-1 tier (band `G1`, ages 6–7). See Section 5.5 and the changelog at the end of this document.*

Prepared for school directors, funder program officers, and evaluators.

<!--PB-->

# Executive summary

Montree Milestones is a developmental check-in for Montessori classrooms serving children aged three to seven — three kindergarten bands, plus **Montree Canopy**, a second tier for children of about six to seven who have outgrown them. It exists to close one specific gap: **Montessori schools keep excellent records of what a child has done, and almost no way to say what that means to somebody outside Montessori.** A funder's program officer, a first-time parent from a mainstream school background, an education-bureau inspector — all three routinely ask a version of the same question, and the honest Montessori answer ("she has completed the Pink Tower, the Brown Stair, and is on the Sandpaper Letters") does not answer it.

The system translates. It does not test.

**What it is.** Three times a school year — Autumn, Winter, Spring — a teacher sits one-on-one with each child for up to fifteen minutes and plays a set of short games on a tablet or with printed cards. Alongside that, the teacher rates a structured observation checklist from what she has already seen in the normal work cycle. Together these produce a band — *Emerging*, *Developing*, or *Secure* — on each of 56 age-appropriate developmental milestones. Canopy works exactly the same way, with its own 56.

**What is behind it.** 230 original milestone statements across four age bands and six domains, half checked by direct sitting and half by teacher observation; 568 item records; 348 stimulus records; two parallel forms, on tablet and on paper; a validated, checksummed single source of truth. Milestone wording is our own. The three kindergarten bands are *anchored* to the US Head Start Early Learning Outcomes Framework for domain structure, written in the plain-language register of the UK EYFS Development Matters guidance, and cross-referenced by code to the PRC Ministry of Education's 3–6 Guide for the China market; Montree Canopy sits above all three of those frameworks and is anchored instead to the US Common Core Grade 1 standards and the UK National Curriculum Year 1 programmes of study (Section 5.5). We cite IDELA and the OECD's IELS as evidence that the domains we track are the domains the donor and policy communities themselves measure — as citations of domain validity, nothing more.

**What comes out.** Two documents. A **Growth Story** for the family, which leads with the child's own movement since the last check-in and only then gives comparative context. A **Cohort Milestone Report** for a funder or a board, which reports the same evidence at group level with the sample size, the unassessed count, and the caveats printed on the page.

**The comparative figure.** One number does the translating: the **Milestone Attainment Profile (MAP%)** — the share of the milestones typically expected at a child's age, and actually assessed at this check-in, on which the child is *Secure*. It is rounded to the nearest five, never shown without its denominator, and suppressed entirely below twelve assessed milestones.

**What we will not claim.** Montree Milestones is criterion-referenced, not norm-referenced. It produces no percentile, no rank, no "months ahead," and no causal claim about any programme. Forms A and B are matched by construct specification, not by empirical calibration — we have no calibration sample and say so wherever the number appears. Section 13 states the limitations in full, and Section 9 gives the verbatim say/never-say language that governs every funder-facing sentence we write.

**Why anyone should trust the underlying pedagogy.** The independent evidence base for Montessori is genuinely strong and genuinely conditional: a 2023 Campbell systematic review of 32 studies found roughly 0.25 SD on academic and 0.33 SD on non-academic outcomes, with effects clearly stronger in high-fidelity implementations; a 2025 national randomized controlled trial reported in *PNAS* found intention-to-treat effects exceeding 0.20 SD by the end of kindergarten at approximately US$13,000 lower cost per child. A French RCT with disadvantaged preschoolers found a large reading effect (d = 0.68) and no advantage at all in mathematics, executive function, or social skills. We print that last sentence in funder materials, because a body of evidence that only ever agrees with us is not a body of evidence.

<!--PB-->

# 1. What this is, in one page

Montree Milestones is a **developmental check-in**, not a test.

**Three times a year.** Autumn, Winter and Spring windows, matching the way most schools already think about a term and matching the three-window benchmark cadence used across mainstream early-childhood progress monitoring.

**Fifteen minutes, maximum.** A sitting is at most three short modules of five minutes each. It can be broken across several days inside the same window. A teacher may stop at any point, and a partial sitting is valid data — it is recorded as partial, not discarded and not counted against the child.

**One adult, one child, a quiet corner.** Never a group, never the open work floor, never a timed room of children with papers in front of them. The format deliberately imitates the three-period lesson that Montessori teachers already give a hundred times a term: the adult sits beside the child, offers something, and watches.

**The child plays.** A friendly narrator speaks every instruction aloud — nothing requires reading. The child taps a picture, follows a spoken instruction, or answers a question out loud. There is no timer on screen, no score, no badge, no star, no streak, no leaderboard, and no right/wrong noise. Every child, whatever happened in the sitting, reaches the same warm closing screen.

**The teacher observes.** Roughly half of everything we report is never asked of the child at all. Practical life, gross and fine motor control, social behaviour, emotional expression, persistence, emergent writing — these are rated by the teacher against written descriptors, from what she has actually seen during the term's work cycles. A tablet cannot watch a child pour water without spilling it, wait for a turn, or comfort a friend, and we do not pretend otherwise.

**The teacher has the last word.** Any band the system computes can be overridden by the teacher with a stated reason. The override is stored, reported and counted — never hidden. The system augments the teacher's judgement; it does not overrule it.

**Nothing here is called a test.** The words *test, exam, quiz, score, grade, mark, pass, fail, wrong, percentile, rank, above average, below average* and *behind* do not appear in any string a child, parent or teacher sees. This is enforced mechanically by a forbidden-term list checked against the item bank, not left to good intentions.

There is exactly one deliberate exception: the *"what this number is not"* disclosure in Section 8.4, which is reproduced in the Growth Story. There those words appear only inside an explicit negation, because naming precisely what the figure is not is the entire purpose of that box. It is reviewed by hand rather than by the lint, and it is the only place the exception is permitted.

> **In the child's world it is called "Discovery Time."** In the teacher's world it is a check-in. In the funder's world it is a criterion-referenced developmental milestone assessment with an observational component. All three descriptions are true at once, and that is the entire design problem this document solves.


# 2. Why we built it

## 2.1 The gap

Every serious Montessori record-keeping product tracks progress *inside* the Montessori scope and sequence: which materials were presented, which were practised, which were mastered. Transparent Classroom, Montessori Records Express, Montessori Workspace and Montessori Compass all do this well. Montessori Compass goes furthest, mapping the Montessori sequence onto regional standards and US Common Core — but that is **curriculum-coverage** mapping, answering "does our curriculum cover what the state expects to be taught?"

None of them answers the other question: **"what does this individual child's Montessori progress mean, expressed in the developmental language everybody else uses?"**

That translation layer is genuinely unfilled space. It is also the exact thing a Montessori school is asked for whenever money or accountability is involved.

## 2.2 Why it matters to a nonprofit Montessori programme

A foundation officer funding early-childhood work has a portfolio. In that portfolio are programmes reporting against IDELA domain scores, against Head Start ELOF indicators, against national school-readiness measures. When a Montessori grantee reports "the children have progressed beautifully through the sequence," it is not that the officer disbelieves it — it is that the sentence cannot be placed next to the other reports on the desk. Three consequences follow, all of them observed rather than hypothetical:

- **Montessori programmes are under-represented in outcome portfolios** relative to the strength of their evidence base, because they are hard to aggregate.
- **Renewal conversations turn on outputs** ("we served 84 children") rather than outcomes, and the impact-measurement literature is explicit that funders increasingly penalise output-only reporting.
- **Equity claims go unmade.** The most fundable finding in the Montessori literature — that Montessori settings substantially narrow the income–achievement gap — is precisely the kind of claim that needs child-level developmental data to be visible at all.

Montree Milestones produces the missing artefact: a Cohort Milestone Report that says, in a program officer's own vocabulary, what happened to a group of children across a year, with the sample size and the unassessed count printed on the page.

## 2.3 Why it matters to a fee-paying school

The commercial version of the same gap is quieter and more expensive. A parent who chose Montessori on a school tour, and whose sister-in-law's child in a mainstream nursery is bringing home worksheets with ticks on them, has one anxiety: *is my child keeping up?* The honest answer is usually "comfortably, and in some areas well ahead" — but a school with no way to show it loses the family at the end of the year, or loses the referral.

A Growth Story does three things a portfolio of photographs cannot:

1. It states the child's own movement since the last check-in, in bands, on named milestones.
2. It gives comparative context in one carefully-bounded sentence, so the parent's real question is answered rather than deflected.
3. It says plainly what the figure is not, which — counter-intuitively — is what makes parents trust the figure.

## 2.4 Why it must not read like a test

Montessori pedagogy is built on continuous observation rather than testing, and the objection is doctrinal, not stylistic. AMI's own guidance is that children under six are essentially never given formal tests and that progress is judged by observation of the child's work. The objections are specific: testing imposes developmentally inappropriate pressure; it is an external summative judgement in a model built on internal, self-paced motivation; the materials already carry their own control of error, so the child self-corrects without an adult grading them; and comparison between children is rejected outright.

This is why the naming rules in this document are load-bearing rather than decorative. **Adoption risk here is a copy risk, not a technical one.** A system that measures well but reads like an exam is rejected by exactly the schools it was built for, and then measures nothing at all.


# 3. The evidence base

We did not invent the claim that Montessori works. We inherited a research literature, and our obligation is to represent it accurately — including where it disagrees with us.

## 3.1 The core findings

**Lillard & Else-Quest (2006), *Science*.** The foundational modern study, using a lottery-loser quasi-experimental design at an oversubscribed public Montessori school: lottery winners (n = 59) compared with losers who went elsewhere (n = 53), which controls much of the self-selection problem. Five-year-old Montessori children outperformed controls on Woodcock-Johnson letter-word identification, word attack and applied problems, on a rule-switching executive-function task, and on social problem-solving. The authors' own conclusion was that Montessori children were "equal or superior" — a calibrated phrase we imitate deliberately.

**Lillard et al. (2017), *Frontiers in Psychology*.** Randomized lottery admission to two public Montessori magnet schools; 141 children; four timepoints over three years from roughly age 3 to 6; baseline equivalence confirmed. Academic growth trajectories were steeper for Montessori children (d = 0.41 by ages 4–5). The headline finding is about **equalisation**: the income–achievement correlation was nearly halved in Montessori (r = .23) versus control (r = .46), and low-income Montessori children closed the gap with higher-income peers from 0.61 SD to 0.21 SD across three years. Honesty note carried forward into all our materials: the executive-function advantage was significant at age 4 and *not* sustained at every timepoint.

**Randolph et al. (2023), *Campbell Systematic Reviews*.** The meta-analytic authority: a pre-registered systematic review admitting only studies with credible baseline group comparability; 32 studies. Academic outcomes averaged approximately **0.25 SD**; non-academic outcomes approximately **0.33 SD**, with executive function and positive school experience the strongest non-academic effects. The review's own most important caveat is the one we repeat everywhere: "Montessori" is not trademarked, implementation varies enormously, and effects were stronger in random-assignment studies and high-fidelity programmes and weaker or inconsistent where pedagogy was compromised.

**A national RCT (2025), *PNAS*.** The most rigorous and most recent citation available: 588 children across 24 public Montessori programmes, randomized at intake, compared with traditional public pre-K. Intention-to-treat effects at end of kindergarten **exceeded 0.20 SD** on reading, executive function, short-term memory and social understanding — large for a field-based school RCT — at approximately **US$13,000 less per child**, largely through higher child:teacher ratios and multi-age peer-supported learning. A crucial nuance for reporting cadence: **benefits were not detectable at PK3 or PK4** and only emerged by the end of kindergarten. Montessori gains appear to compound rather than appear instantly, which is a direct argument against overclaiming visible movement after one check-in window.

**Courtier et al., French public-school RCT (2021).** Directly relevant to underprivileged settings: adapted Montessori public classrooms versus private Montessori versus conventional public classrooms, pre-registered, frequentist and Bayesian. The **only** statistically significant advantage was reading, at **d = 0.68** — very large — and it emerged only by year end. Mathematics, executive function and social skills were **comparable, not superior**. We print this result. A study that found one large effect and three null effects is more persuasive evidence of honest measurement than four convenient effects would be.

## 3.2 What the literature obliges us to build

Three design consequences follow directly:

1. **Track what the literature tracks.** Early literacy (letter–sound, decoding), early numeracy, executive function, social understanding — these are the constructs the RCTs use, which is why funders and researchers recognise them. Our domain set is built on them.
2. **Scope every claim to fidelity.** Because effects are conditional on implementation quality, no claim we make may be phrased as "Montessori classrooms produce X." Section 9 encodes this.
3. **Report trajectory, not cross-section.** Effects that take until end-of-kindergarten to emerge cannot be honestly evidenced by comparing one classroom to a benchmark in one window. Within-child growth is our primary evidence (Section 10), and that is a finding-driven decision, not a convenience.


# 4. The frameworks we anchor to

## 4.1 The anchoring decision

We reviewed seven candidate frameworks and adopted a three-part anchor, decided primarily on licensing.

| Framework | Role in Montree Milestones | Licence | Content reused? |
|---|---|---|---|
| US HHS, Office of Head Start — ELOF | **Domain structure.** Our five core domains are ELOF-shaped; every milestone carries ELOF goal codes. | US public domain | No — codes only |
| UK DfE — EYFS / Development Matters | **Register.** Our milestone statements imitate the short, concrete, observable "can…" style; every milestone carries an EYFS area and band code. | Open Government Licence v3.0 | No — codes only |
| PRC Ministry of Education — 3–6岁儿童学习与发展指南 (2012) | **China crosswalk appendix** and a localized report header for that market. | Freely published; attributed to MoE | No — codes only |
| IDELA (Save the Children) | **Domain-validity citation only.** Evidence that the donor community measures these domains. | Open (MOU) | No |
| OECD IELS | **Domain-validity citation only.** | Not a public instrument | No |
| ASQ-3 (Brookes) | Not used. | Commercial | No |
| Teaching Strategies GOLD | Design reference for the observation-plus-direct pattern. Not a content source. | Proprietary | No |

## 4.2 The rule that governs all of it

> **All milestone wording in Montree Milestones is original.** We attribute the frameworks; we do not reproduce their text. Every milestone carries crosswalk *codes* pointing at ELOF goals, EYFS areas and bands, and China MoE objectives. **A code is a citation, not copied content.**

This matters commercially and legally. The funder story rests on the alignment table being verifiable; it would collapse if the alignment were achieved by copying licensed text. In practice, the item bank contains 41 distinct ELOF goal codes across all seven EYFS areas of learning, and MoE objective codes across 健康 / 语言 / 社会 / 科学 plus the 学习品质 (approaches to learning) commentary.

Forty-eight of the 168 kindergarten milestones deliberately carry **no** MoE code, as do all 56 Montree Canopy milestones (Section 5.5). Thirty-six are the EFL milestones, because the MoE Guide has no foreign-language 领域 (Section 11.4). The other twelve are **LCL-C Phonological awareness** and **LCL-D Print & alphabet knowledge**, which are English-medium strands: the MoE's 语言·阅读与书写准备 objectives describe readiness for *Chinese* literacy, and English rhyme, English letters and English word reading do not speak to them. Claiming that crosswalk would be the exact kind of unverifiable alignment this section exists to prevent. See Section 5.4.

## 4.3 Why IDELA and IELS are cited but not used

Both are strong credibility signals with exactly the audiences that read this document, and neither is a usable content source. IDELA is an open, validated, enumerator-administered protocol built for cross-country donor M&E — excellent evidence that our domain choice is the sector's domain choice, but a 30-minute externally-administered battery is not something we can graft onto a Montessori work cycle. IELS has no public item bank at all, covers only five-year-olds, and carries genuine reputational sensitivity in the early-years research community over "PISA for babies" concerns.

So the permitted sentence is: *"the domains we track are the domains the OECD's own cross-national study of five-year-olds and Save the Children's IDELA both measure."* The forbidden sentence is *"aligned with IELS/IDELA."* Section 9 states this as a rule.

## 4.4 A note on China

The MoE Guide is explicitly framed by the Ministry as observational reference guidance and **not an evaluative standard** (不是评价标准). Our crosswalk is presented as a curriculum reference for local legibility. It is never presented as MoE endorsement, and no Chinese-market material may imply otherwise.


# 5. Domain and strand map

Six domains — five core, one parallel English track. Twenty-eight strands. `D` = checked directly in the sitting; `O` = rated by the teacher from observation.

| Domain | Code | Strands | Plain-English gloss |
|---|---|---|---|
| Approaches to Learning & Self-Regulation | ATL | A Engagement & persistence `O` · B Initiative & choice-making `O` · C Flexible thinking & problem-solving `O` · D Self-regulation & impulse control `O` | How the child works: do they choose, stay, adapt, and wait? |
| Social & Emotional Development | SED | A Relationships with adults `O` · B Peer interaction & cooperation `O` · C Emotional knowledge & expression `O` · D Grace, courtesy & community `O` | How the child is with other people. |
| Language, Communication & Literacy | LCL | A Receptive language & listening `D` · B Expressive language & vocabulary `D` · C Phonological awareness `D` · D Print & alphabet knowledge `D` · E Emergent writing `O` | Understanding, speaking, hearing sounds in words, and the beginnings of reading and writing. |
| Cognition: Mathematics & Exploration | COG | A Number sense & counting `D` · B Quantity, comparison & early operations `D` · C Shape, space & pattern `D` · D Measurement, sorting & classification `D` · E Scientific & world exploration `O` | Number, quantity, shape, sorting, and curiosity about the world. |
| Physical Development & Practical Life | PPL | A Fine motor & hand control `O` · B Gross motor & coordination `O` · C Self-care & independence `O` · D Care of environment & tool use `O` | The hand, the body, and looking after oneself and the room. |
| English (EFL track — reported separately) | EFL | E1 Receptive vocabulary `D` · E2 Listening & instruction-following `D` · E3 Phonological awareness in English `D` · E4 Letter–sound knowledge `D` · E5 Word reading / CVC `D` · E6 Spoken production `D` | English as a foreign language, checked only against what the classroom has actually taught. |

## 5.1 Why observation covers half of it

Practical Life, gross and fine motor, and social-emotional development are **observation-only by design**. A tablet cannot measure pouring, buttoning, or genuine turn-taking. A tablet "empathy" item measures emotion *labelling* — a cognitive proxy — and must not be sold as social behaviour. This is the same split the OECD's own study runs into, and the same conclusion Teaching Strategies GOLD and the EYFS Profile both reached: for these constructs, structured teacher observation over time is the evidence-based method, not a testing event.

The consequence is a bank that is exactly **half direct (84 milestones) and half observational (84 milestones)** — and a report that labels which is which, so a reader always knows whether a statement came from a sitting or from the work cycle.

## 5.2 The optional Focus Games module

`ATL-X Focus Games` is an optional extension: two tap-based executive-function tasks (inhibition, and visuo-spatial working memory), modelled on the Early Years Toolbox designs validated on 1,764 children aged 2.5–5. It exists because executive function is the strongest non-academic signal in the Montessori literature and funders ask about it specifically.

It is **never** part of the fifteen-minute core sitting and **never** required for a complete profile. It is offered because refusing to offer it would be dishonest about what funders want; it is walled off because bolting it into the core sitting would break the time budget and the Montessori-authenticity rules at once.

## 5.3 Age bands

`A3` = 3;0–3;11 · `A4` = 4;0–4;11 · `A5` = 5;0–5;11 · `G1` = **Montree Canopy**, from 6;0 (Section 5.5), computed from age in months at the start of the sitting. Each band carries 56 milestones. A child is checked at their chronological band. If a child answers everything correctly in a strand, an **extension rule** administers up to four items from the band above — that is how "exceeded" is evidenced, rather than by inference from a high figure. Canopy is the top band, so nothing extends above it; an A5 child now extends *into* Canopy, which is what makes "exceeded" reachable at A5 for the first time.


## 5.4 Language of assessment — policy

This is a scope boundary rather than a detail, and it is stated here because it changes what a non-English-medium school can report. It is a **policy**, enforced in code, not an advisory note.

> **The policy, in one sentence.** With the single exception of a construct that *is* English — the EFL track — nothing in this instrument may depend on a child understanding or speaking English, and any strand that cannot honour that under a given language of assessment is not administered at all.

The principle is Head Start's own, in the guidance that accompanies the framework we anchor to: with the exception of assessing a child's English language development, assessment must not depend on the child's ability in English but on the knowledge or skill the assessment actually measures. The second principle is IDELA's adaptation rule — *do not translate literally*: an item has to be rebuilt around the phonology and orthography of the target language, not machine-translated into a carrier sentence around English content.

**LCL-C Phonological awareness** and **LCL-D Print & alphabet knowledge** are checked directly, and their content is English: the rhyme and initial-sound targets are English words, the alphabet is the Roman alphabet in the house SATPIN order, and the A5 word-reading items ask a child to read short English words. Both strands carry `englishMedium: true` in the bank.

In a classroom teaching in English, this is exactly right. In a classroom teaching in Chinese, Spanish or any other language, it is not: administering these items in translation would measure a second language while reporting the result as core literacy, which is the single most misleading thing this system could do.

> **The rule for a non-English-medium school.** Report **LCL-A**, **LCL-B** and **LCL-E** for the core language domain, and leave **LCL-C** and **LCL-D** *unassessed*. Unassessed milestones are excluded from every denominator and printed in every report, so the profile stays honest and visibly incomplete rather than quietly wrong.
>
> The child's English letters and sounds are then measured where they belong — in the **EFL track** (E3 Phonological awareness in English, E4 Letter–sound knowledge, E5 Word reading), reported separately and never merged into the core figure.

**This is enforced, not advised.** Under an assessment locale that is not English, the two strands are never scheduled: they are left out of the bank slice the tablet is handed, so the device is never given content it must not administer, and their milestones are reported `unassessed` with the reason code `locale_not_supported` — the same first-class "unassessed, always with its denominator" mechanism used for MAP% suppression. A teacher cannot administer them by accident, and a report cannot silently count them. The flag lives in the data (`englishMedium: true` on both strand records), so the rule and the content can never drift apart.

The same rule applies unchanged at Montree Canopy, whose LCL-C and LCL-D content is likewise English by construction.

The arithmetic consequence is small but must be disclosed. Leaving both strands unassessed removes 2 expected milestones at A3, 4 at A4 and 3 at A5 from the core denominator — so a non-English-medium A4 profile has 40 expected milestones available rather than 44. All three bands remain comfortably above the n = 12 suppression threshold, so core MAP% is still produced; it is simply computed on a slightly smaller and clearly-stated base.

The same boundary is why these twelve milestones carry no China MoE crosswalk code (Section 4.2 and Appendix C).

## 5.5 Montree Canopy — the Grade-1 tier

### What it is

**Montree Canopy is band `G1`: a second tier of this same instrument for children of about six to seven.** It is not a second instrument and not a different methodology. Same six domains, same 28 strands, same half-direct / half-observed split, same three bands, same coverage and suppression rules, same two reports. A child who ages out of `A5` moves into Canopy and their growth record continues without a seam.

It exists because schools that adopted the kindergarten check-in ran out of instrument at exactly the point their evidence was becoming most useful: the second year of growth data is the year the reporting gets good (Section 15.2), and until now a six-year-old had nowhere to be measured.

**Entry.** Chronological age from 6;0 (72 months) places a child at `G1`. A younger child is never moved up to make a profile look better; they are extended into it item by item under the ordinary extension rule when they get a whole strand right. In practice the schools that will use Canopy are those whose A5 children are routinely *exceeded* — one or more secure extension milestones, or secure on the large majority of their expected `A5` milestones. **The teacher's judgement is final**, and a school may keep a six-year-old at `A5` for a window if that is the honest fit; the band is recorded on the session either way, so the record always says which instrument produced the figure.

**Gating.** Canopy is behind its own feature flag (`child_evaluation_g1`). A school that runs kindergarten only never sees a Canopy sitting, a Canopy bank slice, or a Canopy import.

### What it measures

The 56 Canopy milestones are 28 direct-tested and 28 teacher-observed, and they move the content up rather than sideways:

- **Language & literacy** — decoding words that use a two-letter sound or a vowel team, including invented words a child cannot have memorised; reading a short sentence aloud and showing they understood it; saying every sound in a spoken word; hearing a long vowel against a short one; answering a question about a passage read aloud that has to be worked out rather than recalled; writing a sentence with a capital, spaces and a full stop, and then a short piece of several sentences.
- **Cognition & mathematics** — counting on past a hundred and in tens and fives; what each digit of a two-digit number stands for; adding and taking away within twenty; an everyday problem that needs one of those; solid shapes and one defining property; halves and quarters, and noticing when parts are *not* equal; telling the time to the hour and half past; comparing three things by length or height.
- **Approaches to learning, social-emotional, physical & practical life** — all observation, as at every other band and for the same reason (Section 5.1): picking up work begun on another day; checking one's own work; settling a disagreement in words; sustaining a classroom job across a whole week; forming letters and numerals correctly; managing one's own belongings.
- **The English track** carries on as a separate track: a three-part spoken instruction, the middle sound in a word, two-letter sounds, reading a short English sentence, and asking a question rather than only answering one.

### What it is anchored to

The kindergarten bands anchor to ELOF, EYFS and the China MoE 3–6 Guide. **All three of those frameworks stop below Canopy** — ELOF is birth-to-five, EYFS ends with Reception, and the MoE Guide is explicitly 3–6岁. Carrying a preschool goal code on a Grade-1 milestone would be an invented citation, which is the one thing our crosswalk rule (Section 4.2) exists to prevent. So at `G1` those three fields are carried as **explicit empties**, and the citation weight moves to two frameworks that do cover this age:

- **US Common Core State Standards, Grade 1** (`crosswalk.ccss`) — the reading-foundations, language, writing, speaking-and-listening and mathematics standards, cited by code exactly as ELOF codes are cited at the kindergarten bands.
- **UK National Curriculum, Year 1 / Key Stage 1** (`crosswalk.ukNc`) — the English and mathematics programmes of study, plus the Year 1 phonics check as the design precedent for the invented-word decoding item.

Common Core has nothing to say about approaches to learning, social-emotional development or practical life, so on those strands `ccss` is legitimately empty and a third field, `crosswalk.otherAnchor`, names the non-statutory framework the milestone is written against — CASEL, NAEYC, the PSHE Association Key Stage 1 programme of study, or the Montessori tradition itself. Naming it is the point: an empty cell would read as a gap where there is in fact a source.

**The claims discipline is unchanged.** These are citations, not reproduced text, and not endorsement. Canopy is still criterion-referenced: no percentile, no rank, no "months ahead", no year-group equivalence. The English track claims **no CEFR, Cambridge or Trinity level** at this band any more than it does at the others (Section 11.4) — the *task shapes* follow ordinary primary-English practice, and that is all that is being said.

### What it does not change

Nothing about `A3`, `A4` or `A5`. Their milestone statements, items, thresholds and denominators are untouched. The one visible change at `A5` is an addition: six `A5` milestones now carry `extension` status with their evidence sitting in `G1`, so an A5 child who is already reading vowel teams or counting past a hundred can finally register as having exceeded the band instead of simply topping out.

# 6. How a check-in runs

## 6.1 The administration rules

| Parameter | Rule |
|---|---|
| Mode | One-on-one, teacher-administered; the adult sits with the child |
| Setting | A quiet space — never the open work floor |
| Module length | ≤ 5 minutes including practice |
| Sitting length | ≤ 15 minutes (up to three modules) |
| Full profile | May be built across several days inside one window |
| Practice | Two unscored practice items per module; feedback is allowed **here only** |
| Feedback in scored items | Neutral acknowledgement only — a soft tone and a gentle highlight; never right or wrong |
| Close | The same positive closing screen for every child, regardless of what happened |
| Rewards | No badges, stars, points, streaks, leaderboards, or accumulating economy of any kind |
| Narration | A consistent guide character; audio for every instruction; no reading required |
| Windows | Three per school year: Autumn, Winter, Spring |
| Interruption | The teacher may pause or end at any time; partial sittings are valid data |

Child-facing prompts are spoken in the school's **assessment language**, normally the language of instruction. EFL items are always spoken in English — that is the construct being checked, not an oversight.

## 6.2 What the child experiences

The child is invited, not summoned. They sit beside the teacher with a tablet — or a small stack of printed cards, which is equivalent — and a friendly narrator says hello. Two practice items follow, where getting it wrong produces a warm "let's try that one together" and a second look. Then the games begin: *tap the picture where the child is sleeping*; *which one starts with the same sound as sun?*; *touch the ball, then the box*; *tell me about this picture*.

There is no visible timer and no visible progress bar. Response latency is recorded silently for quality telemetry and never shown to anybody in the room. There is no sound for a correct answer that differs from the sound for an incorrect one. Every child, at the end, gets the same line: *"Thank you for playing with me today."*

## 6.3 What the teacher does

Before the sitting, the teacher reads a briefing screen carrying the verbatim script for the modules selected. During the sitting she reads any prompt aloud herself if audio is unavailable — the system is designed to be **fully usable with audio dead**, which is a stated requirement rather than a graceful degradation. For the spoken-response items she scores 0/1/2 against a printed rubric on a panel that opens behind a long-press, so a child cannot open it.

Separately, and not in any sitting, she completes the observation checklist for the window — 28 milestones per age band, each with three written band descriptors, rated on **best fit** rather than a checkbox tally, from what she has actually seen in the work cycle. Each may carry a short evidence note (≤300 characters) and a linked classroom photograph.

## 6.4 Tablet and paper are the same instrument

The paper packs are generated from the same item bank as the tablet application. Same stimuli, same wording, same order, same stop rules. **The only permitted difference is the response mode** — the child taps, or the child points and the teacher circles — and the absence of recorded narration, where the teacher reads the identical script.

**Both forms exist on paper.** Six packs are generated — one for each age band in each form (A3, A4 and A5 × Form A and Form B) — so a paper school runs the same form in the same window as a tablet school: Form A in Autumn, **Form B in Winter**, Form A again in Spring. A Winter paper sitting is administered and recorded as Form B. Substituting Form A for Form B in the Winter window would silently destroy the alternate-form design, and no pack or instruction anywhere in the system asks a teacher to do so.

Two asymmetries are forbidden by the generator, which refuses to emit a pack that violates them: paper may never gain teacher judgement where the tablet is auto-scored, and the tablet may never gain scaffolding that paper lacks. This is the main real threat to mode comparability in the literature, more than the physical medium itself.

## 6.5 Stop rules and the extension rule

A strand stops after three consecutive incorrect responses; a module stops after five. This is standard burden-reduction practice — the intent is that a child never sits through a run of items they cannot yet do. Stopped items are recorded as **not administered**, with a reason, and they reduce coverage rather than counting as failures. In practice, stop rules typically reduce a 50-item core sitting to 35–45 administered items.

The extension rule fires the other way: if a child is correct on everything in a strand, up to four items from the band above are administered. A *Secure* result on one of those is what "exceeded" means in the report.


# 7. How we score

## 7.1 Three bands, criterion-referenced

Every milestone resolves to one of three bands — **Emerging**, **Developing**, **Secure** — or to **unassessed**.

There are no percentiles, no peer ranking and no norm tables anywhere in the system. The reasoning is not squeamishness: a single school's n is far too small to support population norms, and both major real-world precedents in this space — Teaching Strategies GOLD and the statutory EYFS Profile — reject percentile language for parents in favour of plain developmental bands. We follow them.

## 7.2 From items to a milestone band

Evidence is linked by **construct**, not by authoring order. Every scored direct item carries a `constructTag`; a milestone's evidence is the set of items in its evidence band whose `constructTag` matches the milestone's own. The validator fails the build on any mismatch, so an item can never drift onto a milestone it does not actually measure. Each observation milestone *is* a checklist item, one to one.

One declared exception: `E6.A5.1` and `E6.A5.2` share the single A5 spoken-production item, because the blueprint allows only one item at that band. It is declared in the bank rather than left to be discovered.

```
points_earned   = Σ points awarded across administered evidence
points_possible = Σ maximum points across administered evidence
coverage        = administered evidence items ÷ declared evidence items

if coverage < 0.50   →  band = "unassessed"   (excluded from every denominator)
else ratio = points_earned ÷ points_possible
     ratio ≥ 0.80         →  Secure
     0.40 ≤ ratio < 0.80  →  Developing
     ratio < 0.40         →  Emerging
```

For observation milestones the teacher selects the band directly against three written descriptors, using best-fit judgement in the EYFS tradition — the descriptors describe a pattern, not a threshold.

**The 0.80 and 0.40 thresholds are conventional, not empirical.** We have no calibration sample. This is stated here, in Section 13, in the item bank's own scoring block, and in the footer of every funder report.

## 7.3 Coverage and the unassessed band

`unassessed` is a first-class result, not a gap to be filled. A milestone is unassessed when a stop rule fired early, a module was not run, a sitting was ended, or a teacher chose not to rate an observation item she had not genuinely seen. Unassessed milestones are **excluded from every denominator and printed in every report**. Nothing is silently dropped, and a smaller denominator is always visible as a smaller denominator.

## 7.4 Teacher override

Any band derived from direct items may be overridden by the teacher, with a required reason. The record stores the computed band, the final band, the source (`direct`, `observation`, or `teacher_override`) and the reason text.

Overrides are surfaced in funder reports as a transparency count. They are not errors and not embarrassments — a teacher who says "he can do this, he was unwell that morning" is supplying better information than the sitting did, and a system that hid that fact would be worse, not more rigorous.

## 7.5 Evidence at a glance

| Element | Count |
|---|---|
| Milestones | **230** (118 direct · 112 observation; 56 per age band) |
| — typically expected at band | 204 |
| — emerging edge (informative, not expected) | 16 |
| — extension (evidence in the band above) | 10 |
| Age bands | 4 — A3, A4, A5, and G1 (Montree Canopy) |
| Domains / strands | 6 / 28 |
| Item records | **568** (424 scored · 32 practice · 112 observation) |
| — by module | M-LIT 136 · M-MATH 136 · M-EFL 152 · M-OBS 112 · M-FOCUS 32 |
| — by type | tap-choice 352 · observation checklist 112 · teacher-scored oral 60 · listen-and-do 44 |
| Parallel forms | A and B (224 / 200 items), plus 112 observation and 32 practice |
| Stimulus records | 348 (83 shape · 73 picture · 69 word · 44 scene · 41 numeral · 19 letter · 19 quantity) |
| Paper packs | 8 — one per age band per form (A3/A4/A5/G1 × A/B) |
| Bank version | 1.11.0 |

The exact checksum for this bank version is recorded in `evaluation-kit/item-bank/BANK_CHECKSUM.txt` and carried on every session row, so any result can be traced to the exact content that produced it. It is deliberately not reprinted in prose here: a hand-copied hash goes stale the first time the bank moves and is worse than no hash at all.


# 8. What "compared to a traditional classroom" means — and does not mean

## 8.1 The Milestone Attainment Profile

One figure does the translating.

```
expected_assessed = milestones where expectation = 'expected'
                    AND age_band = the child's band
                    AND band ≠ 'unassessed'

met               = milestones at band 'Secure'
exceeded          = 'Secure' on an extension milestone from the band above

MAP% = round_to_nearest_5( 100 × met ÷ expected_assessed )
```

It renders as one sentence. The child, the school and every figure in the worked examples that follow are invented for illustration:

> **Illustrative example — synthetic data.** No pilot has been run; these numbers demonstrate the report format only.
>
> *"At this check-in, **Amara** has securely met **65%** of the **40** milestones typically expected of a four-year-old in mainstream early-years settings, and has additionally secured **2** milestones from the next age band."*

## 8.2 The rules baked into the renderer

These are not editorial guidance. They are enforced in code and cannot be bypassed by a well-meaning report writer.

1. MAP% is **rounded to the nearest 5**, because false precision is the specific failure mode we are guarding against.
2. MAP% is **always shown with its denominator**. There is no code path that prints the percentage alone.
3. If `expected_assessed < 12`, MAP% is **suppressed entirely** and replaced with the milestone list. The suppression and its reason are printed.
4. Below n = 6 in a domain, no domain-level figure is rendered; the domain falls back to a band chip.
5. Unassessed counts are always printed.
6. **EFL MAP% is computed and reported separately** and is never merged into the core figure.

## 8.3 A worked example

> **Illustrative example — synthetic data.** No pilot has been run; these numbers demonstrate the report format only.

Suppose a child — call her Amara — is 4 years 3 months, so band A4, and her Autumn check-in runs M-LIT, M-MATH and M-EFL plus the full A4 observation checklist. The table below is constructed to show the arithmetic; no child has been assessed.

| | Core track | English track |
|---|---|---|
| Milestones at A4 | 44 | 12 |
| — of which typically expected | 44 | 8 |
| Unassessed (stop rules, one module not run) | 4 | 0 |
| **Expected and assessed (the denominator)** | **40** | **8** |
| Secure | 26 | 3 |
| Developing | 9 | 4 |
| Emerging | 5 | 1 |
| Exceeded (extension milestones secured) | 2 | 0 |
| **MAP%** | **65%** (26 ÷ 40 = 0.65) | **suppressed — n = 8 < 12** |

Two things in that constructed table are worth a funder's attention. First, the denominator is 40, not 44 — four milestones were not assessed and are excluded rather than counted as failures. Second, the English figure is **suppressed**, and Section 11.3 explains that this is structural rather than accidental.

## 8.4 What this figure is not

> **MAP% is not a percentile.** It is not a rank. It does not mean 65% of children scored lower, and it does not mean Amara — the illustrative child of §8.3 — is in any position relative to any other child.
>
> **MAP% is not a test score.** It is the proportion of a defined, published list of age-typical milestones on which a teacher and a short structured check-in together judged this child to be secure.
>
> **MAP% is not a measure of intelligence, potential, or school readiness in a predictive sense.** It describes what a child could do in one fortnight of one term.
>
> **MAP% is not comparable across schools with different denominators.** Two children with 65% and 65% may have been assessed on different numbers of milestones. The denominator is printed for exactly this reason.
>
> **MAP% is not evidence that a programme caused anything.** See Section 9.
>
> **MAP% has no calibration sample behind it.** The thresholds that decide "Secure" are conventional. See Section 13.


# 9. Defensible claims — our rules

This section is reproduced verbatim in the funder-facing pack and encoded as a machine-checkable constant list. It exists so that a development officer writing a grant report at eleven at night has the sentences already written.

## 9.1 Say this

- "milestones typically expected at this age in mainstream early-years settings, as described in publicly available frameworks (UK EYFS Development Matters; US Head Start ELOF)"
- "consistent with", "in line with", "contributed to"
- "children in this cohort moved up a band on X% of tracked milestones over the year"
- "teacher-observed and directly-checked evidence, collected three times a year"
- "in well-implemented Montessori programmes, independent research including randomized controlled trials has found children perform as well as or better than peers in traditional programmes on early literacy, mathematics, executive function and social understanding"
- "a 2025 national randomized controlled trial found effects exceeding 0.20 standard deviations by the end of kindergarten, at approximately US$13,000 lower cost per child"
- "some studies show Montessori settings substantially narrow income-related achievement gaps"

## 9.2 Never say this

- **"proves", "caused", "because of our programme"** → use contribution language only. Individual child data from one classroom cannot support attribution.
- **Any percentile, rank, IQ-like number, or "X months ahead."** The underlying constructs are borrowed from validated instruments; a teacher-administered classroom check-in is not psychometrically equivalent to those instruments and must not be reported with their precision.
- **"Montessori outperforms traditional classrooms"** as a blanket claim. Domain-specific, hedged, fidelity-scoped claims only — the Campbell review and the French RCT both require it.
- **"Aligned with OECD IELS"** or **"aligned with IDELA."** These are cited as domain validity. No alignment is claimed and none exists.
- **"Every Montessori classroom gets these results."** Effects are conditional on implementation fidelity, and the literature says so explicitly.
- **Anything that suppresses a flat or negative result.** Selective reporting is treated as a build defect, not a presentational choice.

## 9.3 Contribution, not attribution

The distinction is the whole legal and intellectual basis of this document.

**Attribution** says: *our programme caused this change.* It requires a counterfactual — a control group, a randomization, a credible comparison — and one classroom's data will never contain one.

**Contribution** says: *this change happened, our programme was part of the environment in which it happened, and here is independent evidence that programmes of this kind produce changes of this kind.* That is a defensible claim, it is what the impact-measurement literature asks for, and it is the only claim Montree Milestones supports.

Concretely — the figure below is an invented one, shown to fix the *wording*, not to report a result: *"Children in the Spring cohort moved up a band on 38% of tracked milestones over the year. This is consistent with the growth patterns reported for well-implemented Montessori programmes in the peer-reviewed literature."* — not *"Our programme produced 38% growth."*

## 9.4 The fidelity caveat

Every claim about Montessori outcomes must be scoped to implementation quality, because the evidence is. The Campbell review found effects strongest in high-fidelity, well-certified programmes and weaker or inconsistent in compromised public-school implementations; the French RCT's adapted-Montessori classrooms, with material constraints and limited teacher training, produced one significant effect out of four domains.

The house phrasing is: *"in well-implemented Montessori programmes"* — never *"in Montessori."*

## 9.5 The mandatory report footer

Every Cohort Milestone Report carries, on the page, without exception:

1. The method statement.
2. The sample size (n).
3. The unassessed count.
4. The caveat that these are criterion-referenced classroom check-ins and **not psychometrically normed instruments**.
5. Framework attributions: UK Crown copyright / OGL v3.0; US HHS Office of Head Start; PRC Ministry of Education.
6. **Where flat or negative results exist, those results.**


# 10. Growth over time — the primary evidence

MAP% answers the question a parent or funder asks first. It is not the question we lead with.

For every milestone assessed in two or more windows, the system computes the band transition. The Growth Story leads with that:

> **Illustrative example — synthetic data.** No pilot has been run; these numbers demonstrate the report format only.
>
> *"Since the Autumn check-in, **Amara** has moved up a band on **11** milestones, holds steady on **26**, and we are watching **3**."*

There are three reasons this is the headline and MAP% is the context.

**Statistical.** Individual trajectory is defensible at small n; cross-sectional comparison is not. A single classroom will never have a sample that supports a normative claim, but it always has the child's own previous result — and that comparison holds the child constant, which is the strongest control available anywhere in this design.

**Empirical.** The 2025 national RCT found no detectable Montessori benefit at PK3 or PK4, with effects emerging only by the end of kindergarten. A system whose headline metric were a single-window comparison would systematically understate exactly the programmes it exists to evidence.

**Philosophical.** The Montessori record has always been about a child's trajectory against their own prior work rather than against peers or norms. Leading with growth is not a concession to Montessori sensibilities — it happens to be the statistically correct choice as well, which is why we did not have to trade rigour for adoption.

"We are watching" is deliberate wording. A milestone that moved *down* a band — which happens, for real reasons: illness, a new sibling, an unfamiliar assessor, a bad morning — is reported, not hidden, and framed as attention rather than deficit.


# 11. The English track

## 11.1 Separate by design

The EFL track has its own domain, its own six strands, its own 36 milestones, its own module, and its own reported figure. It is never merged into the core result. A child's developmental profile and a child's progress in a foreign language are different things, and a system that averaged them would flatter bilingual settings and penalise monolingual ones for no defensible reason.

The separation also carries a load it is easy to miss: **the EFL track is the system's only measure of a child's second language.** In an English-medium classroom, LCL-C and LCL-D report the child's literacy in the language of instruction and the EFL track is not used. In a classroom teaching in any other language, LCL-C and LCL-D are left unassessed (Section 5.4) and E3, E4 and E5 become the sole record of the child's English sounds, letters and first word reading. The same strands therefore answer a different question depending on the school, which is why the two tracks are reported separately and why neither may be substituted for the other.

## 11.2 Criterion-referenced to what the classroom actually teaches

Every English item is drawn from vocabulary, letters and words the classroom has genuinely taught — the school's own phonics sequence (SATPIN order), its CVC word line, its class themes. Coverage is checked against the eighteen-category taxonomy published in the ACCE-V study, a validated receptive-vocabulary instrument for young Chinese EFL learners, whose four-picture design (target, phonological distractor, semantic distractor, unrelated distractor) is the template for our E1 items.

**No copyrighted wordlist is embedded.** The Cambridge Pre-A1 Starters wordlist carries an explicit UCLES copyright notice, and the Oxford 3000/5000 lists carry an Oxford University Press notice; both are usable as internal design references and neither may be reproduced in a product. Our word list is independently authored.

## 11.3 Why EFL MAP% is usually suppressed — and why we are telling you

This is the most important limitation in the document, and it is structural rather than a data-quality problem.

MAP% is suppressed below twelve expected-and-assessed milestones. The EFL track has, by design, this many milestones typically expected at each band:

| Age band | EFL milestones | Typically expected | Emerging edge | Extension | EFL MAP% possible? |
|---|---|---|---|---|---|
| A3 (3;0–3;11) | 12 | **6** | 3 | 3 | **No — structurally suppressed** |
| A4 (4;0–4;11) | 12 | **8** | 3 | 1 | **No — structurally suppressed** |
| A5 (5;0–5;11) | 12 | **12** | 0 | 0 | Only if all 12 are assessed |
| G1 (Montree Canopy) | 12 | **12** | 0 | 0 | Only if all 12 are assessed |

At A3 and A4, the denominator can never reach twelve, so **EFL MAP% can never be produced at those bands, no matter how well the check-in goes.** At A5 and at Canopy it is produced only when every one of the twelve expected milestones is assessed — a single stop rule firing suppresses it.

We could have hidden this by lowering the suppression threshold for the English track. We did not, for two reasons. Setting a looser evidence standard for the figure most likely to be quoted to a fee-paying parent would be precisely backwards. And the underlying reason the denominator is small is itself the honest finding: **there is very little that can be described as "typically expected" in a foreign language at age three.** A three-year-old EFL learner in their first term has no age-typical expectation to fall short of.

What is reported instead, at every band, is the full milestone list with bands, the unassessed count, and — from the second window onward — growth. That is the defensible EFL evidence, and it is better evidence than a percentage computed from six milestones would have been.

## 11.4 No CEFR, Cambridge or Trinity level claims

No major exam board targets under-sixes. Cambridge Starters' effective floor is age six to seven. Trinity's GESE reaches age four, but only as a live spoken interview. The consensus across the field is that at ages three to five, "testing" in the exam-board sense is developmentally inappropriate, and what is realistic is informal, criterion-referenced, teacher-observed assessment of discrete constructs.

So Montree Milestones makes **no CEFR level claim, no Cambridge Starters claim, and no GESE grade claim.** Our E6 spoken-production items borrow the GESE Grade-1 *register* — name, age, "what is this?", "what colour?" — as a design pattern for what is reasonable to ask a four-year-old in a second language. That is a design reference, not an alignment.

Spoken items are **never scored by speech recognition.** Recognition of three-to-five-year-old second-language speech is unreliable, and a rubric-scoring teacher in the room is both more accurate and more Montessori-authentic than a confidence score would be.

The 36 EFL milestones carry no China MoE crosswalk code, because the MoE 3–6 Guide has no foreign-language domain. Inventing a mapping would misrepresent the source document.


# 12. Privacy and data

**What is stored.** For each check-in: the child's identifier within their own school, age in months, age band, window, form, delivery mode, assessment language, the item responses, the milestone bands, any teacher override and its reason, any evidence note, and the version and checksum of the item bank used. Session and response records carry the school identifier directly, so tenancy is stamped on the row and not inferred.

**What is not stored.** No audio recording of a child's speech is retained — spoken items are scored live by the teacher against a rubric, and the rubric score is what persists. No raw media is created by this module at all. No free-text narrative about a child is generated by a language model without the teacher seeing it first, and any model call that writes durable narrative runs at temperature zero so the same evidence produces the same words.

**Who can see it.** Every route is school-scoped, every route touching a child verifies that the child belongs to the requesting school, and the whole feature is behind a per-school flag that is off by default. A teacher sees her classroom. A principal sees the school. A parent sees their own child's Growth Story and nothing else. No cross-school comparison surface exists, and building one would require a deliberate architectural decision rather than a configuration change.

**What is read but never written.** The module reads the school's existing Montessori progress records and English progression records to give context in the report. It never writes to them. A check-in cannot alter a child's shelf, advance a work, or change a teacher's own record.

**Cohort reporting.** Cohort Milestone Reports are aggregates within one school. They carry n on the page and suppress figures below the same thresholds as the individual report. A cohort report is not a mechanism for comparing classrooms or teachers, and it is not published to anyone outside the school without the school's explicit action.

**Deletion.** Deleting a child cascades to their sessions, responses and milestone results. There is no orphan copy in an analytics store.


# 13. Limitations, honestly

A methodology document that lists no limitations is a marketing document. These are ours, stated as plainly as we can manage.

A companion document, **`EVIDENCE_STATUS.md`**, states the same position in the form a diligence reader will want it: what evidence exists today, what does not, the four studies that would change that, and — study by study — exactly what may and may not be claimed until each one lands. Where this section and that document differ, that document is the current one.

**1. There is no calibration sample.** The thresholds that convert a ratio into a band — 0.80 for Secure, 0.40 for Developing — are conventional values, chosen because they are the conventional values, not because they were derived from data. No item has a difficulty parameter. No milestone has an empirically established discrimination. When a calibration sample exists, these thresholds should be revisited, and the fact that they were revisited should be published.

**2. Forms A and B are matched by construct, not by psychometrics.** Each form covers the same strands with the same item counts, the same formats and the same construct specifications. That is content matching. It is *not* the same as equated difficulty, and a child who happens to find Form B harder than Form A will show a dip that is a property of the forms and not of the child. This is the single most likely source of spurious within-child movement, and it is why growth should be read across three windows rather than two.

**3. This is criterion-referenced, not normed.** There is no reference population. "Typically expected" means "described as age-typical in publicly available early-years frameworks," not "achieved by 50% of a representative sample." No percentile can be derived from these data, and any attempt to do so should be treated as an error.

**4. Two core literacy strands are English-medium, and a non-English-medium school reports a smaller core profile.** LCL-C and LCL-D are English in content (Section 5.4). A school teaching in another language must leave them unassessed, which removes 2 to 4 expected milestones per band from the core denominator and means the core language domain is evidenced by receptive language, expressive language and emergent writing only. Those schools have no core-track measure of phonological awareness or print knowledge in their own language of instruction; the EFL track measures those skills in English instead. Building locale-specific LCL-C/LCL-D item sets — Pinyin, Hanzi stroke and character recognition for a Chinese-medium classroom, for example — is the correct fix and has not been done.

**5. Observation strands depend on teacher judgement.** Half the bank is rated by the teacher who taught the child. That is a deliberate design choice — it is the only valid way to assess pouring, turn-taking or persistence — but it means those bands carry the rater's knowledge of the child, and no inter-rater reliability study has been conducted. Two teachers rating the same child would not necessarily agree, and we have not measured how often they would.

**6. Small n limits everything above the individual.** A single classroom cohort is a small sample. Cohort figures are descriptive summaries of the children actually assessed, not estimates of a population parameter, and confidence intervals are not reported because they would imply a sampling frame that does not exist.

**7. No causal inference is possible.** There is no control group, no randomization, no counterfactual. Nothing in these data can establish that a programme caused a change in a child. See Section 9.3.

**8. Suppression is common, not exceptional.** The n = 12 rule suppresses EFL MAP% at two of the four age bands structurally (Section 11.3), and will suppress core MAP% for any child whose sitting was substantially interrupted. A report with a suppressed figure is a working report, not a failure — but it will be a frequent sight, and anyone planning around this system should expect it.

**9. The constructs are borrowed; the instruments are not the validated ones.** Our items are modelled on the *formats* of validated instruments — four-picture receptive vocabulary in the PPVT/ACCE-V tradition, tap-based executive-function tasks in the Early Years Toolbox tradition, best-fit band judgement in the EYFS Profile tradition. They are not those instruments, they have not been validated against them, and correlations reported for the originals do not transfer.

**10. Mode equivalence is asserted by design, not demonstrated.** Tablet and paper are generated from one bank and constrained to differ only in response mode. The general research on paper-versus-tablet comparability supports this for visual pointing tasks. We have not run our own mode-comparison study.

**11. Cultural and linguistic reach is limited.** The bank ships in English and Chinese. Stimuli were checked for greyscale legibility and cultural neutrality by review, not by empirical differential-item-functioning analysis.

**12. Montree Canopy has no more calibration than the rest of it, and less field use.** Everything above applies unchanged to the Grade-1 tier, and one thing applies more sharply: it is the newest content in the bank. Its 0.80 / 0.40 thresholds are the same conventional thresholds, not empirically derived ones; its Forms A and B are matched by construct specification, not equated; and the boundary between "an A5 child who has topped out" and "a Canopy child" is a teacher's judgement supported by evidence, not a cut score. A Canopy figure should be read the way every figure in this document should be read: as a careful, criterion-referenced description of what a child did on one particular morning, against milestones a school can inspect.

<!--PB-->

# 14. What comes out: the two reports

> **Illustrative example — synthetic data.** No pilot has been run; these numbers demonstrate the report format only.
>
> Both reports below are **specimens**. "Amara", "Ms Chen", the "Sunflower Room" and "Little Trees Montessori" do not exist, and every number in them — the 65%, the 38% growth, the cohort of 59 of 61 children, the 5.1% unassessed — was written by hand to exercise the layout and the suppression rules. They are what a report *would look like*, not what any report *has said*. The evidence that does and does not stand behind this instrument is set out in `EVIDENCE_STATUS.md`.

## 14.1 Growth Story — the parent report

Warm, plain, one child, no jargon. Below is the structure with representative content — a specimen, not a record of any child.

---

### **Amara's Growth Story**

> **Illustrative example — synthetic data.** No pilot has been run; these numbers demonstrate the report format only.

**Winter check-in · February 2027 · Sunflower Room · 4 years 3 months**

**How Amara has grown since Autumn**

Since the Autumn check-in, Amara has moved up a band on **11** milestones, holds steady on **26**, and we are watching **3**.

The biggest movement is in her hands and in her listening. In Autumn she could hold a pencil comfortably; she can now control it well enough to form the letters of her own name without help. She has moved from following a single spoken instruction to following two in a row, which is a bigger step than it sounds — it means holding one idea while acting on another.

**What Amara can do now**

| Area | Autumn | Winter |
|---|---|---|
| How she works | Developing | **Secure** |
| Being with others | Secure | **Secure** |
| Talking, listening and letters | Developing | **Secure** |
| Number, shape and the world | Developing | **Developing** |
| Her hands, her body, looking after herself | Developing | **Secure** |
| English | Developing | **Developing** |

**Some of the things we saw**

- *Settles quickly to a chosen activity and stays until it feels finished.* — Secure
- *Hears when two words start with the same sound.* — Secure
- *Counts a small group of objects and says how many there are altogether.* — Developing
- *Carries a tray of materials across the room without spilling.* — Secure
- *Waits for a turn without needing to be reminded.* — Developing

**What we are watching**

Amara is still working on comparing quantities — "which has more" is reliable, "which has fewer" is not yet. This is completely ordinary at four, and it is the kind of thing that resolves in the normal run of the Number work. We will look again in Spring.

**How Amara compares to what is typical at her age**

At this check-in, Amara has securely met **65%** of the **40** milestones typically expected of a four-year-old in mainstream early-years settings, and has additionally secured **2** milestones from the next age band. Four milestones were not assessed at this check-in and are not included in that figure.

> **What this number is — and is not.** It means: of a published list of things four-year-olds are usually doing, Amara is doing about two-thirds of them securely, and two things four-year-olds are usually *not* yet doing. It does not mean 65% of children scored lower than Amara. It is not a rank, a percentile, or a test score. It is not a prediction. It is a description of one fortnight in one term, written by the teacher who knows her.

**English**

Amara is working in English as an additional language. At her age we do not report an English percentage, because the number of things typically expected of a four-year-old in a foreign language is too small to make a percentage meaningful. What we can tell you is that she is Secure on 3 English milestones, Developing on 4, and Emerging on 1 — and that she has moved up a band on 2 of them since Autumn.

*Recorded by Ms Chen · Method: one-to-one check-in (15 minutes) plus classroom observation across the term. Milestones described in publicly available frameworks (UK EYFS Development Matters; US Head Start ELOF). Criterion-referenced classroom check-in, not a standardized test.*

---

## 14.2 Cohort Milestone Report — the funder report

The same evidence, aggregated, with every caveat on the page. As above, this is a specimen built from invented figures.

---

### **Cohort Milestone Report**

> **Illustrative example — synthetic data.** No pilot has been run; these numbers demonstrate the report format only.

**Little Trees Montessori · School year 2026–2027 · Autumn → Spring · 3 classrooms**

**Cohort**

| | Autumn | Winter | Spring |
|---|---|---|---|
| Children enrolled | 62 | 64 | 61 |
| Children with a completed check-in | 58 | 61 | 59 |
| Children with a check-in in **all three** windows | — | — | **54** |
| Delivery: tablet / paper | 41 / 17 | 47 / 14 | 45 / 14 |
| Milestone results recorded | 3,248 | 3,416 | 3,304 |
| — of which unassessed | 214 (6.6%) | 179 (5.2%) | 168 (5.1%) |
| Teacher overrides applied | 31 (1.0%) | 26 (0.8%) | 22 (0.7%) |

**Growth across the year** — the primary finding, computed on the 54 children present in all three windows

| Domain | Milestones tracked | Moved up ≥1 band | Held steady | Moved down |
|---|---|---|---|---|
| Approaches to Learning & Self-Regulation | 432 | 171 (40%) | 249 (58%) | 12 (3%) |
| Social & Emotional Development | 432 | 148 (34%) | 275 (64%) | 9 (2%) |
| Language, Communication & Literacy | 540 | 236 (44%) | 291 (54%) | 13 (2%) |
| Cognition: Mathematics & Exploration | 540 | 189 (35%) | 337 (62%) | 14 (3%) |
| Physical Development & Practical Life | 432 | 163 (38%) | 261 (60%) | 8 (2%) |
| **Core total** | **2,376** | **907 (38%)** | **1,413 (59%)** | **56 (2%)** |
| English (reported separately) | 648 | 197 (30%) | 431 (67%) | 20 (3%) |

*Children in this cohort moved up a band on 38% of tracked core milestones over the year. This is consistent with the growth patterns reported for well-implemented Montessori programmes in the peer-reviewed literature.*

**Milestone attainment, Spring window**

| Age band | Children | Median expected-and-assessed (n) | Median MAP% | Range |
|---|---|---|---|---|
| A3 | 19 | 36 | 45% | 25–70% |
| A4 | 23 | 41 | 60% | 35–85% |
| A5 | 17 | 35 | 70% | 45–90% |
| **English, A5 only** | 17 | 12 | 55% | 30–75% |
| English, A3 and A4 | 42 | — | **suppressed (structural)** | — |

**Flat and negative findings, reported**

- **Mathematics growth (35%) trailed literacy growth (44%)** across all three age bands. The school's own reading of this is a shelf-availability issue in one classroom; no claim is made here about cause.
- **Two children moved down a band on more than five milestones** between Winter and Spring. Both had extended absences. Their results are included in every figure above.
- **English growth (30%) was the lowest of any domain**, and English MAP% is unavailable for 42 of 59 children for structural reasons described in the methodology.
- The A3 median MAP% of 45% should not be read as underperformance. Three-year-olds are assessed against three-year-old expectations, and a first-year cohort spends much of the Autumn window learning what a check-in is.

> **Method statement.** Montree Milestones is a criterion-referenced developmental check-in, administered one-to-one by the child's own teacher three times per school year, combined with a structured teacher-observation checklist rated across each term. It is **not a psychometrically normed instrument**, produces no percentile or rank, and supports no causal claim about any programme. Milestone statements are original wording. Thresholds are conventional and not empirically calibrated; there is no calibration sample. n = 59 children assessed in the Spring window, of 61 enrolled; 5.1% of milestone results are unassessed and excluded from all denominators. *(In this specimen the n, the enrolment and the unassessed rate are invented; in a real report they are computed from the session records.)*
>
> **Framework attributions.** Domain structure after the US Department of Health and Human Services, Office of Head Start, Early Learning Outcomes Framework (public domain). Milestone register after the UK Department for Education, EYFS / Development Matters, © Crown copyright, Open Government Licence v3.0. China crosswalk references the PRC Ministry of Education 3–6岁儿童学习与发展指南 (2012), cited as curriculum reference and not as an evaluative standard or endorsement. IDELA (Save the Children) and OECD IELS are cited as evidence of domain validity only; no alignment with either is claimed.

---


# 15. Implementation roadmap

## 15.1 What exists today

| Component | State |
|---|---|
| Item bank (230 milestones, 568 items, 348 stimuli) | Built, schema-validated, checksummed at `1.11.0` |
| Tablet application | Single self-contained offline HTML file; iPad Safari and Android Chrome |
| Paper packs | Generated from the same bank: teacher script, stimulus cards, scoring sheet, observation checklist, and the M-EFL script and cards **as a section inside each band pack** (there is no separate EFL booklet) — eight packs, one per age band per form (A3/A4/A5/G1 × A/B), plus a scoring-sheets-only reprint set covering all eight |
| Scoring engine | Milestone banding, MAP, growth, override handling; server re-scores from the bank and never trusts a client-computed band |
| Reports | Growth Story and Cohort Milestone Report |
| Languages | English and Chinese for child-facing prompts and milestone statements |
| Montree Canopy (band `G1`, ages 6–7) | Authored at bank `1.11.0`; gated per school by the `child_evaluation_g1` flag (Section 5.5) |

## 15.2 Phasing for a school

**Phase 0 — one classroom, one window (≈ 6 weeks).** One teacher, one age band, paper or tablet. The purpose is not data; it is to find out how the sitting actually feels in that room and how long it really takes. Expect the first Autumn window to run long.

**Phase 1 — whole school, one full year (3 windows).** The first year produces the first growth data, which is the first genuinely usable evidence. A single window in isolation supports a Growth Story but not a cohort finding.

**Phase 2 — funder reporting (end of year 1).** The first Cohort Milestone Report. This is the point at which the claims-language rules in Section 9 stop being theoretical, and the point at which a school should have someone read the report specifically against them.

**Phase 3 — second year.** Two years of growth data on returning children. This is where the evidence becomes genuinely strong, and it is worth saying to a funder at the start that year two is the year the reporting gets good.

## 15.3 What we intend to do next, in priority order

0. **A standard-setting panel on the thresholds.** Cheaper and faster than a calibration sample, and it removes the word "conventional" from the two numbers most often quoted. The runnable one-day protocol is `CUT_SCORE_PANEL_PROTOCOL.md`; the structural finding it must be shown first — that at current item counts a 0.80 threshold behaves as a demand for a flawless run — is in `BANK_AUDIT_2026-08.md`.
1. **A calibration sample.** The single highest-value next step. With several hundred children across mixed settings, item difficulty could be estimated, the 0.80/0.40 thresholds tested against data, and Forms A and B properly equated. Everything in Section 13 improves at once.
2. **An inter-rater reliability study on the observation strands.** Two teachers, same children, same window. This is cheap and would materially strengthen half the bank.
3. **A mode-comparison study.** Tablet versus paper on the same children, counterbalanced.
4. **Locale-specific LCL-C and LCL-D item sets.** *(The locale gate in Section 5.4 is now enforced in code; this remains the content half of that work.)* The highest-value content gap: a genuinely native phonological-awareness and print-knowledge strand for each language of instruction — Pinyin and Hanzi character/stroke recognition for a Chinese-medium classroom, and the equivalent elsewhere — so that a non-English-medium school reports a complete core language domain rather than two unassessed strands (Sections 5.4 and 13.4).
5. **Locale expansion** beyond English and Chinese, with stimulus review for cultural appropriateness in each new market rather than translation alone.
6. **Differential item functioning analysis** once n permits — specifically for children assessed in a language that is not their home language.
7. **A published technical note** whenever thresholds change, so that any figure can be traced to the rules that produced it.

## 15.4 What we will not do

We will not publish norms derived from our own users' data and call them norms. We will not build a cross-school comparison surface. We will not add a rank, a percentile, a star, or a leaderboard. We will not let the English figure be merged into the core figure to make it look larger. And we will not remove the suppression rules to make more reports produce a number.

Each of those would make the product more immediately saleable and would destroy the only thing it is actually for.

<!--PB-->

# Appendix A — The full milestone list

All 230 milestones, grouped by domain and then by strand and band — the three kindergarten bands (`A3`, `A4`, `A5`) followed by Montree Canopy (`G1`, Section 5.5). `D` = checked directly in the sitting; `O` = rated by the teacher from observation. **Expectation** governs the comparative denominator: only *Expected* milestones enter MAP%. All wording is original — see Section 4.2. Strands marked **English-medium** are English in content and are left unassessed in a non-English-medium classroom (Section 5.4).

## A.1 Approaches to Learning & Self-Regulation (`ATL`) — 32 milestones

*Strands: ATL-A Engagement & persistence (O) · ATL-B Initiative & choice-making (O) · ATL-C Flexible thinking & problem-solving (O) · ATL-D Self-regulation & impulse control (O)*

| ID | Band | Expectation | Milestone statement |
|---|---|---|---|
| ATL-A.A3.1 | A3 | Expected | Settles to a chosen activity for a short time. |
| ATL-A.A3.2 | A3 | Expected | Comes back to an activity after a small interruption. |
| ATL-A.A4.1 | A4 | Expected | Stays with a chosen work through a whole work cycle. |
| ATL-A.A4.2 | A4 | Expected | Keeps trying when a piece of work is difficult. |
| ATL-A.A5.1 | A5 | Expected | Returns to the same work over several days to make it better. |
| ATL-A.A5.2 | A5 | Expected | Plans what they want to finish and sees it through. |
| ATL-A.G1.1 | G1 | Expected | Works with deep focus on one activity for a long stretch. |
| ATL-A.G1.2 | G1 | Expected | Picks up work begun on another day and carries it through to the end. |
| ATL-B.A3.1 | A3 | Expected | Chooses an activity with a little help. |
| ATL-B.A3.2 | A3 | Expected | Shows what they want to do by pointing or asking. |
| ATL-B.A4.1 | A4 | Expected | Chooses their own work without being asked. |
| ATL-B.A4.2 | A4 | Expected | Chooses work that stretches them, not only easy favourites. |
| ATL-B.A5.1 | A5 | Expected | Plans their morning and chooses a balance of work. |
| ATL-B.A5.2 | A5 | Emerging edge | Asks for a new lesson when they are ready for one. |
| ATL-B.G1.1 | G1 | Expected | Chooses their own work and begins it without being told. |
| ATL-B.G1.2 | G1 | Expected | Asks a question when they are unsure what to do, instead of stopping. |
| ATL-C.A3.1 | A3 | Expected | Tries a different way when something does not work. |
| ATL-C.A3.2 | A3 | Emerging edge | Uses a familiar material in a new way during play. |
| ATL-C.A4.1 | A4 | Expected | Finds more than one way to solve a small problem. |
| ATL-C.A4.2 | A4 | Expected | Asks a question to work something out. |
| ATL-C.A5.1 | A5 | Expected | Thinks a problem through before acting. |
| ATL-C.A5.2 | A5 | Emerging edge | Explains how they solved something to another child. |
| ATL-C.G1.1 | G1 | Expected | Tries a way of their own before asking an adult for help. |
| ATL-C.G1.2 | G1 | Expected | Looks back over their own work and puts right whatever does not look right. |
| ATL-D.A3.1 | A3 | Expected | Waits for a short turn with help from an adult. |
| ATL-D.A3.2 | A3 | Expected | Stops an action when reminded. |
| ATL-D.A4.1 | A4 | Expected | Waits for a material that another child is using. |
| ATL-D.A4.2 | A4 | Expected | Manages a change in the routine with a little support. |
| ATL-D.A5.1 | A5 | Expected | Waits, takes turns and follows the ground rules without reminders. |
| ATL-D.A5.2 | A5 | Expected | Calms themselves when upset, using a strategy they know. |
| ATL-D.G1.1 | G1 | Expected | Moves calmly from one activity to the next with little help. |
| ATL-D.G1.2 | G1 | Expected | Waits their turn and holds back a first impulse when the moment calls for it. |

## A.2 Social & Emotional Development (`SED`) — 32 milestones

*Strands: SED-A Relationships with adults (O) · SED-B Peer interaction & cooperation (O) · SED-C Emotional knowledge & expression (O) · SED-D Grace, courtesy & community (O)*

| ID | Band | Expectation | Milestone statement |
|---|---|---|---|
| SED-A.A3.1 | A3 | Expected | Seeks out a familiar adult for comfort or help. |
| SED-A.A3.2 | A3 | Expected | Responds warmly when an adult greets them. |
| SED-A.A4.1 | A4 | Expected | Asks an adult for help using words. |
| SED-A.A4.2 | A4 | Expected | Enjoys sharing news with a familiar adult. |
| SED-A.A5.1 | A5 | Expected | Talks with adults about ideas and plans, not only needs. |
| SED-A.A5.2 | A5 | Expected | Accepts guidance from an adult and acts on it. |
| SED-A.G1.1 | G1 | Expected | Talks with a familiar adult about their own work and what they are trying to do. |
| SED-A.G1.2 | G1 | Expected | Asks an adult for what they need, in words, at a good moment. |
| SED-B.A3.1 | A3 | Expected | Plays alongside other children happily. |
| SED-B.A3.2 | A3 | Expected | Notices when another child is nearby and makes room. |
| SED-B.A4.1 | A4 | Expected | Joins in a shared activity with one or two children. |
| SED-B.A4.2 | A4 | Expected | Takes turns in a game with a little support. |
| SED-B.A5.1 | A5 | Expected | Works with others on a shared plan. |
| SED-B.A5.2 | A5 | Expected | Sorts out a small disagreement with words. |
| SED-B.G1.1 | G1 | Expected | Takes turns in a group activity without an adult reminding them. |
| SED-B.G1.2 | G1 | Expected | Builds on what another child has just said in a conversation. |
| SED-C.A3.1 | A3 | Expected | Shows their feelings clearly and can be comforted. |
| SED-C.A3.2 | A3 | Expected | Recognises happy and sad in faces and stories. |
| SED-C.A4.1 | A4 | Expected | Names how they are feeling. |
| SED-C.A4.2 | A4 | Expected | Notices when another child is upset. |
| SED-C.A5.1 | A5 | Expected | Talks about why they feel a certain way. |
| SED-C.A5.2 | A5 | Expected | Offers comfort or help to a child who is upset. |
| SED-C.G1.1 | G1 | Expected | Names how they feel with a word that fits, not only happy or sad. |
| SED-C.G1.2 | G1 | Expected | Uses a way of their own to settle when they are upset. |
| SED-D.A3.1 | A3 | Expected | Copies a greeting with a familiar adult or child. |
| SED-D.A3.2 | A3 | Expected | Begins to use please and thank you with reminders. |
| SED-D.A4.1 | A4 | Expected | Greets visitors and says goodbye without prompting. |
| SED-D.A4.2 | A4 | Expected | Waits for a pause before joining a conversation. |
| SED-D.A5.1 | A5 | Expected | Uses the classroom courtesies naturally through the day. |
| SED-D.A5.2 | A5 | Emerging edge | Helps a younger child learn a routine. |
| SED-D.G1.1 | G1 | Expected | Greets, thanks and asks politely without being prompted. |
| SED-D.G1.2 | G1 | Expected | Settles a small disagreement with a friend using words. |

## A.3 Language, Communication & Literacy (`LCL`) — 42 milestones

*Strands: LCL-A Receptive language & listening (D) · LCL-B Expressive language & vocabulary (D) · LCL-C Phonological awareness (D, English-medium) · LCL-D Print & alphabet knowledge (D, English-medium) · LCL-E Emergent writing (O)*

| ID | Band | Expectation | Milestone statement |
|---|---|---|---|
| LCL-A.A3.1 | A3 | Expected | Listens to a short sentence and points to the picture it describes. |
| LCL-A.A3.2 | A3 | Expected | Follows a simple instruction with one step. |
| LCL-A.A4.1 | A4 | Expected | Understands a sentence that says where something is, such as under or on. |
| LCL-A.A4.2 | A4 | Expected | Follows an instruction with two steps in the right order. |
| LCL-A.A5.1 | A5 | Expected | Listens to a short story and answers a question about what happened. |
| LCL-A.A5.2 | A5 | Expected | Understands words that tell the order of events, such as first and last. |
| LCL-A.G1.1 | G1 | Expected | Answers a question about something read aloud, including one they have to work out for themselves. |
| LCL-A.G1.2 | G1 | Expected | Follows a spoken instruction with three parts, in order, the first time it is said. |
| LCL-B.A3.1 | A3 | Expected | Names familiar objects when shown a picture. |
| LCL-B.A3.2 | A3 | Expected | Uses short sentences of three or four words to tell you something. |
| LCL-B.A4.1 | A4 | Expected | Describes what is happening in a picture using several words. |
| LCL-B.A4.2 | A4 | Expected | Uses joining words such as and or because to link two ideas. |
| LCL-B.A5.1 | A5 | Expected | Retells what happened in a picture story in the order it happened. |
| LCL-B.A5.2 | A5 | Emerging edge | Explains an idea clearly enough for a listener who did not see it. |
| LCL-B.G1.1 | G1 | Expected | Retells a story in order and says what someone did or how they felt. |
| LCL-B.G1.2 | G1 | Expected | Says what a word means in their own words, and groups words that belong together. |
| LCL-C.A3.1 | A3 | Expected | Hears when two familiar words rhyme. |
| LCL-C.A3.2 | A3 | Emerging edge | Finds a rhyme even when the word is less familiar. |
| LCL-C.A4.1 | A4 | Expected | Hears when two words start with the same sound. |
| LCL-C.A4.2 | A4 | Expected | Picks out the first sound in a short spoken word. |
| LCL-C.A5.1 | A5 | Expected | Picks out the first sound of a word on their own. |
| LCL-C.A5.2 | A5 | Expected | Hears the last sound in a short spoken word. |
| LCL-C.G1.1 | G1 | Expected | Says every sound in a spoken word, in order. |
| LCL-C.G1.2 | G1 | Expected | Hears whether two words have the same middle vowel sound. |
| LCL-D.A3.1 | A3 | Expected | Knows that the writing on a page carries a message. |
| LCL-D.A3.2 | A3 | Emerging edge | Picks out a letter shape among other squiggles. |
| LCL-D.A4.1 | A4 | Expected | Matches a letter to the sound it makes, for taught letters. |
| LCL-D.A4.2 | A4 | Expected | Finds a named letter among other letters. |
| LCL-D.A5.1 | A5 | Expected | Reads a short taught word by looking at its letters. |
| LCL-D.A5.2 | A5 | Emerging edge | Points to where a sentence begins and follows the words left to right. |
| LCL-D.A5.3 | A5 | Extension | Reads a word with two letters that make one sound. |
| LCL-D.A5.4 | A5 | Extension | Reads a whole short sentence aloud. |
| LCL-D.G1.1 | G1 | Expected | Reads a word with a two-letter sound or a vowel team by sounding it out — even a word they have never seen. |
| LCL-D.G1.2 | G1 | Expected | Reads a short sentence and shows they know what it says. |
| LCL-E.A3.1 | A3 | Expected | Draws on purpose and says what it means. |
| LCL-E.A3.2 | A3 | Expected | Draws lines, circles and shapes with growing control. |
| LCL-E.A4.1 | A4 | Expected | Writes some of the letters in their own name. |
| LCL-E.A4.2 | A4 | Expected | Uses letter shapes in their drawing and play. |
| LCL-E.A5.1 | A5 | Expected | Writes their own name clearly. |
| LCL-E.A5.2 | A5 | Expected | Writes short taught words using the sounds they know. |
| LCL-E.G1.1 | G1 | Expected | Writes a sentence of their own with a capital letter, spaces between the words and a full stop. |
| LCL-E.G1.2 | G1 | Expected | Writes a short piece of two or more sentences that holds together from beginning to end. |

## A.4 Cognition: Mathematics & Exploration (`COG`) — 43 milestones

*Strands: COG-A Number sense & counting (D) · COG-B Quantity, comparison & early operations (D) · COG-C Shape, space & pattern (D) · COG-D Measurement, sorting & classification (D) · COG-E Scientific & world exploration (O)*

| ID | Band | Expectation | Milestone statement |
|---|---|---|---|
| COG-A.A3.1 | A3 | Expected | Sees how many are in a small group without counting, up to three. |
| COG-A.A3.2 | A3 | Expected | Counts a small group of objects, saying one number for each one. |
| COG-A.A4.1 | A4 | Expected | Recognises written numerals up to five. |
| COG-A.A4.2 | A4 | Expected | Counts on beyond five, out loud and when counting things. |
| COG-A.A5.1 | A5 | Expected | Counts on beyond ten, out loud and when counting things. |
| COG-A.A5.2 | A5 | Expected | Knows which number is one more than a given number, up to ten. |
| COG-A.A5.3 | A5 | Extension | Counts on past one hundred from a number they are given. |
| COG-A.G1.1 | G1 | Expected | Counts on past one hundred from any number, and counts in tens and in fives. |
| COG-A.G1.2 | G1 | Expected | Knows what each digit in a two-digit number stands for, and uses that to say which number is larger. |
| COG-B.A3.1 | A3 | Expected | Chooses the group that has more. |
| COG-B.A3.2 | A3 | Emerging edge | Chooses the group that has fewer. |
| COG-B.A4.1 | A4 | Expected | Compares two groups and says which has fewer. |
| COG-B.A4.2 | A4 | Expected | Matches a written numeral to the right number of things, up to five. |
| COG-B.A5.1 | A5 | Expected | Works out how many are left when some are taken away, within five. |
| COG-B.A5.2 | A5 | Expected | Works out how many there are altogether when two small groups are joined. |
| COG-B.A5.3 | A5 | Extension | Adds and takes away within twenty. |
| COG-B.G1.1 | G1 | Expected | Adds and takes away within twenty in a way that works for them. |
| COG-B.G1.2 | G1 | Expected | Works out an everyday problem that needs adding or taking away. |
| COG-C.A3.1 | A3 | Expected | Names or points to a circle, a square and a triangle. |
| COG-C.A3.2 | A3 | Expected | Copies a simple repeating pattern of two things. |
| COG-C.A4.1 | A4 | Expected | Says what comes next in a repeating two-part pattern. |
| COG-C.A4.2 | A4 | Expected | Understands position words such as on, in and under. |
| COG-C.A5.1 | A5 | Expected | Says what comes next in a longer repeating pattern. |
| COG-C.A5.2 | A5 | Expected | Understands position words such as behind, between and next to. |
| COG-C.A5.3 | A5 | Extension | Finds a half of a shape. |
| COG-C.G1.1 | G1 | Expected | Names a solid shape and says one thing that is true of every one of them. |
| COG-C.G1.2 | G1 | Expected | Finds a half and a quarter of a shape, and notices when the parts are not equal. |
| COG-D.A3.1 | A3 | Expected | Picks the longest or the biggest of three things. |
| COG-D.A3.2 | A3 | Expected | Puts things that go together into the same group. |
| COG-D.A4.1 | A4 | Expected | Finds the one that does not belong in a group. |
| COG-D.A4.2 | A4 | Expected | Puts three things in order by size. |
| COG-D.A5.1 | A5 | Expected | Sorts things by two things at once, such as colour and size. |
| COG-D.A5.2 | A5 | Expected | Chooses which of two things is longer or heavier. |
| COG-D.G1.1 | G1 | Expected | Reads the time on a clock at the hour and at half past. |
| COG-D.G1.2 | G1 | Expected | Compares three things and picks out the longest, the tallest or the shortest. |
| COG-E.A3.1 | A3 | Expected | Notices and points out changes around them. |
| COG-E.A3.2 | A3 | Expected | Explores materials with all their senses. |
| COG-E.A4.1 | A4 | Expected | Asks questions about how and why things happen. |
| COG-E.A4.2 | A4 | Expected | Talks about their family and the people in their community. |
| COG-E.A5.1 | A5 | Expected | Makes a guess about what will happen and checks it. |
| COG-E.A5.2 | A5 | Expected | Talks about living things, the weather or the seasons with some detail. |
| COG-E.G1.1 | G1 | Expected | Asks a question about the world and suggests a way to find out. |
| COG-E.G1.2 | G1 | Expected | Keeps a simple record of what they notice and says what it shows. |

## A.5 Physical Development & Practical Life (`PPL`) — 32 milestones

*Strands: PPL-A Fine motor & hand control (O) · PPL-B Gross motor & coordination (O) · PPL-C Self-care & independence (O) · PPL-D Care of environment & tool use (O)*

| ID | Band | Expectation | Milestone statement |
|---|---|---|---|
| PPL-A.A3.1 | A3 | Expected | Uses a whole-hand or three-finger grip to hold a tool. |
| PPL-A.A3.2 | A3 | Expected | Threads large beads or uses tongs to move objects. |
| PPL-A.A4.1 | A4 | Expected | Holds a pencil comfortably between fingers and thumb. |
| PPL-A.A4.2 | A4 | Expected | Uses scissors to cut along a line. |
| PPL-A.A5.1 | A5 | Expected | Draws and writes with steady control. |
| PPL-A.A5.2 | A5 | Expected | Fastens buttons, zips and small catches. |
| PPL-A.G1.1 | G1 | Expected | Forms letters and numerals starting in the right place and moving in the right direction. |
| PPL-A.G1.2 | G1 | Expected | Uses scissors and other classroom tools accurately and safely. |
| PPL-B.A3.1 | A3 | Expected | Walks, runs and climbs with growing steadiness. |
| PPL-B.A3.2 | A3 | Expected | Carries a tray or a jug across the room without spilling. |
| PPL-B.A4.1 | A4 | Expected | Balances on one foot for a few seconds. |
| PPL-B.A4.2 | A4 | Expected | Moves carefully around others and around work on the floor. |
| PPL-B.A5.1 | A5 | Expected | Hops, skips and changes direction with control. |
| PPL-B.A5.2 | A5 | Expected | Carries and places heavy or awkward material safely. |
| PPL-B.G1.1 | G1 | Expected | Throws, catches or kicks with control in a game. |
| PPL-B.G1.2 | G1 | Expected | Puts movements together — hopping, skipping, jumping — and keeps their balance. |
| PPL-C.A3.1 | A3 | Expected | Washes and dries hands with a reminder. |
| PPL-C.A3.2 | A3 | Expected | Puts on shoes or a coat with some help. |
| PPL-C.A4.1 | A4 | Expected | Manages their own coat, shoes and bag. |
| PPL-C.A4.2 | A4 | Expected | Serves their own snack and clears it away. |
| PPL-C.A5.1 | A5 | Expected | Looks after their own belongings all day. |
| PPL-C.A5.2 | A5 | Expected | Notices what they need and gets it themselves. |
| PPL-C.G1.1 | G1 | Expected | Looks after their own belongings and personal care without an adult. |
| PPL-C.G1.2 | G1 | Expected | Gets themselves ready for what comes next without being told. |
| PPL-D.A3.1 | A3 | Expected | Helps put a material back on the shelf. |
| PPL-D.A3.2 | A3 | Expected | Wipes a spill when shown. |
| PPL-D.A4.1 | A4 | Expected | Returns work complete and ready for the next child. |
| PPL-D.A4.2 | A4 | Expected | Uses cloths, brushes and jugs for their proper purpose. |
| PPL-D.A5.1 | A5 | Expected | Takes care of the room without being asked. |
| PPL-D.A5.2 | A5 | Emerging edge | Shows another child how to care for a material. |
| PPL-D.G1.1 | G1 | Expected | Sets up what they need and clears it all away afterwards. |
| PPL-D.G1.2 | G1 | Expected | Keeps up a job for the classroom right across the week. |

## A.6 English (EFL track) (`EFL`) — 49 milestones

*Strands: E1 Receptive vocabulary (English) (D) · E2 Listening & instruction-following (English) (D) · E3 Phonological awareness (English) (D) · E4 Letter–sound knowledge (English) (D) · E5 Word reading / CVC (English) (D) · E6 Spoken production (English) (D)*

| ID | Band | Expectation | Milestone statement |
|---|---|---|---|
| E1.A3.1 | A3 | Expected | Points to a familiar English word they hear, from a small set of pictures. |
| E1.A3.2 | A3 | Expected | Knows the English names of everyday things from more than one topic. |
| E1.A4.1 | A4 | Expected | Recognises English words from several different topics taught in class. |
| E1.A4.2 | A4 | Expected | Chooses the right picture even when another one sounds similar. |
| E1.A5.1 | A5 | Expected | Recognises a wide set of taught English words, including describing words. |
| E1.A5.2 | A5 | Expected | Understands English words for position, number and time. |
| E1.G1.1 | G1 | Expected | Points to everyday classroom things named in English. |
| E1.G1.2 | G1 | Expected | Points to the picture for an English word about doing something or about where something is. |
| E2.A3.1 | A3 | Expected | Follows a one-step English instruction when it is shown as well as said. |
| E2.A3.2 | A3 | Emerging edge | Follows a one-step English instruction without being shown. |
| E2.A4.1 | A4 | Expected | Follows a one-step English instruction on their own. |
| E2.A4.2 | A4 | Emerging edge | Follows a two-step English instruction. |
| E2.A5.1 | A5 | Expected | Follows a two-step English instruction in the right order. |
| E2.A5.2 | A5 | Expected | Follows an English instruction that includes a position word. |
| E2.G1.1 | G1 | Expected | Follows a spoken English instruction with three parts. |
| E2.G1.2 | G1 | Expected | Follows an English instruction that says which part to do first. |
| E3.A3.1 | A3 | Expected | Hears when two familiar English words rhyme. |
| E3.A3.2 | A3 | Emerging edge | Finds an English rhyme even when the word is less familiar. |
| E3.A4.1 | A4 | Expected | Hears when two English words start with the same sound. |
| E3.A4.2 | A4 | Expected | Picks out the first sound of a short English word. |
| E3.A5.1 | A5 | Expected | Picks out the first sound of an English word on their own. |
| E3.A5.2 | A5 | Expected | Hears the last sound in a short English word. |
| E3.G1.1 | G1 | Expected | Hears the middle sound in a short English word. |
| E3.G1.2 | G1 | Expected | Blends English sounds said one at a time into a whole word. |
| E4.A3.1 | A3 | Emerging edge | Recognises one or two taught letter sounds in English. |
| E4.A3.2 | A3 | Extension | Says the sound for a taught English letter. |
| E4.A4.1 | A4 | Expected | Hears an English letter sound and finds the letter. |
| E4.A4.2 | A4 | Expected | Says the sound for taught English letters. |
| E4.A5.1 | A5 | Expected | Knows the sounds for the letters taught so far. |
| E4.A5.2 | A5 | Expected | Says letter sounds quickly and clearly. |
| E4.G1.1 | G1 | Expected | Finds the two letters that make a given English sound. |
| E4.G1.2 | G1 | Expected | Says the sound two letters make together. |
| E5.A3.1 | A3 | Extension | Reads a short taught English word and matches it to a picture. |
| E5.A3.2 | A3 | Extension | Blends the sounds of a short English word to read it. |
| E5.A4.1 | A4 | Emerging edge | Reads a short taught English word and finds the picture that matches. |
| E5.A4.2 | A4 | Extension | Reads more than one short English word made from taught letters. |
| E5.A5.1 | A5 | Expected | Reads short English words made from taught letters. |
| E5.A5.2 | A5 | Expected | Reads short English words quickly enough to keep the meaning. |
| E5.A5.3 | A5 | Extension | Reads an English word with a taught two-letter sound. |
| E5.G1.1 | G1 | Expected | Reads an English word containing a two-letter sound or a vowel team. |
| E5.G1.2 | G1 | Expected | Reads a short English sentence and shows they know what it says. |
| E6.A3.1 | A3 | Expected | Says their name in English when asked. |
| E6.A3.2 | A3 | Expected | Names a familiar object in English. |
| E6.A4.1 | A4 | Expected | Answers a simple question about themselves in English. |
| E6.A4.2 | A4 | Emerging edge | Answers a simple question about a picture in English. |
| E6.A5.1 | A5 | Expected | Answers a question about a picture in English. |
| E6.A5.2 | A5 | Expected | Says a short phrase in English that a listener can understand. |
| E6.G1.1 | G1 | Expected | Asks a simple question in English. |
| E6.G1.2 | G1 | Expected | Describes a picture in English in a short sentence. |

<!--PB-->

# Appendix B — ELOF and EYFS crosswalk

Every milestone in the three kindergarten bands carries a code pointing at a US Head Start ELOF goal and a UK EYFS area and band. **These are citations, not reproduced text** — no ELOF or EYFS wording appears in Montree Milestones. The table below collapses the 168 kindergarten milestone-level codes to strand level; the milestone-level codes are held in the item bank and are queryable per milestone.

**Scope.** This appendix covers `A3`, `A4` and `A5` only. **Montree Canopy (`G1`) has no row here by design** — ELOF is a birth-to-five framework and EYFS ends with Reception, so neither reaches this band; Canopy is crosswalked to the US Common Core Grade 1 standards and the UK National Curriculum Year 1 programmes of study instead, per milestone in the bank and described in Section 5.5.

The kindergarten bands use **41 distinct ELOF goal codes** and reference **all seven EYFS areas of learning**, including the Characteristics of Effective Teaching and Learning. Codes were re-verified against the published ELOF goal text at bank version 1.11.0; a code is only carried where the ELOF goal actually describes the construct the strand measures.

Two notes a reviewer will want before reading the table:

- **"Characteristics of Effective Teaching and Learning" is correct, with *Teaching*.** That is the wording of the DfE's own statutory EYFS framework (paragraphs 1.18 and 2.16). The variant "Characteristics of Effective Learning" is widespread in non-statutory sector guidance — *Birth to 5 Matters* uses it — and a reviewer who searches for it will find it; we cite the statutory text.
- **The EFL rows are a construct analogy, not an alignment claim.** EYFS assumes an English-medium setting and has no additional-language track at all, so the E1–E6 rows reuse the nearest core-domain ELG to say *what kind of thing is being measured*. The core-domain rows above them are formal alignment citations; the six EFL rows are not, and must never be presented as such.

| Domain | Strand | Method | ELOF goal codes | EYFS area | EYFS bands |
|---|---|---|---|---|---|
| Approaches to Learning & Self-Regulation | ATL-A Engagement & persistence | Observation | P-ATL 6, P-ATL 7 | Characteristics of Effective Teaching and Learning | 3-4, Reception |
| Approaches to Learning & Self-Regulation | ATL-B Initiative & choice-making | Observation | P-ATL 10, P-ATL 11 | Characteristics of Effective Teaching and Learning | 3-4, Reception |
| Approaches to Learning & Self-Regulation | ATL-C Flexible thinking & problem-solving | Observation | P-ATL 9, P-ATL 8 | Characteristics of Effective Teaching and Learning | 3-4, Reception |
| Approaches to Learning & Self-Regulation | ATL-D Self-regulation & impulse control | Observation | P-ATL 4, P-ATL 5 | Personal, Social and Emotional Development | 3-4, Reception |
| Social & Emotional Development | SED-A Relationships with adults | Observation | P-SE 1 | Personal, Social and Emotional Development | 3-4, Reception |
| Social & Emotional Development | SED-B Peer interaction & cooperation | Observation | P-SE 3, P-SE 4, P-SE 5 | Personal, Social and Emotional Development | 3-4, Reception |
| Social & Emotional Development | SED-C Emotional knowledge & expression | Observation | P-SE 6, P-SE 7 | Personal, Social and Emotional Development | 3-4, Reception |
| Social & Emotional Development | SED-D Grace, courtesy & community | Observation | P-SE 11, P-SE 2 | Personal, Social and Emotional Development | 3-4, Reception |
| Language, Communication & Literacy | LCL-A Receptive language & listening | Direct | P-LC 1, P-LC 2 | Communication and Language | 3-4, Reception |
| Language, Communication & Literacy | LCL-B Expressive language & vocabulary | Direct | P-LC 5, P-LC 6 | Communication and Language | 3-4, Reception |
| Language, Communication & Literacy | LCL-C Phonological awareness **[English-medium]** | Direct | P-LIT 1 | Literacy | 3-4, Reception |
| Language, Communication & Literacy | LCL-D Print & alphabet knowledge **[English-medium]** | Direct | P-LIT 2, P-LIT 3 | Literacy | 3-4, Reception |
| Language, Communication & Literacy | LCL-E Emergent writing | Observation | P-LIT 6 | Literacy | 3-4, Reception |
| Cognition: Mathematics & Exploration | COG-A Number sense & counting | Direct | P-MATH 1, P-MATH 2 | Mathematics | 3-4, Reception |
| Cognition: Mathematics & Exploration | COG-B Quantity, comparison & early operations | Direct | P-MATH 4, P-MATH 5, P-MATH 6 | Mathematics | 3-4, Reception |
| Cognition: Mathematics & Exploration | COG-C Shape, space & pattern | Direct | P-MATH 10, P-MATH 7, P-MATH 9 | Mathematics | 3-4, Reception |
| Cognition: Mathematics & Exploration | COG-D Measurement, sorting & classification | Direct | P-MATH 8, P-SCI 3 | Mathematics — *Numerical Patterns* † | 3-4, Reception |
| Cognition: Mathematics & Exploration | COG-E Scientific & world exploration | Observation | P-SCI 1, P-SCI 4 | Understanding the World | 3-4, Reception |
| Physical Development & Practical Life | PPL-A Fine motor & hand control | Observation | P-PMP 3 | Physical Development | 3-4, Reception |
| Physical Development & Practical Life | PPL-B Gross motor & coordination | Observation | P-PMP 1, P-PMP 2 | Physical Development | 3-4, Reception |
| Physical Development & Practical Life | PPL-C Self-care & independence | Observation | P-PMP 4 | Personal, Social and Emotional Development | 3-4, Reception |
| Physical Development & Practical Life | PPL-D Care of environment & tool use | Observation | P-ATL 3, P-PMP 3 | Physical Development | 3-4, Reception |
| English (EFL track) | E1 Receptive vocabulary (English) | Direct | P-LC 6 | Communication and Language | 3-4, Reception |
| English (EFL track) | E2 Listening & instruction-following (English) | Direct | P-LC 1, P-LC 2 | Communication and Language | 3-4, Reception |
| English (EFL track) | E3 Phonological awareness (English) | Direct | P-LIT 1 | Literacy | 3-4, Reception |
| English (EFL track) | E4 Letter–sound knowledge (English) | Direct | P-LIT 3 | Literacy | 3-4, Reception |
| English (EFL track) | E5 Word reading / CVC (English) | Direct | P-LIT 3 | Literacy | 3-4, Reception |
| English (EFL track) | E6 Spoken production (English) | Direct | P-LC 5 | Communication and Language | 3-4, Reception |

† **COG-D's ELG is a labelled best fit.** Since the 2021 EYFS reform there is no standalone Early Learning Goal for measurement, sorting or classification; that content was folded into *Numerical Patterns*. We cite it and say so, rather than leaving the cell blank.

**Attribution.** US Department of Health and Human Services, Office of Head Start — *Head Start Early Learning Outcomes Framework: Ages Birth to Five* (public domain). UK Department for Education — *Early Years Foundation Stage Statutory Framework* and *Development Matters*, © Crown copyright, Open Government Licence v3.0.

<!--PB-->

# Appendix C — China MoE 3–6 Guide crosswalk

The PRC Ministry of Education's *3–6岁儿童学习与发展指南* (2012) organises early development into five 领域 across three age stages. It is issued by the Ministry as observational reference guidance and **explicitly not as an evaluative standard** (不是评价标准). The crosswalk below exists for local legibility in the China market. **It is not, and must never be presented as, MoE endorsement.**

**Coverage: 120 of the 168 kindergarten milestones carry a MoE code.** The 48 that do not are the 36 EFL milestones and the 12 English-medium core literacy milestones (LCL-C, LCL-D) — see C.1. **None of the 56 Montree Canopy milestones carries one**, and that is deliberate: the Guide is 《3–6岁儿童学习与发展指南》 and stops at six, so a Canopy code would be an invented citation (Section 5.5).

## C.1 Domain-level mapping

| Montree Milestones domain | China MoE 领域 | Notes |
|---|---|---|
| Approaches to Learning & Self-Regulation (ATL) | 说明·学习品质 | The MoE Guide treats 学习品质 (learning qualities) in its explanatory 说明 section rather than as a sixth 领域; our ATL milestones map there. |
| Social & Emotional Development (SED) | 社会 | 人际交往 and 社会适应 both map here. |
| Language, Communication & Literacy (LCL) | 语言 — **partial** | LCL-A, LCL-B and LCL-E map to 倾听与表达 and 阅读与书写准备. **LCL-C and LCL-D carry no MoE code**: they are English-medium (Section 5.4), and 阅读与书写准备 describes readiness for Chinese literacy, which English rhyme, English letters and English word reading do not evidence. In a Chinese-medium classroom those two strands are left unassessed. |
| Cognition: Mathematics & Exploration (COG) | 科学 | 科学探究 and 数学认知. |
| Physical Development & Practical Life (PPL) | 健康 | 身心状况, 动作发展, 生活习惯与生活能力. |
| English (EFL track) | — **no mapping** | The MoE Guide contains no foreign-language 领域. The 36 EFL milestones deliberately carry no MoE code; inventing one would misrepresent the source document. |
| — | 艺术 | The MoE 艺术 领域 (感受与欣赏, 表现与创造) is **not** covered by Montree Milestones v1.1. This is a stated gap, not an omission by oversight. |

## C.2 Age-stage mapping

| Montree band | Age | China MoE 年龄段 |
|---|---|---|
| A3 | 3;0–3;11 | 3–4岁 |
| A4 | 4;0–4;11 | 4–5岁 |
| A5 | 5;0–5;11 | 5–6岁 |

## C.3 Strand-level 目标 references

| Strand | China MoE 目标 codes referenced |
|---|---|
| ATL-A Engagement & persistence | 说明.学习品质.专注与坚持 |
| ATL-B Initiative & choice-making | 说明.学习品质.主动性 |
| ATL-C Flexible thinking & problem-solving | 科学.科学探究.目标1 |
| ATL-D Self-regulation & impulse control | 社会.社会适应.目标1 |
| SED-A Relationships with adults | 社会.人际交往.目标1 |
| SED-B Peer interaction & cooperation | 社会.人际交往.目标2 |
| SED-C Emotional knowledge & expression | 健康.身心状况.目标2 |
| SED-D Grace, courtesy & community | 社会.社会适应.目标3 |
| LCL-A Receptive language & listening | 语言.倾听与表达.目标1 |
| LCL-B Expressive language & vocabulary | 语言.倾听与表达.目标2 |
| LCL-C Phonological awareness | — none (English-medium strand; see C.1) |
| LCL-D Print & alphabet knowledge | — none (English-medium strand; see C.1) |
| LCL-E Emergent writing | 语言.阅读与书写准备.目标3 |
| COG-A Number sense & counting | 科学.数学认知.目标2 |
| COG-B Quantity, comparison & early operations | 科学.数学认知.目标2 |
| COG-C Shape, space & pattern | 科学.数学认知.目标3 |
| COG-D Measurement, sorting & classification | 科学.数学认知.目标1 |
| COG-E Scientific & world exploration | 科学.科学探究.目标2 |
| PPL-A Fine motor & hand control | 健康.动作发展.目标2 |
| PPL-B Gross motor & coordination | 健康.动作发展.目标1 |
| PPL-C Self-care & independence | 健康.生活习惯与生活能力.目标2 |
| PPL-D Care of environment & tool use | 健康.生活习惯与生活能力.目标3 |
| E1 Receptive vocabulary (English) | — none (EFL track; see C.1) |
| E2 Listening & instruction-following (English) | — none (EFL track; see C.1) |
| E3 Phonological awareness (English) | — none (EFL track; see C.1) |
| E4 Letter–sound knowledge (English) | — none (EFL track; see C.1) |
| E5 Word reading / CVC (English) | — none (EFL track; see C.1) |
| E6 Spoken production (English) | — none (EFL track; see C.1) |

**Attribution.** 中华人民共和国教育部 — 《3–6岁儿童学习与发展指南》 (2012). Cited as a curriculum reference for the China market. Not an evaluative standard; not an endorsement.


<!--PB-->

# Appendix D — Administration script

This is the script the teacher follows. It is identical on tablet and on paper, save for the one line per item type flagged **[paper]**. The tablet application prints it; the paper pack prints it; the item bank holds it. There is no other version.

## D.1 Before the sitting

1. Choose a quiet space. Not the open work floor, not a corridor, not a room where another child is waiting and watching.
2. Have the child's age in months to hand — the band is computed from it.
3. Select the modules for this sitting. Three is the maximum. Fewer is often better in the Autumn window.
4. Check the sound if you are using the tablet. If the narration does not work, that is fine — the script below is what the narration says, and you read it instead.
5. Do not tell the child they are going to be tested, checked, or assessed. The invitation is: *"Would you like to come and play some games with me?"*

## D.2 Opening — say this

> "Thank you for coming to play with me. I have some games here. Some of them are easy and some of them are tricky, and that is exactly how they are meant to be. You do not have to get them right. If you do not know one, we just go to the next one. Shall we start?"

Nothing in that paragraph is decoration. It removes the performance frame before the child can construct one.

## D.3 Practice — two items per module

Practice items are unscored, and **practice is the only place feedback is allowed.**

- If the child is correct: *"That's the one. Well done."*
- If the child is incorrect: *"Let's try that one together."* Show the correct answer, explain briefly, and re-show the item once.
- If the child is correct on the second try, continue normally. If not, continue anyway. Practice failure is not a stopping condition.

## D.4 Scored items — the rules while you are in them

- Read the prompt exactly as written. Do not rephrase, simplify, add an example, or point.
- Repeat once if the child asks, or if they clearly did not hear. Not twice.
- **Wait.** There is no time limit and no timer. Children under four commonly take up to five seconds to commit to a touch.
- Give **no** indication of correctness. Not a nod, not "good," not "hmm," not a repeat of the question in a different tone. The neutral acknowledgement is a soft tone and a gentle highlight, and it is identical whatever the child chose.
- If the child gives a clear response and then changes it, take the second response.
- If the child does not respond at all, wait, offer the repeat, then move on and record it as no response.
- You may pause or end the sitting at any moment. A partial sitting is valid data.

## D.5 The four item types

**Tap-choice.** *"Tap the picture that shows it."* Four pictures; the child touches one.
**[paper]** The child points; you circle the box on the scoring sheet.

**Listen-and-do.** *"Touch the box, then the ball."* The child touches in sequence. Full credit only when the whole sequence is in the given order.
**[paper]** The child points in order; you number the boxes 1, 2 on the sheet.

**Teacher-scored oral.** *"Tell me about this picture."* Give the child time. **Do not model the answer.** Score 0, 1 or 2 against the rubric printed beside the item.
**[paper]** Identical — the child speaks, you score 0/1/2 on the sheet.

**Observation checklist.** Not administered in a sitting at all. See D.7.

## D.6 Closing — say this, to every child, always

> "Thank you for playing with me today."

The closing is the same after a sitting where everything was correct and after a sitting where almost nothing was. This is not a kindness at the expense of accuracy; a child who leaves the room having worked out that the ending changes will approach the next window differently, and the data will get worse.

## D.7 The observation checklist

Rated across the whole window, from the ordinary work cycle. Never in the sitting, and never as a contrived task.

Twenty-eight milestones per age band, each carrying three written descriptors. For each, choose the band that is the **best fit** for the child's overall pattern — this is an EYFS-style holistic judgement, not a tally, and a child with an uneven profile is normal rather than a problem.

**Leave a milestone unrated rather than guessing.** An unrated milestone is reported as unassessed and excluded from every denominator. A guessed one silently corrupts a figure a parent will read.

Optionally attach an evidence note (up to 300 characters) and a linked classroom photograph. These appear in the Growth Story and are frequently the part a parent remembers.

## D.8 Stop rules — what you do not have to do

The system stops a strand after three consecutive incorrect responses, and a module after five. You do not need to track this; it happens on its own, and on paper it is printed at the relevant point on the scoring sheet.

You may also stop earlier, at your own judgement, for any reason. If a child is tired, distressed, distracted or simply finished, stop. Nothing about ending a sitting early damages the record — it reduces coverage, which is reported, which is the correct outcome.

## D.9 Forms on paper

Both forms exist on paper: six packs, one per age band per form. Use the form the window calls for — **Form A in Autumn, Form B in Winter, Form A in Spring** — and record the sitting under the form you actually administered. Never substitute Form A for Form B in the Winter window; the alternate-form design is the only thing separating genuine growth from item familiarity.

## D.10 Transferring paper results

The scoring sheet ends with a transfer block: the per-strand subtotals and milestone bands to be entered into Montree. Enter the item responses, not the bands you calculated yourself — the server re-scores from the item bank and will compute the bands. Your own calculations are a useful check, not the record.

<!--PB-->

# Appendix E — References

## E.1 Frameworks and their licences

- **US Department of Health and Human Services, Office of Head Start.** *Head Start Early Learning Outcomes Framework: Ages Birth to Five.* Public domain. https://headstart.gov/school-readiness/article/head-start-early-learning-outcomes-framework · https://headstart.gov/sites/default/files/pdf/elof-ohs-framework.pdf
- **UK Department for Education.** *Statutory Framework for the Early Years Foundation Stage.* © Crown copyright, Open Government Licence v3.0. https://www.gov.uk/government/publications/early-years-foundation-stage-framework--2
- **UK Department for Education.** *Development Matters: Non-statutory curriculum guidance for the early years foundation stage* (Sept 2023). © Crown copyright, OGL v3.0. https://assets.publishing.service.gov.uk/media/64e6002a20ae890014f26cbc/DfE_Development_Matters_Report_Sep2023.pdf
- **UK Standards and Testing Agency.** *Early Years Foundation Stage Profile Handbook, 2024/25.* https://gov.gg/CHttpHandler.ashx?id=183173&p=0
- **Foundation Years / DfE.** *What to Expect in the Early Years Foundation Stage: a guide for parents.* https://foundationyears.org.uk/files/2021/09/What-to-expect-in-the-EYFS-complete-FINAL-16.09-compressed.pdf
- **中华人民共和国教育部 (PRC Ministry of Education).** 《3–6岁儿童学习与发展指南》 (2012). Reference guidance, explicitly not an evaluative standard. http://www.moe.gov.cn/jyb_xwfb/s271/201210/t20121015_143257.html

## E.2 Cited for domain validity only (no content reused, no alignment claimed)

- **Save the Children — IDELA (International Development and Early Learning Assessment).** Open-access instrument (MOU). https://idela-network.org/the-idela-tool/ · Technical working paper: https://idela-network.org/wp-content/uploads/2017/06/IDELA-technical-working-paper_Q4-2015.pdf
- **OECD — International Early Learning and Child Well-being Study (IELS).** https://www.oecd.org/en/about/projects/international-early-learning-and-child-well-being-study.html · Assessment framework: https://www.oecd.org/content/dam/oecd/en/publications/reports/2021/02/international-early-learning-and-child-well-being-study-assessment-framework_489c49a5/af403e1e-en.pdf · US pilot summary: https://nces.ed.gov/surveys/iels/pilot_summary.asp
- **Moss, P. & Urban, M. (2020).** *The Organisation for Economic Co-operation and Development's International Early Learning and Child Well-being Study: The scores are in!* Contemporary Issues in Early Childhood. https://journals.sagepub.com/doi/10.1177/1463949120929466 — cited as the critical counterweight to over-leaning on OECD framing.

## E.3 Montessori outcome evidence

- **Lillard, A. & Else-Quest, N. (2006).** Evaluating Montessori Education. *Science*, 313(5795), 1893–1894. https://www.montessori-science.org/Science_Evaluating_Montessori_Education_Lillard_.pdf · https://files.eric.ed.gov/fulltext/ED622858.pdf
- **Lillard, A. S., Heise, M. J., Richey, E. M., Tong, X., Hart, A. & Bray, P. M. (2017).** Montessori Preschool Elevates and Equalizes Child Outcomes: A Longitudinal Study. *Frontiers in Psychology*, 8:1783. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.01783/full · https://pmc.ncbi.nlm.nih.gov/articles/PMC5670361
- **Randolph, J. J., Bryson, A., Menon, L., Henderson, D. K., Manuel, A., Michaels, S., Rosenstein, D., McPherson, W., O'Grady, R. & Lillard, A. S. (2023).** Montessori education's impact on academic and nonacademic outcomes: A systematic review. *Campbell Systematic Reviews*, 19(3). https://onlinelibrary.wiley.com/doi/full/10.1002/cl2.1330 · Plain-language summary: https://www.campbellcollaboration.org/2023/08/does-montessori-work/
- **A national randomized controlled trial of the impact of public Montessori preschool at the end of kindergarten (2025).** *PNAS*. https://www.pnas.org/doi/10.1073/pnas.2506130122 · https://pmc.ncbi.nlm.nih.gov/articles/PMC12582262/ · Summary: https://www.air.org/resource/journal-article/national-randomized-controlled-trial-impact-public-montessori-preschool
- **Courtier, P. et al. (2021).** Effects of Montessori education on the academic, cognitive, and social development of disadvantaged preschoolers: A randomized controlled study in the French public-school system. https://pmc.ncbi.nlm.nih.gov/articles/PMC8518750/
- **Denervaud, S. et al. (2019).** Beyond executive functions, creativity skills benefit academic outcomes: Insights from Montessori education. *PLOS ONE*. https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0225319
- **American Montessori Society.** *Overview of Research on Montessori Education.* https://amshq.org/wp-content/uploads/2025/01/Overview-of-Research-on-ME.pdf
- **National Center for Montessori in the Public Sector.** *Outcomes, Studies and Findings.* https://www.public-montessori.org/montessori/outcomes-studies-findings/

## E.4 Montessori assessment philosophy

- **Association Montessori Internationale.** *Assessing Student Progress.* https://montessori-ami.org/questions/assessing-student-progress
- **Montessori Foundation.** *Testing in Montessori.* https://www.montessori.org/testing-in-montessori/
- **Forest Bluff School.** *Assessment and Evaluation the Montessori Way.* https://www.forestbluffschool.org/montessori-assessment-and-evaluation
- **American Montessori Society.** *Assessment Practices Used by Montessori Teachers of Kindergarten.* https://amshq.org/wp-content/uploads/2019/01/assessment-practices-used-by-montessori-teachers.pdf
- **National Center for Montessori in the Public Sector.** *Montessori Curriculum to Standards Alignment (MCSA)* and assessment tools. https://www.public-montessori.org/the-montessori-curriculum-to-standards-alignment-mcsa/ · https://www.public-montessori.org/tools/

## E.5 Assessment design for ages 3–5

- **Howard, S. J. & Melhuish, E. (2017).** An Early Years Toolbox for Assessing Early Executive Function, Language, Self-Regulation, and Social Development: Validity, Reliability, and Preliminary Norms. *Journal of Psychoeducational Assessment*. https://www.eytoolbox.com.au/resources/documents/An-early-years-toolbox-for-assessing-early-executive-function-la.pdf · https://pmc.ncbi.nlm.nih.gov/articles/PMC5424850/
- **NIESR.** *Early Years Toolbox Pilot Report.* https://www.niesr.ac.uk/publications/early-years-toolbox-pilot-report
- **A Novel Approach to Measure Executive Functions in Students: An Evaluation of Two Child-Friendly Apps (eFun vs EYT) (2020).** *Frontiers in Psychology.* https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.01702/full
- **Can Touch Screen Tablets be Used to Assess Cognitive and Motor Skills in Early Years Primary School Children? A Cross-Cultural Study (2016).** *Frontiers in Psychology.* https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2016.01666/full
- **Vatavu, R.-D., Cramariuc, G. & Schipor, D. M. (2015).** Touch interaction for children aged 3 to 6 years: Experimental findings and relationship to motor skills. *International Journal of Human-Computer Studies.* https://mintviz.usv.ro/publications/ijhcs2015.pdf
- **Nielsen Norman Group.** *Design for Kids Based on Their Stage of Physical Development.* https://www.nngroup.com/articles/children-ux-physical-development/
- **Tablets instead of paper-based tests for young children? Comparability between paper and tablet versions of the Heidelberger Rechen Test 1-4 (2018).** *Educational Assessment.* https://www.tandfonline.com/doi/full/10.1080/10627197.2018.1488587
- **Teaching Strategies.** *GOLD* product documentation and technical manual. https://teachingstrategies.com/product/gold/ · https://teachingstrategies.com/wp-content/uploads/2021/08/2020-Tech-Manual_GOLD.pdf
- **Psychology Today.** *Motivating Children Without Rewards* — summarizing the extrinsic-reward / intrinsic-motivation literature. https://www.psychologytoday.com/us/blog/the-baby-scientist/201806/motivating-children-without-rewards

## E.6 EFL assessment for young learners

- **The Assessment of Chinese Children's English Vocabulary — A Culturally Appropriate Receptive Vocabulary Test (ACCE-V) (2022).** *Frontiers in Psychology.* https://www.frontiersin.org/articles/10.3389/fpsyg.2022.769415/full · https://pmc.ncbi.nlm.nih.gov/articles/PMC8980544/ — source of the four-picture distractor design and the 18-category coverage taxonomy.
- **McElwee, S., Devine, K. & Saville, N. (2019).** Introducing CEFR pre-A1 descriptors for language instruction and assessment: consequences, opportunities and responsibilities. https://dgff.de/assets/Uploads/ZFF-2-2019-05-McElwee-Devine-Saville.pdf
- **Trinity College London.** *Graded Examinations in Spoken English (GESE)* — Initial Stage / Grade 1 guidance. https://www.trinitycollege.com/qualifications/english-language/GESE/discover-GESE · https://www.trinitycollege.com/resource?id=5650 — cited as a register reference for E6 only; no grade alignment is claimed.
- **Cambridge Assessment English.** *Pre A1 Starters Word List Picture Book (2018).* © UCLES 2018. https://www.cambridgeenglish.org/Images/396158-yle-starters-word-list-picture-book-2018.pdf — **not reused**; noted here as a copyrighted list deliberately excluded from the bank.
- **Oxford University Press.** *The Oxford 3000 by CEFR level.* © Oxford University Press. https://www.oxfordlearnersdictionaries.com/external/pdf/wordlists/oxford-3000-5000/The_Oxford_3000_by_CEFR_level.pdf — **not reused**, same reason.
- **Open Language Profiles — CEFR-J wordlist (olp-en-cefrj).** Open dataset. https://github.com/openlanguageprofiles/olp-en-cefrj
- **Pearson.** *Peabody Picture Vocabulary Test, Fifth Edition (PPVT-5).* https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Academic-Learning/Peabody-Picture-Vocabulary-Test-|-Fifth-Edition/p/100001984 — format precedent for picture-pointing receptive vocabulary; not administered and not claimed.
- **Total Physical Response (TPR): How is it used to Teach EFL Young Learners?** *IJLTER.* https://www.ijlter.org/index.php/ijlter/article/view/1335
- **Preschool English language provision in China under the government ban.** *Cogent Education.* https://www.tandfonline.com/doi/full/10.1080/2331186X.2022.2152257

## E.7 Impact measurement and funder reporting practice

- **Sopact.** *Attribution vs Contribution in Impact Measurement.* https://www.sopact.com/use-case/attribution-vs-contribution
- **Plinth.** *Common Pitfalls in Measuring Impact.* https://www.plinth.org.uk/complete-guide/common-pitfalls-in-measuring-impact
- **The Bridgespan Group.** *A Practical Guide to Nonprofit Measurement, Evaluation, and Learning.* https://www.bridgespan.org/insights/nonprofit-organizational-effectiveness/a-practical-guide-to-nonprofit-measurement-evaluation-and-learning
- **Rockefeller Philanthropy Advisors.** *Assessing Impact.* https://www.rockpa.org/guide/assessing-impact/

## E.8 Comparable and competing systems (surveyed, not used as content sources)

- Transparent Classroom — https://www.transparentclassroom.com/
- Montessori Compass, including Common Core mapping — https://www.montessoricompass.com/ · https://www.montessoricompass.com/common-core-state-standards-mapping/
- Teaching Strategies Finch (game-based assessment) — https://teachingstrategies.com/product/game-based-assessment-solution/
- Ages & Stages Questionnaires, Third Edition (ASQ-3), Brookes Publishing — https://brookespublishing.com/product/asq-3/ — commercial screening instrument; not used.

---

<!--PB-->

# Appendix F — Changelog

**Version 1.2 · item bank 1.11.0 · August 2026**

- **Montree Canopy added** — a fourth band, `G1`, for children of about six to seven: 56 new milestones (28 direct, 28 teacher-observed), 114 new direct item records, 28 new observation records, 107 new stimulus records, and its own paper packs (`pack_G1_A`, `pack_G1_B`), built from the same bank by the same generator as every other pack. New Section 5.5 sets out what it is, what it measures, what it is anchored to, and what it deliberately does not change.
- **A new crosswalk basis at `G1`** — ELOF, EYFS and the China MoE 3–6 Guide all stop below this band, so Canopy milestones carry those three fields as explicit empties and cite the **US Common Core Grade 1** standards (`ccss`) and the **UK National Curriculum Year 1 / Key Stage 1** programmes of study (`ukNc`) instead, with `otherAnchor` naming the non-statutory framework on strands Common Core does not cover.
- **"Exceeded" is now reachable at A5** — six `A5` milestones gained `extension` status with their evidence in `G1`. Nothing else about `A3`, `A4` or `A5` changed.
- **Language-of-assessment policy stated and enforced** (Section 5.4) — LCL-C and LCL-D are no longer scheduled at all under a non-English assessment locale, and report as `unassessed` with the reason code `locale_not_supported`, rather than being administered in translation.
- **Three crosswalk corrections**, verified against primary framework text:
  - `ATL-B` ELOF `P-ATL 11, P-ATL 12` → **`P-ATL 10, P-ATL 11`**. P-ATL 10 is the goal titled "demonstrates initiative and independence", which is what the strand measures; P-ATL 12 is creativity and did not belong.
  - `ATL-C` ELOF `P-ATL 9, P-ATL 10` → **`P-ATL 9, P-ATL 8`**. P-ATL 10 belongs to ATL-B — this was a transposition. P-ATL 8, holding information in mind and manipulating it, is the goal adjacent to reasoning about a problem.
  - `COG-D` EYFS ELG `null` → **`Numerical Patterns`**, labelled as a best fit: since the 2021 EYFS reform there is no standalone ELG for measurement, sorting or classification, and that content sits inside Numerical Patterns. A labelled best fit is more useful to a reviewer than a blank cell.
- **A terminology note, so a reviewer does not mistake a correct citation for an error.** The EYFS area string this bank uses is **"Characteristics of Effective Teaching and Learning"**, with *Teaching*. That is the wording of the DfE's own statutory framework (paragraphs 1.18 and 2.16). "Characteristics of Effective Learning", without *Teaching*, is widespread in sector guidance and practitioner material — *Birth to 5 Matters* uses it — but the statutory text is the higher-authority citation and is what we carry. This was checked, and deliberately not changed.
- **The kindergarten packs are slightly longer.** Each pack prints the *other* bands' observation descriptors as a reference section, so A3, A4 and A5 packs now carry Canopy's 28 descriptors too — the ladder a teacher is looking at when a child is near the top of their band. Nothing tickable changed on those packs.
- **The summary sheet no longer offers "exceeded" at the top band.** A Canopy pack says plainly that there is no band above it, instead of printing "a further 0 belong to the next age band".
- **Bank version and checksum are no longer hard-copied into prose.** Section 7.5 points at `BANK_CHECKSUM.txt`, which is generated, rather than repeating a hash that goes stale the moment the bank moves.

**Version 1.1 · item bank 1.1.0 · August 2026** — first published methodology document: three kindergarten bands, 168 milestones, 426 item records.

---

*Montree Milestones — Methodology & Framework, version 1.2. Item bank 1.11.0; the canonical checksum for that version is recorded in `evaluation-kit/item-bank/BANK_CHECKSUM.txt` and on every session row. All milestone wording is original. Framework codes are citations, not reproduced text.*

---

*2026-08-26: accuracy pass — synthetic examples labeled, paper-pack status corrected. The worked examples in §8.3, §10 and §14 are now marked as specimens built from invented figures; §15.1 no longer describes a standalone EFL booklet, which does not exist. Companion documents added: `EVIDENCE_STATUS.md`, `CUT_SCORE_PANEL_PROTOCOL.md`, `BANK_AUDIT_2026-08.md`.*

*2026-08-26: `D1_Montree_Milestones_Framework.docx` regenerated from this file. The previous .docx dated from 2026-08-03 and predated the Canopy/G1 tier entirely — it described the instrument as covering ages 3–5 and carried none of the current counts. No generator script for it existed in the repo; it is now built with pandoc, which is the documented path from here on:*

```bash
pandoc docs/evaluation/D1_framework.md -f gfm -t docx --toc --toc-depth=2   --metadata title="Montree Milestones — Methodology & Framework"   --metadata author="Montree"   -o docs/evaluation/D1_Montree_Milestones_Framework.docx
```

*Rebuild it whenever this file changes; a .docx that lags the markdown is the exact failure this pass exists to remove.*
