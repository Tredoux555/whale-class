# Session 138 Handoff — Region-swap fallout fixed, large-video vault upload, Astra in-chat photo album, i18n auto-detect

**Pushed to main:** `3f8d2b03` → `830443f2` (12 commits). Working tree clean, `HEAD == origin/main`. Railway auto-deployed throughout. SW cache bumped **v9 → v10** (forces PWA shell refresh).

This session started as "the Astra DB is down after we swapped Railway regions" and turned into a multi-feature run: the real cause of the outage, a 3-attempt journey to working large-video upload, an in-chat photo album, and country/browser language auto-detection. **Audit-before-commit became a hard rule this session** (a mobile regression shipped that lint didn't catch — see §6).

---

## 1) THE HEADLINE — the Astra "database is down" outage was NOT the database

After the Session-137 Railway **Amsterdam → Singapore** region move (co-locating with Supabase `ap-southeast-1`), the principal chat (Astra) reported "database genuinely unavailable on every call." The DB was fine. The bug:

- Astra's tools split two ways. Tools that hit **Supabase directly** (`list_classrooms_with_summary`) kept working. Tools that call the app's **own** API routes via `internalGet` (`find_children_by_name` → `/admin/students/search`, `get_child_photos`, briefings) failed with a bare `fetch failed`.
- `internalGet` fetched **`request.nextUrl.origin`** (the PUBLIC `https://montree.xyz`), forcing the container to hairpin out to Railway's edge and back. That loopback worked on the Amsterdam edge but the **Singapore edge blocks it** (`UND_ERR_CONNECT_TIMEOUT`).

**Fix (`3f8d2b03`):** `lib/montree/tracy/tool-executor.ts` — self-fetch the loopback `http://127.0.0.1:${process.env.PORT||3000}` instead of the public origin. The standalone server binds `0.0.0.0:$PORT` (`start.sh`), Next.js routes by pathname not Host, inner routes re-verify via the forwarded cookie. Verified live: inner endpoint returns 200 in ~0.5s from the browser, but the server's self-fetch to it failed every time before the fix; after, `get_child_photos` returns Yo-yo's photos end-to-end.

🚨 **Lesson / rule:** server-to-self HTTP calls must use the loopback, never the public origin. The synthetic-`NextRequest` sites (`photo-audit/resolve`, `photo-identification/batch`) call the handler **in-process** and are NOT affected — only true `fetch()` self-calls hairpin.

---

## 2) Story vault large-video upload — 3 attempts to a working chunked relay

Goal: save a 6-min iPhone video (~535MB) into the Story admin vault. Three walls, found empirically:

1. **Through-server encrypted upload** (`/vault/upload`) is hard-capped ~30MB by Railway's body cap (it buffers + AES-encrypts in memory).
2. **Single direct browser→Supabase PUT** (`uploadToSignedUrl`) hits Supabase's **standard-upload ceiling** — verified 40MB failed from Node, 120MB failed from a browser.
3. **Resumable (TUS) with the anon/public key is REFUSED by Supabase** (403 RLS) on BOTH private and public buckets — it requires a real Supabase user session, which the vault (own admin auth) doesn't have. Adding an anon INSERT RLS policy did NOT help (TUS create still 403). **Only the service_role key drives TUS** (server-side, 201).

**Working solution — server-proxied chunked/resumable relay (`974903f9`, refined `cf169270`):**
- `POST /vault/chunked/init` — server opens a **service-key** Supabase TUS upload, returns the TUS upload URL + object path to the (admin + vault-token gated) client.
- `POST /vault/chunked/chunk` — relays ONE chunk to Supabase TUS with the service key. **SSRF-guarded** (only PATCHes `${SUPABASE_URL}/storage/v1/upload/resumable/...`). Service key never leaves the server. Chunk size **8MB** (was 24MB — smaller is lighter on mobile-Safari memory + safely under the proxy cap; ≥ Supabase's 5MB part minimum).
- `POST /vault/finalize` — inserts the `vault_files` row UNENCRYPTED (`encrypted_key='plain'`, `file_hash` sentinel) in the private `vault-secure` bucket.
- `GET /vault/signed-download/[id]` — short-lived signed url for `plain` files, served **INLINE** (no download disposition) so it plays/displays; range-seekable (206). `list` route returns an `encrypted` flag so the client picks decrypt-proxy vs signed-url.
- Client (`useVault.handleVaultUpload`): files >20MB → init→chunks→finalize with per-chunk retry + a **byte-level progress bar** (VaultTab); ≤20MB keep the encrypted path.

**Trade-off (approved by Tredoux):** large videos are stored UNENCRYPTED in the private bucket — gated by admin auth + 1h vault token + short-lived signed urls. Small files stay AES-encrypted.

**Manual data actions this session (NOT code):**
- `vault-secure` bucket `file_size_limit` raised **0/null → 1GB** via the storage API.
- The actual 535MB `IMG_3376.MOV` was uploaded to `vault-secure` from the Mac via **service-key TUS curl chunks** (the Mac↔Supabase Node path is flaky with `UND_ERR_CONNECT_TIMEOUT` — curl `--retry` survives it) and registered as **`vault_files` row id=34**. See memory `montree_story_vault_large_media`.
- Temporary anon INSERT/UPDATE RLS policies on `storage.objects` for `vault-secure` were added during investigation and then **DROPPED** — security posture is unchanged.

**⚠️ Still open (needs Tredoux):** the in-app iPhone upload — user reported it still failing. Strong suspect is the **stale v9 PWA shell** running the OLD 30MB-reject code; v10 bump should fix on next app reopen. If it still fails after a full app restart, need the exact failure point (immediate reject / stalls / errors at finalize) to pinpoint a real bug. The chunked relay endpoints are deployed (401 when unauthed) but the full init→chunk→finalize flow was NOT verified end-to-end from a real client (no vault password in the sandbox).

**Videos now play in the gallery (`cf169270`):** videos sit in the SAME grid as photos (▶ tiles), tapping opens the same full-screen `VaultImageViewer` which plays `<video controls playsInline>` inline (plain → signed url; encrypted → decrypt-proxy blob). "Other Files" now only lists true non-media files.

DB host note: the direct `db.<ref>.supabase.co` host **no longer resolves**; use the pooler `aws-1-ap-southeast-1.pooler.supabase.com:5432`, user `postgres.<ref>`, password from `DATABASE_URL`.

---

## 3) Astra in-chat photo album with category filter (`c66b2401`, `edbdfc2f`, `830443f2`)

The principal couldn't SEE photos (`get_child_photos` rendered as raw markdown text; then as inline thumbnails that opened new browser tabs). Now:

- `get_child_photos` resolves each photo's **curriculum area** (`work.area_id` is a UUID → `montree_classroom_curriculum_areas.area_key` slug → `getAreaLabel`); photos with no work are **Observations**. Default limit 12→24 (cap 60). ⚠ `edbdfc2f` fixed a bug where the raw UUID was used as the label — caught in live verification.
- `principal-agent` route emits a structured **`child_photos` SSE event** (mirrors the `meeting_brief` pattern) so categories come from DATA, not parsed text.
- New `components/montree/admin/ChildPhotoAlbum.tsx`: category chips (All + areas present + Observations), square grid, tap → full-screen `PhotoLightbox` (swipe / arrow / pinch-zoom) over the FILTERED set. **Rendered via `createPortal(document.body)`** so the fixed overlay escapes the chat column's transform/stacking context (otherwise the close ✕ was unreachable — `830443f2`).
- System prompt updated: Astra writes a short narrative and does NOT paste image markdown (the UI renders the album).

Verified live: 30 thumbnails + chips `All(30) Practical Life(5) Sensorial(6) Language(4) Mathematics(1) Cultural(5) Observations(9)`.

`TracyBody.tsx` still has the older inline-image renderer (`c7b57d98`) as a fallback; historical messages may still show new-tab thumbnails until re-asked.

---

## 4) i18n first-visit auto-detection (`4f3ec701`, `6283837a`)

On a brand-new visitor's first Montree page load, `middleware.ts` seeds the `mt_locale` cookie. Precedence: **browser `Accept-Language` → country (`cf-ipcountry`) → English**. Only when no `mt_locale` cookie exists (manual switcher choice always wins). The layout reads `mt_locale` server-side → correct language on first paint, no flash.

- `lib/montree/i18n/country-locale.ts`: `localeForCountry()` (ISO country → supported locale, multilingual countries → plurality, else `en`) + `localeFromAcceptLanguage()` (q-weighted, region subtags reduced: `pt-BR`→`pt`).
- Cloudflare is confirmed in front (`cf-ray`, `server: cloudflare`), so `cf-ipcountry` is free — no IP lookup. Verified live: browser=es + IP=DE → `es`; unsupported browser lang → falls back to country; existing cookie → not overridden.

---

## 5) Every commit this session

| Commit | What |
|---|---|
| `3f8d2b03` | **Astra outage fix** — internal self-fetch → `127.0.0.1:$PORT` not the public origin (Singapore edge blocked the hairpin). |
| `2729e804` | Vault large video v1: direct browser→Supabase signed PUT + `signed-download` + `finalize` + `encrypted` flag. *(single-PUT superseded by chunked.)* |
| `c7b57d98` | Astra: inline child-photo thumbnails in `TracyBody`. *(superseded by the album.)* |
| `974903f9` | **Vault server-proxied chunked upload** (`/vault/chunked/init` + `/chunked/chunk`) — the working large-file path. |
| `4f3ec701` | i18n: auto-pick UI language from country (Cloudflare), English fallback. |
| `6283837a` | i18n: prefer browser `Accept-Language` over country. |
| `6771dc23` | Vault: fix media not opening on mobile (`window.open` after `await` blocked on iOS) + serve signed media inline. |
| `c66b2401` | **Astra in-chat photo album** + category filter (structured `child_photos` SSE). |
| `edbdfc2f` | Album: resolve work `area_id` UUID → `area_key` slug (labels were raw UUIDs). |
| `cf169270` | Vault: **videos play inline in the gallery** + upload chunk 24MB→8MB. |
| `212fe8db` | **SW cache v9 → v10** — force iPhone PWA onto the new uploader + album. |
| `830443f2` | Album: portal the full-screen viewer to `<body>` so the close ✕ is reachable. |

---

## 6) Architectural rules locked this session

1. **Server-to-self HTTP calls use `http://127.0.0.1:$PORT`, never the public origin.** The public hairpin breaks on Railway region/edge changes. (In-process synthetic-`NextRequest` calls are fine.)
2. **Large media into the vault = service-key TUS chunked relay through our server.** Supabase refuses public-key resumable uploads and single-PUT has a ~30MB ceiling. Client chunks ≤8MB (under the proxy cap, ≥5MB Supabase part min).
3. **Signed vault download urls are served INLINE** (no `download` disposition) so video plays; range-seekable.
4. **`window.open()` after an `await` is BLOCKED on mobile** (iOS Safari drops the user-activation). Open the tab synchronously inside the tap, then set its location; same-tab fallback.
5. **Full-screen overlays inside the chat column must `createPortal` to `<body>`** — an ancestor transform traps `position:fixed`.
6. **Structured chat artifacts (photos, briefs) ride a dedicated SSE event**, not parsed-out markdown — reliable + lets the model keep prose short.
7. 🚨 **AUDIT BEFORE COMMIT (hard rule, saved to memory `feedback_audit_before_commit`).** Lint is not enough — trace each changed user path end-to-end incl. **mobile/iOS**. This session shipped a `window.open`-after-await mobile regression and a raw-UUID label bug that lint passed; both were caught only by live verification / the user.

---

## 7) Verify on production (after v10 settles)

- **iPhone:** fully quit + reopen the app (gets v10), then upload a long video from the Story vault → expect the chunked uploader + byte progress bar → lands in the gallery.
- **Vault gallery:** unlock → photos AND videos in one grid; tap a video → plays inline full-screen; swipe through.
- **Astra album:** ask "show me [child]'s photos" → filterable album, tap a photo → full-screen, **✕ top-left closes it** (+ Esc / ‹ ›).
- **i18n:** a fresh browser in a supported-language locale → Montree opens in that language; manual switch sticks.

## 8) Open / next

1. **iPhone in-app upload** — confirm v10 fixed it; if not, get the exact failure point. The chunked flow was never verified end-to-end from an authed client.
2. `TracyBody` inline-image renderer is now redundant for `get_child_photos` (album owns it) — could remove to avoid double-render if the model ever slips back to markdown.
3. The single-PUT `/vault/signed-upload` route (`2729e804`) is now dead code (superseded by chunked) — safe to delete.
4. Album/lightbox arrow-keys navigate while a video is open — minor (video has its own controls).

---
**End of Session 138 handoff.** Headline: the "DB outage" was a public-origin self-fetch hairpin; the vault now takes any-size video via a service-key chunked relay; Astra has a real photo album; first-visit language auto-detects. Hard rule going forward: **audit the diff (incl. mobile) before every commit.**
