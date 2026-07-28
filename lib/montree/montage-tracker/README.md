# Montage Tracker (extractable module)

Photo-coverage boards + confirmation-free montage creation. **Zero AI** — a photo
counts the moment it is tagged; the AI identification/confirmation pipeline runs
untouched in parallel and is never imported from here.

Designed to be lifted into a standalone app later. Its ONLY touchpoints:

1. **Read** `montree_media` + `montree_media_children` (+ `montree_children`,
   `montree_classrooms`) — `coverage.ts`.
2. **Montage jobs API** `POST/GET /api/montree/montage` with `bypass_confirmation`
   (backed by `montree_montage_jobs.require_confirmed`, migration 305).
3. **Nav entries** — `components/montree/DashboardHeader.tsx` + the tools page card.

`weekRange.ts` is dependency-free; `coverage.ts` takes a Supabase client as an argument.
