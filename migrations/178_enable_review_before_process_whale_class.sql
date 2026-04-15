-- Migration 178: Enable `review_before_process` for Whale Class
--
-- Flips on the Photo Bucket workflow. New photos from the capture page land
-- with identification_status='pending_review' and NO AI fires until the
-- teacher selects keepers in the Photo Bucket tab and taps "Process selected".
--
-- Run in Supabase SQL editor. Idempotent.

INSERT INTO montree_school_features (school_id, feature_key, enabled)
VALUES ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'review_before_process', true)
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
