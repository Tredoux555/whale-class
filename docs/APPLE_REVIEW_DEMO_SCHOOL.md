# Apple Review Demo School (PRODUCTION montree.xyz)

Created: 2026-06-12 (Tier 1 item 4, burn-jun12-night2 — owner-approved)
Created via live public APIs only (`/try/instant` → `/auth/unified` → `/principal/setup` → `/children`). No direct DB writes, no deletes.

## School

| Field | Value |
|---|---|
| School name | Apple Review School |
| School ID | `136841a0-6b93-421e-b9f4-57e9f1451d18` |
| Slug | `trial-principal-wyxmn9-1ld36m` |
| Plan | school / trialing — **trial_ends_at 2026-06-19** (7-day trial) |
| Owner email | tredoux555+applereview@gmail.com |

## Login codes (enter at montree.xyz login)

| Role | Name | Code | Verified |
|---|---|---|---|
| Principal | Apple Reviewer | **WYXMN9** | Yes — re-authenticated via /auth/unified, role=principal, needsSetup=false |
| Teacher | Demo Teacher | **BAM4S9** | Yes — authenticated, role=teacher, onboarded=true, classroom "Demo Classroom" |

Principal ID: `8310289a-a222-4514-a5c6-d46b3da1b50c`
Teacher ID: `d943267f-1317-424b-89ba-9e7ef6316e6c`

## Classroom

| Field | Value |
|---|---|
| Name | Demo Classroom 🍎 (age group 3-6) |
| Classroom ID | `5a5c93bb-68a9-4ac8-aa6a-c31c77734417` |
| Curriculum | Full static curriculum seeded via /principal/setup (areas + works + global translations) |

## Children (5 — all obviously fake, no photos)

| Name | Age | DOB (in notes) | Child ID |
|---|---|---|---|
| Emma Chen | 5 | 2021-03-12 | `d536c533-4ae0-4090-befe-1f5266e556ee` |
| Liam Park | 5 | 2020-11-05 | `c2a1ab94-9277-49dc-b509-6926805c1393` |
| Sofia Rossi | 4 | 2021-07-22 | `dd57d123-08a1-4826-bb25-3d8636ec1092` |
| Noah Smith | 5 | 2020-09-30 | `377e23ec-9efc-47af-8ae6-ca38dcb4616e` |
| Mia Müller | 5 | 2021-01-15 | `8a643f53-e800-4839-b417-269b34a4c488` |

Verified: GET /api/montree/children?classroom_id=… returned exactly these 5.

## Action items for Tredoux

- [ ] **Verify both codes (WYXMN9, BAM4S9) on a real device / the iOS build** before submitting to App Review.
- [ ] **Trial expires 2026-06-19** — extend `trial_ends_at` (or upgrade subscription_tier) before/during the review window so the reviewer is never hit with a paywall/expiry.
- [ ] **Exclude this school from outreach and analytics**: the signup created a `montree_leads` row ("Apple Reviewer" / Apple Review School) — remove or mark it so it never enters outreach sequences; exclude school ID `136841a0-…1d18` from revenue/usage analytics if relevant.
- [ ] Children have `date_of_birth=null` (children API only accepts integer `age`; DOBs are recorded in notes). Fill in real DOB fields via dashboard if any review flow needs them.
