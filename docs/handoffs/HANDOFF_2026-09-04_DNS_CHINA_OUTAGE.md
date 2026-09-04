# HANDOFF — Sep 4 2026 — montree.xyz unreachable from mainland China (DNS)

**Who this is for:** Tredoux, non-technical read. If you only read one section, read
"What to do from now on."

## What happened

On the morning of Sep 4 2026 (Beijing time), montree.xyz stopped loading on an iPhone
inside mainland China. Safari showed "the server stopped responding" — that's a broken
connection, not a slow one. It happened with the phone's VPN on or off. A laptop in the
same room worked fine, but only because it was running Astrill in full-tunnel mode,
which routes every request through a server outside China — so the laptop wasn't
actually reaching montree.xyz "directly," it was tunnelling around whatever was
blocking it.

From outside China, the site was completely fine: montree.xyz returned normal 200 OK
responses, Railway (the hosting service) reported healthy, and every recent deploy had
succeeded. So this was not a code problem, not a hosting problem, and not a "the app is
down" problem — it only affected reachability from inside China.

## Root cause

montree.xyz sits behind Cloudflare, a service that sits in front of Railway (our actual
host) and does two relevant things: it hides Railway's real server address behind its
own network, and it's reachable from mainland China. Cloudflare calls this "proxied"
mode, shown as an **orange cloud** icon next to a DNS record in its dashboard. The
opposite setting, **grey cloud** ("DNS only"), turns that off — visitors then connect
straight to Railway's real address, no Cloudflare in the middle.

The montree.xyz apex record (the plain "montree.xyz" address, as opposed to
"www.montree.xyz") had been switched to grey cloud — DNS only. That exposed Railway's
raw server address (69.46.46.33) directly to visitors. China's national firewall resets
connections to that address. Cloudflare's network is one of the few paths through the
firewall that reliably stays open, so removing Cloudflare from the montree.xyz apex is
effectively "turn off China access."

`www.montree.xyz` had been left on orange cloud (proxied) the whole time, which is why
it still worked — it just automatically forwards visitors on to the plain montree.xyz
address, where they'd then hit the same wall.

## The fix

Switched the montree.xyz apex record back to Proxied (orange cloud) in the Cloudflare
dashboard. Confirmed the SSL/TLS mode was already set to "Full" (needed for proxied
mode to work correctly). Verified after the change:

- montree.xyz's address now resolves to Cloudflare's network, not Railway's raw address.
- /montree loads (200 OK).
- /montree/login loads (200 OK).
- The teacher login API correctly rejects a bad request (401, as expected).
- Every response now carries `server: cloudflare` in its headers, confirming
  Cloudflare is back in front of the site.
- The phone in China works again.

## What we ruled out

Before finding the DNS cause, the following were checked and are all clean — noted here
so nobody re-checks them next time this happens:

- **Railway itself** — healthy, all deploys SUCCESS, no errors in logs.
- **App code** — no relevant recent changes; site works fine from outside China.
- **Mobile browser / user agent handling** — nothing in the code singles out mobile or
  China-region requests.
- **Service worker** — not implicated; this was a connection-level block, not a caching
  or app-shell issue.
- **middleware.ts / next.config.ts** — diffed against recent history, no changes that
  would explain a region-specific block.

## Open question: who (or what) flipped the DNS record?

Unknown. Cloudflare's Audit Log was checked for the account covering Aug 5 – Sep 4
2026, including all user-level activity, and it shows **no entry** for the record being
switched to DNS-only. That's odd — a manual dashboard change should normally leave a
trail. Possibilities, none confirmed: a change made through a path the audit log
doesn't capture, an API/automation change, or a Cloudflare-side change we can't see
from this account. This is worth keeping an eye on — if it happens again, that's a
strong signal it's not a one-off.

## Why this happened — the repo itself told us to do it

This is the important part. The last time Cloudflare gave us trouble (mid-June, error
"1034 / Edge IP Restricted"), the fix that got written down was **the opposite** of what
China access needs. Specifically:

- `CLAUDE.md` (the main project instructions file) said, in effect: "the fix is to
  switch montree.xyz and www to DNS-only (grey cloud)."
- `docs/DNS_ERROR_1034_FIX.md` gave step-by-step instructions to do exactly that.
- `docs/CLAUDE_MD_HISTORY.md` rule #168 said "once DNS-only, keep it DNS-only."

In other words: any future session (human or AI) that ran into a Cloudflare error and
consulted these files would have been told to re-break China access, believing it was
fixing something. That's almost certainly related to how the apex record ended up
grey-cloud in the first place, even though there's no audit-log record of exactly when
or how.

**This session corrected all three documents** so they now say the opposite: montree.xyz
must stay proxied, full stop. See "Files changed" below.

### Background on the original 1034 error, for context

Error 1034 happens when Cloudflare is proxying a domain whose origin server is *also*
behind Cloudflare — a "Cloudflare pointing at Cloudflare" conflict. In June, Railway's
edge for our service did appear to be Cloudflare-backed, which could trigger exactly
that conflict, and would explain the intermittent 403s seen back then. Today, Railway's
edge for this service identifies itself as `railway-hikari` at 69.46.46.33 — Railway's
own edge, not Cloudflare address space. So the original 1034 conflict may simply no
longer apply the way it used to. That's an inference, not a proven fact — worth
watching, not something to act on by grey-clouding anything.

The documented, Railway-approved way to stay proxied *and* avoid 1034 is: Cloudflare SSL
mode = Full (strict), and the DNS record's CNAME target = the exact
`kkcmcz76.up.railway.app` address Railway issued. That's the configuration this session
left in place.

## What to do from now on

**Hard rule: montree.xyz and www.montree.xyz must always show an orange cloud
(Proxied) in the Cloudflare dashboard. Never grey cloud / DNS only.** Grey cloud
means mainland China cannot reach the site at all — and a large part of our customer
base is there.

If a Cloudflare error (1034 or otherwise) shows up again:
1. Do **not** switch to DNS-only.
2. Confirm SSL/TLS mode is still "Full (strict)."
3. Confirm the DNS record's CNAME target is still `kkcmcz76.up.railway.app`.
4. Purge Cloudflare's cache for the zone.
5. Wait and retry — Cloudflare errors here have historically been intermittent /
   dependent on which of Cloudflare's global points-of-presence answered the request.
6. Full details and the current step-by-step: `docs/DNS_ERROR_1034_FIX.md` (rewritten
   this session to reflect the correct policy).

### A separate, real fix worth doing later: stop routing server-to-server calls through montree.xyz

Part of why grey-cloud advice got written down in June is that GitHub's engagement
cron job — the scheduled job that sends trial-lifecycle emails and the Friday
report-ready push — calls `https://montree.xyz/api/montree/cron/engagement`, and during
the 1034 episodes that call was failing (401/403), which read as urgent pressure to
"fix" the DNS.

Only one workflow in this repo calls montree.xyz directly:

- **`.github/workflows/engagement-cron.yml`** — POSTs to
  `https://montree.xyz/api/montree/cron/engagement` every hour.

Recommendation for later (not done in this session, per instruction — this is a
heads-up, not a change): have that workflow call Railway's own address directly
(`https://kkcmcz76.up.railway.app/api/montree/cron/engagement`, same path and header)
instead of going through montree.xyz / Cloudflare. That way a future Cloudflare hiccup
can never again look like an urgent reason to touch DNS — the cron just keeps working
regardless of Cloudflare's state.

## Automated safety net added this session

A new scheduled GitHub Actions check, `.github/workflows/dns-guard.yml`, now runs every
30 minutes. It checks that montree.xyz still resolves to a Cloudflare address and that
the site responds through Cloudflare (200 OK with a `server: cloudflare` header). If
two optional secrets are configured (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`), it
will attempt to automatically flip the record back to Proxied if it's ever found
DNS-only, then re-check. Either way, if the site is still unhealthy at the end of the
run, the GitHub Actions job fails, which sends an email to the repo owner. See the
comments at the top of that file for how to add the two secrets if you want the
auto-heal step active (it's a no-op without them — the check still runs and still
alerts).

## Files changed this session

- `docs/handoffs/HANDOFF_2026-09-04_DNS_CHINA_OUTAGE.md` — this document.
- `docs/DNS_ERROR_1034_FIX.md` — rewritten: correct policy (stay proxied), old grey-cloud
  advice kept only as a labeled "history" section explaining why it was wrong.
- `CLAUDE.md` — replaced the grey-cloud "fix" sentence near the Aug 18 health-check
  session note with a warning pointing here; added a new numbered permanent rule.
- `docs/CLAUDE_MD_HISTORY.md` — rule #168 appended with a "SUPERSEDED" note (history is
  kept, not deleted, per this repo's convention).
- `.github/workflows/dns-guard.yml` — new scheduled health check + optional auto-heal.
