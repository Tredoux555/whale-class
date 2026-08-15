# Static asset migration — Aug 2026

Moved (same subpaths) to Supabase Storage bucket `static-assets` @ dmfncjjtsoxrnvcdnvjq.supabase.co:
public/{dark-phonics-books,dark-phonics-materials,satpin-books,satpin-materials,shelf-packs}/ → `<dir>/`
public/montree-splash-video.mp4, public/montree-splash-video-zh.mp4 → `videos/montree-splash-video[-zh].mp4`

Served via next.config.ts `rewrites()` (afterFiles) → internal `/api/montree/media/proxy/[...path]` route (`?bucket=static-assets`, added to that route's bucket allowlist) — no app code changed. NOT rewritten straight to `https://dmfncjjtsoxrnvcdnvjq.supabase.co/...`: montree.xyz is behind Cloudflare, and an external rewrite destination is fetched directly by the browser, which Cloudflare rejected with "Error 1000: DNS points to prohibited IP" on the supabase.co host (the same URL loads fine outside the rewrite). Proxying through the app's own route makes Railway do the supabase.co fetch server-side instead. Audit: zero fs/build-time reads found (see PART 1); all safe to move.

Rollback: `git revert <this-commit>` restores next.config.ts, .dockerignore, and the .gitignore entries below; re-add the files under public/ from the bucket/backup.

Commit step must also add to `.gitignore`:
public/dark-phonics-books/, public/dark-phonics-materials/, public/satpin-books/, public/satpin-materials/, public/shelf-packs/, public/montree-splash-video.mp4, public/montree-splash-video-zh.mp4
