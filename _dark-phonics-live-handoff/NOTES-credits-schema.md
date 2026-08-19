> **Superseded — see `HANDOFF.md` at the scaffold root.** Most items below were
> resolved against the live repo after this note was written (migration is now
> `334_...`, table names and FKs are confirmed). Kept for the design rationale;
> don't treat every bullet below as still-open.

# VERIFY BEFORE RUNNING migrations/224_dark_phonics_live.sql (see banner above — now migrations/334_dark_phonics_live.sql)
- **Migration number** `224` assumed next after 223; confirm nothing else claims it.
- **`montree_feature_definitions` columns** assumed `(feature_key, description, category, default_enabled)` with `feature_key` UNIQUE, and `category` free text accepting `'classroom'`; mirror the newest existing flag INSERT or the seed will fail.
- **Parents table name** unknown — `parent_id` has NO foreign key. Confirm what `montree_appointments.parent_id` references (likely `montree_parents`) and uncomment the FK in section 5.
- **Children table name** unknown — `child_id` has NO foreign key. Likely `montree_children` or `montree_students`; confirm and uncomment.
- **`montree_appointments`** assumed to exist with PK `id uuid` and to carry both a parent and a child reference; the ledger's inline FK to it fails otherwise.
- **WRITE ORDER**: `appointment_id`'s FK is `DEFERRABLE INITIALLY DEFERRED`, so appointment + `-1` ledger row can be written in either order *within one transaction*. Separate Supabase client calls are separate transactions — the booking route must insert the appointment BEFORE spending, or move both into the `spend_credit_for_booking` RPC. (Resolves the conflict flagged in NOTES-backend.md item 4.)
- **`school_id` on `montree_class_packages`** is nullable with NO FK to a schools table — deliberate for the solo-teacher launch.
- **`created_by`** is unconstrained `uuid` because teacher and parent ids may live in different tables.
- **RLS / grants are NOT handled here.** If montree tables are RLS-enabled, both new tables need policies and `spend_credit_for_booking` likely needs `SECURITY DEFINER` + pinned `search_path`. Match what 223 and its neighbours do.
- **View name** `montree_class_credit_balances` assumed free; `CREATE OR REPLACE VIEW` fails if an incompatible object owns it.
- **`gen_random_uuid()`** assumed available (PG13+/Supabase); `pgcrypto` is created defensively.
- **1 class = 1 credit** is hardcoded (`delta -1` at booking); variable-cost class types would need a rethink.
- **The 24h late-cancel window is a caller decision**, not enforced in SQL — `lateCancel` is passed into `reverseCreditForCancellation`.
- **No down/rollback migration**; drop order would be view → ledger → packages → flag row.
