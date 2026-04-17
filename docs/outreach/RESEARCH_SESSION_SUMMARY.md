# Montree Outreach Research — Session Summary (Apr 16, 2026)

## Bottom line

**Took the master list from 770 → 1,099 schools** (+329 unique, deduped against existing).
**Found 23 confirmed Transparent Classroom users** — the single highest-value segment for Montree outreach (competitor-displacement leads).

Deliverables (both in `whale/docs/outreach/`):
- `Montree_Research_MainClaude.xlsx` — 4 tabs: TC Users (23), New Schools (329), Regional Summary, Methodology & Gaps
- `WEB_CLAUDE_RESEARCH_PROMPT.md` — drop-in prompt for user to paste into claude.ai web interface and run the same research in parallel (covers Baidu, LinkedIn, membership-walled directories that WebFetch-sandbox agents couldn't reach)

## Model question

User asked whether Sonnet was needed. Answer: no — Opus 4.6 (running this session) is more capable than Sonnet for orchestration-heavy research. Sonnet would have been a downgrade. The bottleneck was never reasoning quality; it was agent tool access (sandbox web fetch restrictions on Baidu, LinkedIn, and membership-walled directories).

## Method

Two waves of 6 parallel research agents, briefed with strict pipe-delimited CSV output format for clean aggregation:

**Wave 1** (6 agents, ~290 raw records): Latin America · SE Asia · Eastern Europe/Russia · Korea/Japan/Türkiye · Africa ex-KE/SA · AMS/AMI directories + early TC hunt

**Wave 2** (6 agents, mixed results): USA deep · India deep · Middle East extension · China tier-3 · **dedicated TC user hunt** · Canada/AU/NZ/UK

Results recovered from the full session transcript (381 raw pipe-delimited lines) and parsed with an intelligent column-position detector (agents used slightly different column orders — code auto-detects emails, phones, URLs by pattern). Deduped against the existing 770-school master list by both school name (case-insensitive) and web domain.

## The 23 Transparent Classroom leads (highest priority)

These are schools with **hard evidence** of TC usage — "Powered by Transparent Classroom" footers, dedicated TC parent-portal pages, TC case studies, or `schoolname.transparentclassroom.com` active subdomains. They've already said yes to the category; Montree just needs to be the better offer.

Notable entries: Sunstone Montessori (Portland OR), Two Rivers Academy (Tahlequah OK), Hockessin Montessori (DE), Beverly Montessori (Chicago IL), Creekside Montessori (Minneapolis MN), Desert Garden Montessori (Phoenix AZ), Springmont School (Atlanta GA), Montessori School of Silicon Valley (Santa Clara CA — adopted TC Aug 2024), Guidepost Montessori (Brooklyn NY, chain), We Love Mômes (Versailles, France).

Recommendation: these get their own GMass campaign with a TC-aware angle in the email body. A line like *"if you already use Transparent Classroom, Montree imports your data in 5 minutes"* converts dramatically better than the generic pitch.

## Known gaps (what the agents couldn't reach)

Four Wave 2 agents hit sandbox-access walls and pushed back rather than fabricating data:

| Gap | Why the agent stopped | Remedy |
|---|---|---|
| **USA deeper** | PrivateSchoolReview pages are dynamically loaded — AMS has 167 schools in CA alone but agent could only extract a handful | Web Claude (has real browser) or user manual sweep |
| **India deeper** | AMI India + IMF flagship directories identified but emails live behind individual school pages — 150+ min of sequential fetches required | Web Claude parallel run |
| **Canada/AU/NZ/UK** | CCMA, MANZ, MSA directories are behind membership walls | Web Claude (authenticated browser) or user direct access |
| **China tier-3** | Baidu, Dianping, 58.com blocked to WebFetch | Web Claude (Chinese browser) or user manual sweep |

The `WEB_CLAUDE_RESEARCH_PROMPT.md` handoff prompt was built specifically to cover every one of these gaps when run on claude.ai web. Target stated in the prompt: 770 → 1,500+. Running both agents in parallel (this session's output + web Claude) should push the list well past that.

## What NOT to do

Don't blast the 329 new schools at the Campaign D / Campaign A rate until:

1. **Bounce-scrub the emails** — the MX-record scrub in `scripts/` (used for the Mar 28 batch, 16% drop vs 34.7% actual bounce) should run on this list first.
2. **Let Campaign D finish** (the correction send — should be done by ~Apr 17 based on the 50/day throttle). Adding a new big blast before D lands would confuse threading.
3. **Let Campaign A fire** (Montree pitch scheduled Apr 27). The new 329 get queued for a Campaign E *after* A lands — ~mid-May — giving the existing list time to respond first.

## Files in `whale/docs/outreach/`

- `Montree_Research_MainClaude.xlsx` — NEW, this session's output
- `WEB_CLAUDE_RESEARCH_PROMPT.md` — NEW, hand-off prompt
- `RESEARCH_SESSION_SUMMARY.md` — this file
- (existing) `Montree_Outreach_Cleaned.xlsx`, `SEND_PLAYBOOK.md`, `Letter_*.html`, `HOW_TO_INJECT.md`
