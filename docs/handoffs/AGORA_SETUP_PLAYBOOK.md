# Agora setup playbook — Phase 116.3 Activation

**Mission:** flip the killer-feature stack ON for Whale Class. Agora native video calls + Cloud Recording + Whisper transcription + Sonnet "what am I walking into" briefings.

**Code state when reading this:** EVERY piece of the build is shipped behind feature flags that default OFF. Nothing activates until you complete the steps below.

**Time on your side:** ~25 minutes total. Most of it is account setup paperwork at agora.io.

---

## Step 0 — What you're about to enable

When all flags are flipped ON for Whale Class:

1. Parent books an appointment, ticks **Video call** + **Record this meeting** at the intake step.
2. Parent + teacher both tap **Join video call** at the appointed time → they meet inside Montree's UI (no external app, no Jitsi). Camera + mic permission prompt, then they're in.
3. Teacher taps **Record** in the call controls → big red banner appears on both screens. Cloud Recording starts capturing audio to your Supabase Storage bucket.
4. Meeting ends. Teacher taps **Leave**. Recording auto-stops.
5. Within ~60 seconds: Whisper transcribes the audio. Within another ~10s: Sonnet generates a "chief-of-staff briefing" of what was discussed, parent concerns, commitments made, and follow-ups for next time.
6. Next time anyone opens an upcoming appointment with this same parent, they see **"Show prior conversations"** at the bottom of the row. Tap it → the briefing pops up. They walk into the next meeting already knowing what was said.

**Cost per 30-min recorded meeting:** ~$0.24 (Agora video + recording + Whisper + Sonnet + Supabase storage). At Whale Class scale (~5-10 meetings/month): ~$1.20-$2.40/month. Trivial.

---

## Step 1 — Sign up at Agora (10 min)

1. Go to https://www.agora.io/en/ and click **Get Started for Free**.
2. Sign up with your `tredoux555@gmail.com` (or a business email — recommended for the HK billing trail).
3. After email verification, you'll land in the Agora Console dashboard.
4. **Create a new project:**
   - Project Name: `Montree`
   - Use Case: `Education`
   - Authentication: **App ID + Token (Recommended)** ← critical, don't pick App ID only
   - Click Submit.
5. Copy the **App ID** (32-char hex string) — you'll paste this in Step 4.
6. Click the App ID's **Edit** icon → scroll to **Primary Certificate** → click **Generate** → copy the **App Certificate** (also 32-char hex) — you'll paste this too.

## Step 2 — Enable Cloud Recording (5 min)

1. Still in Agora Console, left sidebar → **All Products** → find **Cloud Recording** → click **Enable**.
2. Confirm the enable prompt (no payment required at this stage — billing starts on first usage).
3. Left sidebar → **Project Management** → your Montree project → **Cloud Recording** tab → confirm status is **Enabled**.

## Step 3 — Get REST API credentials (3 min)

Cloud Recording uses a SEPARATE set of credentials from the App ID/Cert.

1. Top-right Agora Console → click your account name → **RESTful API**.
2. Click **Add Secret** → name it `Montree Cloud Recording` → submit.
3. Copy:
   - **Customer ID** (looks like `8x4xxxxxxxxxxxxxxxxxx`) → paste in Step 4 as `AGORA_CUSTOMER_KEY`.
   - **Customer Secret** (longer hex string) → paste as `AGORA_CUSTOMER_SECRET`.

⚠️ The secret only shows ONCE. Save it to 1Password or your secure note before closing the modal. If you lose it, you have to regenerate (which invalidates the old one — fine, just inconvenient).

## Step 4 — Set Railway environment variables (5 min)

In Railway dashboard → Montree project → **Variables** tab → add these 4:

```
AGORA_APP_ID=<paste from step 1.5>
AGORA_APP_CERTIFICATE=<paste from step 1.6>
AGORA_CUSTOMER_KEY=<paste from step 3.3>
AGORA_CUSTOMER_SECRET=<paste from step 3.3>
```

While you're there, also add these THREE Supabase S3 vars (used by Agora to upload recordings into your Supabase Storage):

```
SUPABASE_S3_ACCESS_KEY=<get from Supabase project → Storage → S3 Connection>
SUPABASE_S3_SECRET_KEY=<same place>
SUPABASE_S3_ENDPOINT=https://<your-supabase-project>.supabase.co/storage/v1/s3
SUPABASE_S3_REGION=us-east-1
```

The Supabase S3 credentials are NOT the same as `SUPABASE_SERVICE_ROLE_KEY`. To find them:
- Supabase dashboard → your project → Settings → Storage → **S3 Connection** section
- Click **Generate New Access Key** if you don't have one
- Copy Access Key + Secret + Endpoint URL

Click **Deploy** in Railway to push the new vars.

## Step 5 — Create the Supabase Storage bucket (2 min)

In Supabase dashboard → **Storage** → **New Bucket**:
- Name: `meeting-recordings`
- Public: **OFF** (private bucket — recordings only accessed via signed URLs from our backend)
- File size limit: **500 MB** (a 60-min audio recording is ~30MB; lots of headroom)
- Allowed MIME types: leave blank (accept everything Agora sends)

Click Create.

Optional but recommended: set up an RLS policy so only the service role can read the bucket. Storage → meeting-recordings → Policies → New Policy → "Restrict to service_role". This is belt-and-braces — our backend already uses service_role for all reads, but locking down at the bucket level catches any future foot-guns.

## Step 6 — Run migration 223 (1 min)

Supabase Dashboard → SQL Editor → paste the migration from `migrations/223_appointment_recordings.sql` (already on `main` after my push) → Run.

Or copy the SQL inline:

```sql
-- migrations/223_appointment_recordings.sql
BEGIN;

ALTER TABLE montree_appointments
  ADD COLUMN IF NOT EXISTS provider TEXT
    DEFAULT 'jitsi'
    CHECK (provider IN ('jitsi', 'agora'));

ALTER TABLE montree_appointments
  ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN
    DEFAULT FALSE
    NOT NULL;

UPDATE montree_appointments
  SET provider = 'jitsi'
  WHERE provider IS NULL;

CREATE TABLE IF NOT EXISTS montree_appointment_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES montree_appointments(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  recording_provider TEXT NOT NULL CHECK (recording_provider IN ('agora')),
  agora_channel_name TEXT,
  agora_resource_id TEXT,
  agora_sid TEXT,
  agora_uid TEXT,
  recording_storage_path TEXT,
  recording_duration_seconds INTEGER,
  recording_file_size_bytes BIGINT,
  transcript TEXT,
  transcript_locale TEXT,
  summary TEXT,
  summary_locale TEXT,
  recording_visible_to_parent BOOLEAN NOT NULL DEFAULT FALSE,
  recording_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (recording_status IN ('pending', 'recording', 'processing', 'ready', 'failed')),
  failure_reason TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ,
  transcribed_at TIMESTAMPTZ,
  summarized_at TIMESTAMPTZ,
  consent_acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appt_recordings_appointment
  ON montree_appointment_recordings(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appt_recordings_school_ended
  ON montree_appointment_recordings(school_id, ended_at DESC NULLS LAST)
  WHERE recording_status = 'ready';
CREATE INDEX IF NOT EXISTS idx_appt_recordings_status_pending
  ON montree_appointment_recordings(recording_status, created_at)
  WHERE recording_status IN ('recording', 'processing');

CREATE OR REPLACE FUNCTION update_appt_recording_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appt_recordings_updated_at ON montree_appointment_recordings;
CREATE TRIGGER trg_appt_recordings_updated_at
  BEFORE UPDATE ON montree_appointment_recordings
  FOR EACH ROW EXECUTE FUNCTION update_appt_recording_updated_at();

INSERT INTO montree_feature_definitions (feature_key, name, description, default_enabled, category)
VALUES
  ('agora_video_calls', 'Native video calls (Agora)',
   'When ON, parents booking an appointment with the video-call checkbox get a native-in-Montree Agora video call instead of a Jitsi external URL. Required for video_recording. China-reachable. Pay-per-minute (~$0.99/1000 min video).',
   FALSE, 'communication'),
  ('video_recording', 'Meeting recording + AI summary',
   'When ON (requires agora_video_calls also ON), Agora-provider video calls are recorded to Supabase Storage. Audio is transcribed via Whisper and summarised by Sonnet into a "prior conversation" briefing the next staff member walks into. Parents see a recording banner; staff + principal see transcripts + summaries.',
   FALSE, 'communication')
ON CONFLICT (feature_key) DO NOTHING;

COMMIT;
```

## Step 7 — Flip the flags for Whale Class (1 min)

```sql
INSERT INTO montree_school_features (school_id, feature_key, enabled) VALUES
  ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'agora_video_calls', true),
  ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'video_recording', true)
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
```

Verify:

```sql
SELECT feature_key, enabled FROM montree_school_features
WHERE school_id = 'c6280fae-567c-45ed-ad4d-934eae79aabc'
  AND feature_key IN ('agora_video_calls', 'video_recording');
-- Expected: 2 rows, both enabled=true
```

## Step 8 — Test end-to-end (10 min)

1. Log in to Whale Class as the parent on one device.
2. Log in as the teacher (e.g. yourself) on another device or tab.
3. **Parent:** open `/montree/parent/appointments` → tap **+ Book a meeting** → pick yourself as the recipient → pick a slot a couple minutes from now → at the intake step you should see:
   - ✅ **Video call** checkbox (with "Meet face-to-face..." copy — Agora not Jitsi)
   - ✅ **Record this meeting** sub-checkbox (gold, indented)
   - Tick both. Confirm.
4. **Teacher:** open `/montree/dashboard/appointments` → see the booking in **Upcoming bookings** → tap **Join video call**. Camera/mic permission prompt fires. You're inside Montree's UI now — top-right shows "Meeting with [parent name]". No external Jitsi page.
5. **Parent:** also tap **Join video call**. You should see each other. Both audio + video work.
6. **Teacher:** tap **Record** in the bottom bar. Red banner appears on BOTH screens: *"This meeting is being recorded for the school's records..."*
7. Talk for ~60 seconds. Say something memorable so you can verify the transcript later (e.g. "Eli loves the Pink Tower this week").
8. **Teacher:** tap **Stop recording** → recording stops. Tap **Leave** → call ends.
9. Wait ~60 seconds for the pipeline to run.
10. **Either side:** go back to `/montree/dashboard/appointments` → on the booking row, tap **Show prior conversations**. You should see the summary appear within ~90s of the call ending.

If everything works: you've shipped the killer feature. 🎉

## Step 9 — Monitoring (ongoing)

Watch costs in Agora Console → **Usage** tab. Set a budget alert at $20/month while you're rolling out — gives you a safety net against a runaway loop.

Watch failed recordings:

```sql
SELECT id, appointment_id, recording_status, failure_reason, created_at
FROM montree_appointment_recordings
WHERE recording_status = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

---

## Architectural notes (for future you / future Claude)

- **Both flags MUST be ON for recording to work.** `agora_video_calls=true` enables the provider; `video_recording=true` enables the recording pipeline. The recording-start route checks both server-side as defense in depth.
- **Recording is OPT-IN per appointment** AND requires staff to tap the in-call record button. Parents can't start recording (only see the banner when it's running).
- **Audio-only recording** — saves cost + bandwidth. Whisper doesn't need video.
- **Recordings live in YOUR Supabase Storage bucket.** Agora uploads them via S3-compatible API; they never sit on Agora's infra beyond the upload step.
- **Pipeline is fire-and-forget post-call.** Whisper + Sonnet run asynchronously. The user sees "Recording saved" immediately; the summary appears within a minute.
- **Sonnet summary is locale-aware.** If Whisper detects the audio is in Mandarin, the summary is written in Mandarin too. Voice rules from `summarize.ts`: warm chief-of-staff, ends with `→ ` action line, never invents details.
- **Prior summaries are pulled into Sonnet's context** (up to 3 most-recent) so the briefing references continuity. "Last meeting Mary raised this same concern..." is the kind of phrasing that makes the feature feel like institutional memory.
- **Migration-pending safety:** every route has a 42703 fallback that strips optional columns (`provider`, `recording_enabled`, `video_url`). Production never 500s if 223 isn't run — the feature just doesn't surface.

## Rollback (if something breaks)

To turn it all off without code revert:

```sql
UPDATE montree_school_features
SET enabled = false
WHERE feature_key IN ('agora_video_calls', 'video_recording')
  AND school_id = 'c6280fae-567c-45ed-ad4d-934eae79aabc';
```

Existing Agora-provider appointments will still try to join Agora rooms. To fully revert to Jitsi for future bookings: the flag flip above is enough — new bookings will default to `provider='jitsi'`. Existing Agora-provider rows will keep working until they end naturally or are cancelled.
