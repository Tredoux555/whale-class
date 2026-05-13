-- ============================================================================
-- CLEANUP: Test Agent + Test School(s)
-- ============================================================================
--
-- Run this AFTER you've completed your end-to-end test as your own agent and
-- want to reset state before Gloria's real onboarding.
--
-- ARCHITECTURAL NOTE
--   Removes everything the agent flow touches: payouts, finance_tx rows,
--   message threads + participants + messages, Mira log, audit log,
--   referral codes, any school redeemed via this agent's codes, and finally
--   the agent's own montree_teachers row.
--
-- FK behaviour by table (from migrations 186, 188, 189, 191, 198):
--   montree_agent_payouts.agent_id        → ON DELETE RESTRICT  (must delete BEFORE the teacher row)
--   montree_agent_mira_log.agent_id       → ON DELETE CASCADE   (auto-deletes — listed here for visibility)
--   montree_agent_audit.agent_id          → ON DELETE SET NULL  (we explicitly delete for clean test state)
--   montree_finance_transactions.agent_id → ON DELETE SET NULL  (we explicitly delete agent_id-scoped rows)
--   montree_referral_codes.agent_id       → ON DELETE SET NULL  (we explicitly delete to remove test codes)
--   montree_schools.founding_teacher_id   → ON DELETE SET NULL  (only set, so the school survives the teacher delete — we delete the school explicitly if it's a test school)
--
-- 🚨 BEFORE RUNNING THIS SQL — manual Stripe-side cleanup:
--   1. https://dashboard.stripe.com/connect/accounts
--   2. Find the test Connect account (matches the test agent's stripe_connect_account_id)
--   3. ⋯ menu → Reject → confirm.  Deactivates the Express account.
--   4. If you wired yourself a real $1 — reverse the transfer from
--      dashboard.stripe.com/connect/transfers/{id} before rejecting the
--      account (rejecting first blocks reversal).
--
-- USAGE
--   1. STEP 0 below — run the lookup query first to grab your test agent's
--      teacher_id.
--   2. STEP 1 — edit v_agent_id with that UUID.
--   3. Run with v_dry_run := true FIRST.  Reads counts only.  Rolls back.
--   4. If counts look right, change v_dry_run := false and re-run.  COMMITS.
-- ============================================================================


-- ─── STEP 0: Find your test agent's teacher_id ─────────────────────────────
-- Run this SELECT first.  Copy the UUID into v_agent_id below.
-- (Comment this out before the main block to avoid confusion in Supabase.)

-- SELECT id, name, email, is_agent, agent_login_set_at,
--        stripe_connect_account_id, stripe_connect_status
-- FROM   montree_teachers
-- WHERE  email = 'tredoux+agentest@gmail.com'  -- <-- edit if you used a different email
-- ORDER BY agent_login_set_at DESC NULLS LAST
-- LIMIT 5;


-- ─── STEP 1: Cleanup transaction ────────────────────────────────────────────

DO $$
DECLARE
  -- 🚨 EDIT THESE TWO LINES:
  v_agent_id UUID    := 'PASTE_TEST_AGENT_TEACHER_ID_HERE';
  v_dry_run  BOOLEAN := true;  -- true = preview counts and ROLLBACK; false = COMMIT

  -- Working state
  v_test_schools UUID[];
  v_n_schools         INTEGER;
  v_n_codes           INTEGER;
  v_n_payouts         INTEGER;
  v_n_finance         INTEGER;
  v_n_audit           INTEGER;
  v_n_mira            INTEGER;
  v_n_thread_msgs     INTEGER;
  v_n_thread_part     INTEGER;
  v_n_threads         INTEGER;
  v_n_children        INTEGER;
  v_n_classroom_teachers INTEGER;
  v_n_classrooms      INTEGER;
  v_n_school_admins   INTEGER;
  v_agent_email       TEXT;
  v_agent_name        TEXT;
  v_stripe_account_id TEXT;
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE ' TEST AGENT CLEANUP';
  RAISE NOTICE ' Agent ID: %', v_agent_id;
  RAISE NOTICE ' Dry run : %', v_dry_run;
  RAISE NOTICE '==============================================';

  -- ─── Safety: verify the agent exists + is actually flagged as an agent ───
  SELECT name, email, stripe_connect_account_id
    INTO v_agent_name, v_agent_email, v_stripe_account_id
  FROM   montree_teachers
  WHERE  id = v_agent_id;

  IF v_agent_email IS NULL THEN
    RAISE EXCEPTION 'Agent % not found in montree_teachers.  Did you copy the UUID correctly?', v_agent_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM montree_teachers WHERE id = v_agent_id AND is_agent = TRUE
  ) THEN
    RAISE EXCEPTION
      'Teacher % (% / %) has is_agent=false — refusing to delete a non-agent row.  This script is ONLY for test agent cleanup.',
      v_agent_id, v_agent_name, v_agent_email;
  END IF;

  RAISE NOTICE ' Agent name : %', v_agent_name;
  RAISE NOTICE ' Agent email: %', v_agent_email;
  RAISE NOTICE ' Stripe acct: %', COALESCE(v_stripe_account_id, '<none>');
  RAISE NOTICE '----------------------------------------------';

  -- ─── Identify test schools linked to this agent ──────────────────────────
  SELECT array_agg(DISTINCT school_id) INTO v_test_schools
  FROM (
    SELECT id AS school_id
      FROM montree_schools
      WHERE founding_teacher_id = v_agent_id
    UNION
    SELECT redeemed_by_school_id AS school_id
      FROM montree_referral_codes
      WHERE agent_id = v_agent_id AND redeemed_by_school_id IS NOT NULL
  ) s;

  v_n_schools := COALESCE(array_length(v_test_schools, 1), 0);
  RAISE NOTICE ' Test schools linked: % %', v_n_schools, COALESCE(v_test_schools::TEXT, '{}');

  -- ─── 2. Agent payouts (RESTRICT FK — MUST go before teacher row) ──────────
  SELECT count(*) INTO v_n_payouts
    FROM montree_agent_payouts WHERE agent_id = v_agent_id;
  RAISE NOTICE ' [delete] montree_agent_payouts          rows: %', v_n_payouts;
  DELETE FROM montree_agent_payouts WHERE agent_id = v_agent_id;

  -- ─── 3. Finance transactions tagged to this agent ────────────────────────
  -- These are the commission rows wire-out writes.  Also any direct_cost
  -- rows the api-usage aggregator may have written under this agent.
  SELECT count(*) INTO v_n_finance
    FROM montree_finance_transactions WHERE agent_id = v_agent_id;
  RAISE NOTICE ' [delete] montree_finance_transactions   rows: %', v_n_finance;
  DELETE FROM montree_finance_transactions WHERE agent_id = v_agent_id;

  -- ─── 4. Messaging — find threads the agent participated in ───────────────
  -- Order: messages -> participants -> thread row itself.
  CREATE TEMP TABLE IF NOT EXISTS _agent_threads (thread_id UUID PRIMARY KEY) ON COMMIT DROP;
  TRUNCATE _agent_threads;
  INSERT INTO _agent_threads (thread_id)
    SELECT DISTINCT thread_id
    FROM   montree_message_thread_participants
    WHERE  participant_id = v_agent_id;

  SELECT count(*) INTO v_n_threads FROM _agent_threads;
  RAISE NOTICE ' [scope ] message threads involving agent     : %', v_n_threads;

  IF v_n_threads > 0 THEN
    SELECT count(*) INTO v_n_thread_msgs
      FROM montree_thread_messages
      WHERE thread_id IN (SELECT thread_id FROM _agent_threads);
    RAISE NOTICE ' [delete] montree_thread_messages         rows: %', v_n_thread_msgs;
    DELETE FROM montree_thread_messages
      WHERE thread_id IN (SELECT thread_id FROM _agent_threads);

    SELECT count(*) INTO v_n_thread_part
      FROM montree_message_thread_participants
      WHERE thread_id IN (SELECT thread_id FROM _agent_threads);
    RAISE NOTICE ' [delete] montree_message_thread_participants rows: %', v_n_thread_part;
    DELETE FROM montree_message_thread_participants
      WHERE thread_id IN (SELECT thread_id FROM _agent_threads);

    DELETE FROM montree_message_threads
      WHERE id IN (SELECT thread_id FROM _agent_threads);
    RAISE NOTICE ' [delete] montree_message_threads         rows: %', v_n_threads;
  END IF;

  -- ─── 5. Mira log (CASCADE — listed for visibility only) ──────────────────
  SELECT count(*) INTO v_n_mira
    FROM montree_agent_mira_log WHERE agent_id = v_agent_id;
  RAISE NOTICE ' [note  ] montree_agent_mira_log will CASCADE: %', v_n_mira;

  -- ─── 6. Agent audit (SET NULL — delete explicitly for clean state) ───────
  SELECT count(*) INTO v_n_audit
    FROM montree_agent_audit WHERE agent_id = v_agent_id;
  RAISE NOTICE ' [delete] montree_agent_audit             rows: %', v_n_audit;
  DELETE FROM montree_agent_audit WHERE agent_id = v_agent_id;

  -- ─── 7. Referral codes ───────────────────────────────────────────────────
  SELECT count(*) INTO v_n_codes
    FROM montree_referral_codes WHERE agent_id = v_agent_id;
  RAISE NOTICE ' [delete] montree_referral_codes          rows: %', v_n_codes;
  DELETE FROM montree_referral_codes WHERE agent_id = v_agent_id;

  -- ─── 8. Test schools — best-effort cleanup of school + dependents ────────
  -- Only fires if a code was redeemed.  Scope is strictly schools where the
  -- test agent is founding_teacher OR a test code's redeemed_by_school_id.
  IF v_n_schools > 0 THEN
    RAISE NOTICE '----------------------------------------------';
    RAISE NOTICE ' Deleting test school dependents...';

    -- Children
    SELECT count(*) INTO v_n_children
      FROM montree_children
      WHERE school_id = ANY(v_test_schools);
    RAISE NOTICE ' [delete] montree_children                rows: %', v_n_children;
    DELETE FROM montree_children WHERE school_id = ANY(v_test_schools);

    -- Other teachers attached to those schools (NOT the agent itself —
    -- the agent row is deleted at the very end)
    SELECT count(*) INTO v_n_classroom_teachers
      FROM montree_teachers
      WHERE school_id = ANY(v_test_schools) AND id <> v_agent_id;
    RAISE NOTICE ' [delete] montree_teachers (test schools) rows: %', v_n_classroom_teachers;
    DELETE FROM montree_teachers
      WHERE school_id = ANY(v_test_schools) AND id <> v_agent_id;

    -- Classrooms
    SELECT count(*) INTO v_n_classrooms
      FROM montree_classrooms
      WHERE school_id = ANY(v_test_schools);
    RAISE NOTICE ' [delete] montree_classrooms              rows: %', v_n_classrooms;
    DELETE FROM montree_classrooms WHERE school_id = ANY(v_test_schools);

    -- Principals / school admins
    SELECT count(*) INTO v_n_school_admins
      FROM montree_school_admins
      WHERE school_id = ANY(v_test_schools);
    RAISE NOTICE ' [delete] montree_school_admins           rows: %', v_n_school_admins;
    DELETE FROM montree_school_admins WHERE school_id = ANY(v_test_schools);

    -- The schools themselves
    DELETE FROM montree_schools WHERE id = ANY(v_test_schools);
    RAISE NOTICE ' [delete] montree_schools                 rows: %', v_n_schools;
    RAISE NOTICE ' If you see FK errors here, extend the script with any';
    RAISE NOTICE ' tables that point to montree_schools but are not yet listed.';
  END IF;

  -- ─── 9. The agent's own teacher row ──────────────────────────────────────
  RAISE NOTICE '----------------------------------------------';
  RAISE NOTICE ' [delete] montree_teachers (agent)        id  : %', v_agent_id;
  DELETE FROM montree_teachers WHERE id = v_agent_id;

  RAISE NOTICE '==============================================';
  RAISE NOTICE ' Cleanup script reached end of transaction.';

  IF v_dry_run THEN
    RAISE NOTICE ' DRY RUN — rolling back.  Counts above show what WOULD delete.';
    RAISE NOTICE ' Set v_dry_run := false to commit.';
    RAISE EXCEPTION 'DRY_RUN_ROLLBACK';  -- forces ROLLBACK without poisoning logs
  END IF;

  RAISE NOTICE ' COMMITTED.  Test agent + test school state has been removed.';
  RAISE NOTICE '==============================================';
END $$;


-- ─── STEP 2: Verify post-cleanup ────────────────────────────────────────────
-- Run these after the COMMIT to confirm everything is gone.
--
-- SELECT count(*) FROM montree_teachers WHERE id = 'PASTE_TEST_AGENT_TEACHER_ID_HERE';
--   -- expect 0
-- SELECT count(*) FROM montree_referral_codes WHERE agent_id = 'PASTE_TEST_AGENT_TEACHER_ID_HERE';
--   -- expect 0
-- SELECT count(*) FROM montree_agent_payouts WHERE agent_id = 'PASTE_TEST_AGENT_TEACHER_ID_HERE';
--   -- expect 0
-- SELECT count(*) FROM montree_finance_transactions WHERE agent_id = 'PASTE_TEST_AGENT_TEACHER_ID_HERE';
--   -- expect 0
-- SELECT count(*) FROM montree_agent_audit WHERE agent_id = 'PASTE_TEST_AGENT_TEACHER_ID_HERE';
--   -- expect 0
-- SELECT count(*) FROM montree_agent_mira_log WHERE agent_id = 'PASTE_TEST_AGENT_TEACHER_ID_HERE';
--   -- expect 0
-- SELECT count(*) FROM montree_schools WHERE founding_teacher_id = 'PASTE_TEST_AGENT_TEACHER_ID_HERE';
--   -- expect 0
