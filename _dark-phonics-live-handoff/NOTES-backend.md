> **Superseded — see `HANDOFF.md` at the scaffold root.** Items 1–4 below are
> now resolved: the recap table and whiteboard column both live in
> `migrations/334_dark_phonics_live.sql`, and the FK conflict in item 4 was
> fixed by reordering the booking route (insert appointment → spend credit),
> not by relaxing the constraint. `appointment_type` does not exist as a
> column on `montree_appointments` and is NOT used by the booking route.

# NOTES — backend slice (whiteboard / lesson-adapter / recap / credits-booking)

## Schema additions needed BEYOND the credits-ledger migration
1. `ALTER TABLE montree_appointments ADD COLUMN IF NOT EXISTS whiteboard_room_uuid text;` — nullable, set on first join by `getOrCreateWhiteboardRoom()`.
2. NEW table `montree_class_recaps`: `id uuid pk default gen_random_uuid()`, `appointment_id uuid not null references montree_appointments(id) on delete cascade`, `lesson_number int not null`, `words_drilled text[] not null default '{}'`, `stars_earned int not null default 0`, `teacher_note text`, `created_by uuid`, `created_at timestamptz not null default now()`.
   Plus `CREATE UNIQUE INDEX IF NOT EXISTS montree_class_recaps_appointment_key ON montree_class_recaps (appointment_id);` — required, the recap POST upserts on `appointment_id`.
3. `montree_appointments` must accept `appointment_type = 'dark_phonics_live'`; add the column/enum value if constrained.
4. **CONFLICT with 224_dark_phonics_live.sql**: `montree_class_credits_ledger.appointment_id` has an FK to `montree_appointments(id)`, but the booking route spends the credit *before* inserting the appointment (as specced), which violates it. Fix by making that FK `DEFERRABLE INITIALLY DEFERRED` + doing both writes in one transaction, or by folding both inserts into the `spend_credit_for_booking` RPC.

## Env vars introduced by this slice (all NEW, separate from RTC creds)
- `AGORA_WHITEBOARD_APP_IDENTIFIER` — Whiteboard "App Identifier" (`<orgId>/<appId>`), safe to send to the client.
- `AGORA_WHITEBOARD_SDK_TOKEN` — server-only Whiteboard SDK token (`NETLESSSDK_...`). Never ship to the browser.
- `AGORA_WHITEBOARD_REGION` — optional, defaults `cn-hz`; must match the region the identifier was created in.

`AGORA_APP_ID` / `AGORA_APP_CERTIFICATE` stay RTC-only — the Agora Whiteboard product does not accept them.
