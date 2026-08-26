# Cut-Score Panel Protocol — modified Angoff, one day, remote-friendly

**Version 1.0 · 2026-08-26 · applies to bank `1.11.0` and later**
**Audience:** internal. Technical register (*cut score*, *standard setting*, *borderline child*) is
used throughout and must not leak into any parent- or teacher-facing surface.
**Purpose:** replace the conventional `secure ≥ 0.80` / `developing ≥ 0.40` thresholds with
expert-derived ones, produced by a documented, repeatable procedure that a funder or an auditor can
inspect.

---

## 0. Why this exists, and what it can and cannot fix

The two thresholds that turn a proportion of items into a band are, today, conventional values. They
were chosen because 0.80 and 0.40 are what people choose. `EVIDENCE_STATUS.md` §2.1 says so publicly.
A single day with six to eight experienced guides converts that from an admission into a method.

**What this panel can settle:** where the boundaries between emerging, developing and secure belong,
in the judgement of people who teach these children; whether one global pair of cuts is defensible or
whether some strands need their own; and whether the current values survive contact with expertise.

**What it cannot settle:** whether the items work. That is Study 1 in `EVIDENCE_STATUS.md` §3 and
needs a field sample. A panel judges items as written; it cannot tell you that item 3 is confusing
until a hundred children have met it. Run the panel anyway — the cuts are needed before the pilot
reports anything, and the panel's item-level notes are a useful sanity check on the bank besides.

**The finding the panel must be shown first.** `BANK_AUDIT_2026-08.md` establishes that no direct
milestone carries more than four items on a form, so a 0.80 cut currently behaves as a demand for a
flawless run, and 41 milestones carry a single item, where `developing` is arithmetically
unreachable. The panel's first substantive question is therefore not "is 0.80 right?" but "what
should `secure` require, given that a milestone is decided by one to four observations?" Hiding this
from the panel would produce a number that looks derived and is not.

---

## 1. The panel

### 1.1 Composition

Six to eight panelists. Below six, one strong voice dominates the second round; above eight, a
one-day remote schedule stops working.

**Required of every panelist:**

- an AMI, AMS or equivalently recognised Montessori qualification for the 3–6 age range (at least
  one panelist should additionally hold a 6–12 qualification, for the Canopy band);
- **at least five years** of lead-guide classroom experience with children in the relevant age range;
- current or very recent classroom practice — someone who has not been in a classroom for five years
  is judging a memory;
- no financial interest in Montree, and no line-management relationship to anyone else on the panel.

**Required of the panel as a whole:**

- **at least two panelists from each market** the bank ships in (English-medium and Chinese-medium),
  because a cut on an English-medium literacy strand set by guides who have never taught EFL learners
  is not a cut anyone should trust;
- a spread of settings — at minimum one fee-paying, one nonprofit or public;
- at least one panelist who was **not** involved in authoring the milestones or the items.

**Excluded:** anyone who wrote items in the bank may attend as an observer and answer questions of
fact, but does not make judgements and does not sit in the discussion rounds.

### 1.2 Roles on the day

| Role | Who | Does |
|---|---|---|
| **Facilitator** | Not a panelist; ideally not a Montree employee | Runs the clock, reads the scripts, enforces the rule that round-1 judgements are made silently and alone |
| **Recorder** | Montree staff | Keeps the minute (§7), captures every item-level comment verbatim, does no judging |
| **Content expert** | Bank author | Answers questions of fact about what an item asks. Says "that is a judgement for you" to everything else |
| **Panelists** | 6–8, per §1.1 | Judge |

Pay panelists. An honorarium at a normal consultancy day rate, paid regardless of what they conclude,
is both fair and the cheapest possible protection against the appearance that the outcome was steered.

---

## 2. Pre-work (sent 7 days ahead, ~90 minutes)

Each panelist receives, by email:

1. **The one-page instrument summary** — what Montree Milestones is, what it is for, and the four
   things it is explicitly not for (`EVIDENCE_STATUS.md` §1). Not the marketing deck.
2. **The band definitions** — the three bands with the exact wording the system uses, and a plain
   statement that the panel's job is to place the boundaries between them.
3. **The milestone sample they will judge** (§3), with, for every milestone: its statement in both
   languages, its `expectation` tag (`expected` / `emerging_edge` / `extension`), and the **full text
   of every item that evidences it**, exactly as a child would meet it — including the stimulus art.
   Generate this from the paper packs; do not paraphrase.
4. **A one-page note on the item-count constraint** — the reachable-ratio table from
   `BANK_AUDIT_2026-08.md` §A.3, which shows what a milestone with n items can and cannot express.
5. **A pre-work task, submitted before the day:** in their own words, in no more than 150 words per
   band, describe a child who is *just barely* secure on the milestones at that band. This is the raw
   material for §4 and it must arrive before the panel meets, so that the definitions are not
   improvised in the room under time pressure.

Panelists are asked **not** to confer during pre-work. Say why: the value of round 1 is that it is
independent, and pre-panel agreement destroys it.

---

## 3. Sampling — what actually gets judged

The bank holds 424 scored direct items. Nobody judges 424 items in a day.

**The sample: Form A only, one milestone sample stratified across every direct strand and every
band.** Concretely: for each of the 14 direct strands (LCL-A…D, COG-A…D, E1…E6), take **one
milestone at each band** where one exists — approximately 40–48 milestones, carrying roughly 100–130
items. At three to four judgements per minute this is about two and a half hours of round-1 work,
which fits a day with rounds, breaks and discussion.

Deliberate choices in that sample:

- **Form A only.** Judging both forms would halve the coverage for no gain, because the forms are
  content-matched and the panel is setting a cut on the *scale*, not comparing forms. Form equivalence
  is a separate study (`EVIDENCE_STATUS.md` §3, Study 3).
- **Include the thin milestones on purpose.** At least eight of the sampled milestones must be
  one-item milestones from the `BANK_AUDIT_2026-08.md` §B list. The panel needs to meet the problem,
  not be protected from it.
- **Include both `expected` and `extension` milestones**, so the panel can say whether the cut should
  differ by expectation tag.

**Observation strands are not Angoff-rated.** The 112 observation milestones are a direct band
judgement against three written descriptors; there is no proportion to set a cut on. They get the
separate exercise in §6.4 instead — a descriptor-anchoring pass — and their real evidence question is
inter-rater reliability, not standard setting.

---

## 4. The day — schedule

Remote, one day, times in the panel's shared working window. Six hours of contact time.

| # | Block | Minutes |
|---|---|---|
| 1 | Orientation (§5) | 30 |
| 2 | Borderline-child definition, all bands (§4.1) | 60 |
| — | Break | 15 |
| 3 | Practice round — 3 milestones, discussed aloud (§6.1) | 30 |
| 4 | **Round 1** — independent judgements, silent (§6.2) | 90 |
| — | Lunch | 45 |
| 5 | Feedback — spread, outliers, item-level discussion (§6.3) | 60 |
| 6 | **Round 2** — independent re-judgement (§6.3) | 45 |
| 7 | Observation descriptor anchoring (§6.4) | 30 |
| 8 | Global-cut discussion and impact data (§6.5) | 30 |
| 9 | Close: what happens next, dissent on the record (§7) | 15 |

**Remote mechanics.** One video call throughout. Round-1 and round-2 judgements are entered in a
per-panelist spreadsheet that no other panelist can see — one file per panelist, not a shared sheet
with a tab each. Panelists stay on the call with microphones muted during silent rounds, so the
facilitator can answer questions of fact without breaking the silence rule for everyone. Record the
discussion blocks with consent; do not record the silent rounds.

### 4.1 The borderline-child definition exercise

This is the exercise everything else rests on, and the most common place a standard-setting panel
goes wrong is rushing it.

For each band in turn (A3, A4, A5, G1), and for each of the three bands within it:

1. The facilitator reads out two or three of the pre-work descriptions submitted for that band,
   unattributed.
2. The panel builds, aloud, **one shared description of the borderline child** — the child who is
   *just* over the line into `developing`, and separately the child who is *just* over the line into
   `secure`. Not a typical child. Not a strong child. The marginal one.
3. The recorder writes it on the shared screen, in the panel's own words, and it stays visible for
   the rest of the day.
4. The facilitator tests it once: *"Would this child be a surprise on either side?"* If half the room
   says the description sounds like a comfortably secure child, it is wrong and gets redrafted.

Two borderline definitions per band × four bands = eight descriptions. Budget the full hour.

The output of this block is a required artefact, not a warm-up. It is what makes every subsequent
judgement answerable to something, and it goes into the minute verbatim.

---

## 5. Orientation script

Read this, close to verbatim. It sets the frame and it protects the panel from the two failure modes
(judging the item's quality instead of the borderline child's chance, and judging their own class).

> Thank you for being here. Today you are setting the boundaries that decide when a child's evidence
> on a milestone is described as emerging, developing or secure.
>
> Here is what those thresholds are today. `Secure` means at least eighty per cent of a milestone's
> evidence was correct; `developing` means at least forty per cent. Nobody derived those numbers.
> They are the conventional values, chosen because they are conventional. We have published that
> fact, and today is how we replace it.
>
> One thing you need to know before you start. A milestone in this bank is evidenced by between one
> and four items. That means the eighty per cent threshold does not currently behave like eighty per
> cent — with four items a child needs all four, and with one item there is no middle band at all.
> Part of your job today is to tell us what `secure` should actually require given that.
>
> The judgement I will ask you for is always the same shape, and it is a specific one. For each item,
> I will ask: **of one hundred children who are exactly on the borderline — just barely secure, no
> more — how many would answer this item correctly?** Not how many of your children. Not whether the
> item is a good item. How many borderline children, out of a hundred.
>
> Three rules for the day.
>
> First, in the silent rounds you do not confer. The value of your first judgement is that it is
> yours. Second, if you think an item is confusing, badly worded or unfair, say so — the recorder is
> capturing every one of those comments and they go to the item authors — but make the judgement
> anyway, on the item as it stands. Third, there is no answer we are hoping for. If this panel moves
> `secure` from eighty per cent to sixty, we will publish that, and we will publish who was in the
> room. If this panel tells us the item counts are too thin to set a cut on at all, we will publish
> that too. You are not here to ratify a number.
>
> Questions of fact — what does this item ask, what does the child see, what is the stimulus — go to
> our content expert at any time. Questions of judgement come back to you.

---

## 6. The rounds

### 6.1 Practice round

Three milestones — deliberately one easy, one hard, one single-item — judged **aloud**, with the
facilitator inviting two panelists to explain their reasoning. Purpose: catch panelists who are
answering the wrong question. The most common errors, and the correction to say out loud:

- *"About half my class could do that"* → the question is about the borderline child, not the class.
- *"That's a bad item"* → note it, judge it as written.
- *"It depends on the classroom"* → assume a well-implemented programme with the material available.

Practice judgements are discarded.

### 6.2 Round 1 — independent judgements

For each item in the sample, each panelist records one number: **the percentage of borderline-secure
children who would answer this item correctly** (0–100, in steps of 5). A parallel column asks the
same question for the **borderline-developing** child.

From those, per milestone, per panelist:

```
expected_correct_secure      = Σ (item judgement, borderline-secure)      ÷ 100
expected_correct_developing  = Σ (item judgement, borderline-developing)  ÷ 100
cut_ratio_secure      (panelist, milestone) = expected_correct_secure     ÷ n_items
cut_ratio_developing  (panelist, milestone) = expected_correct_developing ÷ n_items
```

Panelists never see these ratios during round 1. They judge items; the arithmetic is the facilitator's.

An explicit "**I cannot judge this**" option is available and is recorded rather than coerced into a
number — a guide with no EFL experience should not be inventing a judgement on E4.

### 6.3 Feedback, then round 2

The facilitator shows, per milestone: the **spread** of panelist cut ratios (min, median, max), with
panelists identified only by an anonymous letter, plus each panelist's own value highlighted in their
private view. No means are shown before the spread — a mean anchors the room.

Discussion is structured, milestone by milestone, and only where the spread exceeds a pre-set width
(recommended: max − min > 0.25). For each, the highest and lowest judge are invited — not required —
to explain. Everyone else listens. The facilitator does not summarise toward the middle.

**Round 2** repeats the judgement, silently and independently. Panelists may keep their round-1 value;
changing is not the goal, informed judgement is. Round 2 replaces round 1 entirely in the aggregation.

**Do not run a round 3.** Convergence after two rounds is normal-and-sufficient; a third round
produces agreement by attrition.

### 6.4 Observation descriptor anchoring

Not an Angoff exercise. For a sample of 12 observation milestones spanning ATL, SED, PPL, LCL-E and
COG-E, panelists independently assign a band to **three written vignettes per milestone** — short,
neutral descriptions of a child, drafted in advance so that one sits clearly in each band.

The output is agreement data, not a cut: where panelists disagree on which band a vignette belongs
in, the *descriptor wording* is at fault and goes back for redrafting. This block is the cheap
precursor to the inter-rater reliability study (`EVIDENCE_STATUS.md` §3, Study 2) and it usually
finds two or three descriptors whose middle band is doing no work.

### 6.5 Global cut discussion, with impact data

The facilitator shows the aggregated result (§6.6) and asks the panel three questions directly:

1. **Does one pair of cuts serve the whole bank**, or do particular strands need their own? A
   per-strand cut is supportable only where the panel can articulate *why* — "spoken production in a
   second language cannot be judged on the same proportion as picture-pointing" is a reason; a
   different median is not.
2. **Do 0.80 and 0.40 survive?** Compare the panel medians against the incumbent values, and say
   plainly whether the incumbents fall inside the panel's inter-quartile range.
3. **Given one-to-four items per milestone, is a proportion cut the right instrument at all?** The
   available answers include: raise item counts before setting any cut (recommendation R1 of
   `BANK_AUDIT_2026-08.md`); express the cut as a *number of items correct* rather than a proportion;
   or accept that `secure` means "all evidence correct" at these counts and say so in the methodology.
   The panel's answer to this question is the most valuable thing it will produce.

Show **impact data** before the panel closes on a recommendation: for each candidate cut pair, the
proportion of milestones in each band, computed against whatever response data exists (if none
exists, show it against a uniform and a plausible-skew simulation, labelled as simulation). A panel
that has not seen the consequence of its cut has not finished.

### 6.6 Aggregation

```
milestone_cut_secure      = median across panelists of cut_ratio_secure      (round 2)
milestone_cut_developing  = median across panelists of cut_ratio_developing  (round 2)

global_cut_secure         = median across sampled milestones of milestone_cut_secure
global_cut_developing     = median across sampled milestones of milestone_cut_developing
```

Median, not mean, at both levels — one panelist who judges everything at 95 should not move the cut.

Report alongside every cut: **n panelists, the inter-quartile range, and the standard error of the
median.** A cut published without its spread is a cut pretending to be a measurement.

**Adopt a per-strand cut only if** the panel articulated a substantive reason (§6.5 q1) *and* the
strand's median differs from the global median by more than the global inter-quartile range. Absent
both, use the global pair — a table of 28 bespoke thresholds is a maintenance liability and an
overfit to one day's sample.

---

## 7. The minute

The recorder produces this within five working days. It is the audit trail; without it the panel did
not happen.

```markdown
# Cut-Score Panel — Minute
Date · Duration · Facilitator · Recorder · Content expert (non-voting)
Bank version and checksum under judgement
Instrument version of this protocol

## 1. Panel composition
Per panelist, no names in the published version: qualification, years of lead experience,
age range, market, setting type, involvement in authoring (yes/no).
Panelists invited and declined: n, and any pattern worth noting.

## 2. Borderline-child definitions (verbatim, all 8)

## 3. Sample judged
Milestones (ids), items (count), strands and bands covered, and what was excluded and why.

## 4. Round 1 — summary statistics only
Per milestone: n judges, median, IQR, min, max, "cannot judge" count.

## 5. Discussion record
Milestones discussed, the spread that triggered each, the substantive arguments made
(not attributed), and any item flagged as confusing / unfair / mis-keyed — verbatim,
with the item id, forwarded to the bank authors as a separate defect list.

## 6. Round 2 — results and aggregation
Per milestone medians · global medians · IQR · SE of the median ·
movement between rounds.

## 7. Recommendation
The cut pair recommended · per-strand exceptions with their stated reasons ·
the panel's answer to "is a proportion cut the right instrument at these item counts" ·
impact data shown, and the panel's reaction to it.

## 8. Dissent
Any panelist who does not endorse the recommendation, in their own words, unedited.
An empty section here on a first panel is a warning sign, not a success.

## 9. Signatures
Each panelist confirms the minute reflects the day. Confirmation is of the record,
not of the recommendation.
```

Publish the minute with panelist qualifications and without panelist names, unless a panelist asks to
be named.

---

## 8. From recommendation to running code

The panel recommends. It does not deploy. The path is deliberate and leaves a trail.

1. **Decision.** The recommendation goes to whoever owns the instrument, with the minute attached.
   Accepting, rejecting or modifying it is a written decision with a reason. A modified cut is a
   *company* cut, not a panel cut, and must be described as such everywhere.
2. **Bank change.** The accepted values are written to `scoring.milestoneThresholds` in
   `lib/montree/evaluation/item-bank.json` (and any per-strand overrides alongside), the bank version
   is **minor-bumped**, and the checksum regenerated. The bank's `scoring.note` — which currently
   reads that the thresholds are conventional and not empirically calibrated — is rewritten to name
   the panel, its date and the minute.
3. **Provenance record.** A `scoring.provenance` block records: method (`modified_angoff`), panel
   date, n panelists, the minute's document id, the bank version judged, and the previous values.
   Nothing else in the codebase should have to guess where a threshold came from.
4. **Re-score, do not migrate silently.** Existing results were computed under the old thresholds.
   They are **not** retroactively re-banded. Every stored result already carries the bank version that
   produced it; a report that spans a threshold change must say so on its face, and growth across a
   threshold change is not reported as growth.
5. **Regenerate the packs.** `evaluation-kit/paper` prints thresholds on the record sheets. Rebuild
   the HTML and re-render all eight packs plus the reprint set.
6. **Re-run the structural audit.** `node scripts/evaluation-bank-audit.mjs` — new cuts change which
   milestones are arithmetically able to reach which bands, and §A.3 of the audit is the check.
7. **Tests.** `scoring.ts` band-boundary tests are updated in the same change, not after it.

---

## 9. Publication note for `EVIDENCE_STATUS.md`

When the panel has run and the values are deployed, replace the "cut scores are conventional" bullet
in `EVIDENCE_STATUS.md` §2.1 with a statement of this shape, and move the corresponding row in the
§4 interim claim table:

> **The cut scores are panel-derived.** The thresholds separating emerging, developing and secure
> were set by a modified-Angoff standard-setting panel of *n* experienced Montessori guides on
> *date*, judging bank *version* against written borderline-child definitions the panel produced.
> The recommended values were *secure X, developing Y*, with inter-quartile ranges of *…*; the
> company adopted *values*, [identically / with the following modification and reason]. The full
> minute, including panel qualifications, the sample judged, dissent, and the panel's finding on
> whether a proportion cut is appropriate at current item counts, is available at *reference*.
> **What this does not establish:** that the items behave as intended, that two teachers would agree,
> or that the forms are equated. Those remain Studies 1–3.

The last two sentences are not optional. A panel-derived cut is a real improvement and a small one:
it fixes the provenance of two numbers and nothing else about the evidence base. Any copy that lets a
reader infer more than that is a claim violation under §4 of `EVIDENCE_STATUS.md`.

---

*2026-08-26 — v1.0. First issue. Companion to `EVIDENCE_STATUS.md` and `BANK_AUDIT_2026-08.md`.*
