-- Migration 278 (optional): stop public buckets from allowing clients to LIST all files.
-- Public buckets still serve files by direct URL (getPublicUrl) without these policies.
-- The only storage .list()/.remove() in the app are SERVER routes (service role, bypasses RLS),
-- so dropping the broad public SELECT policies won't break them.
-- ⚠️ AFTER RUN: confirm images/videos still DISPLAY in the app (they should — public URL access
--    is unaffected). If a gallery breaks, it was relying on client-side list(); tell me and we
--    re-add a scoped policy. Transaction-free + idempotent. Supabase SQL Editor.

DROP POLICY IF EXISTS "Public read access for images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for story media" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to story uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow photo reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow reads" ON storage.objects;
DROP POLICY IF EXISTS "photos_select" ON storage.objects;
DROP POLICY IF EXISTS "videos_select" ON storage.objects;
