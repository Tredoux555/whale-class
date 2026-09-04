# montree.xyz DNS policy — apex MUST stay Proxied (orange cloud)

**⛔ HARD RULE: NEVER set `montree.xyz` (apex) or `www.montree.xyz` to DNS-only /
grey cloud in Cloudflare. Ever, for any reason.**

Grey cloud exposes Railway's raw edge address directly to visitors. Mainland China's
firewall resets connections to that address, so grey cloud = **montree.xyz becomes
completely unreachable from China** — a large part of the customer base. This is not
theoretical: it happened on Sep 4 2026 (the apex was found switched to DNS-only,
montree.xyz was unreachable on phones in China for hours, laptop only worked because a
full-tunnel VPN routed around it). Full incident report:
`docs/handoffs/HANDOFF_2026-09-04_DNS_CHINA_OUTAGE.md`.

Both `montree.xyz` and `www.montree.xyz` must show the **orange cloud (Proxied)** icon
in Cloudflare → DNS → Records, at all times.

## If Cloudflare Error 1034 ("Edge IP Restricted") ever reappears

Do the following, in order. **Do not grey-cloud anything.**

1. **Keep both records Proxied.** Do not touch the proxy toggle.
2. **Confirm SSL/TLS mode is "Full (strict)"** — Cloudflare dashboard → SSL/TLS →
   Overview. This is required for proxied mode to work correctly against Railway.
3. **Confirm the CNAME target is exactly `kkcmcz76.up.railway.app`** — the address
   Railway currently issues for this service. If Railway has issued a different
   address (check the Railway dashboard → the service → Settings → Domains), update
   the CNAME to match.
4. **Purge Cloudflare's cache** for the zone (Caching → Configuration → Purge
   Everything).
5. **Wait and retry.** Historically this error has been intermittent and appears to
   depend on which Cloudflare point-of-presence answered a given request — it has
   resolved on its own within minutes on past occasions without any config change.
6. **Route server-to-server calls (crons, webhooks) at Railway directly, not through
   montree.xyz.** The GitHub Actions engagement cron currently calls
   `https://montree.xyz/api/montree/cron/engagement`; pointing it at
   `https://kkcmcz76.up.railway.app/api/montree/cron/engagement` instead removes any
   dependency on Cloudflare being healthy for that specific job, and removes the
   "cron is failing, we must change DNS" pressure that caused this exact mistake once
   already. (Recommended, not yet done — see the handoff doc above.)

If none of the above resolves it and the site is materially down for real users, treat
it as a Railway/Cloudflare support question, not a DNS-topology change. **Grey-cloud is
off the table regardless of how bad 1034 gets** — an intermittent Cloudflare error is
always a better outcome than the entire China customer base being unable to load the
site at all.

## History — the old (wrong) advice, and why it was wrong

*Kept for context. Do not follow the instructions below — they describe what this
document used to recommend, and why that recommendation was reversed.*

In June 2026, error 1034 was diagnosed as a "Cloudflare pointing at Cloudflare"
conflict: montree.xyz was proxied (orange cloud), and at the time Railway's edge for
this service *also* appeared to be Cloudflare-backed, which Cloudflare's own edge
refuses to proxy to (hence "Edge IP Restricted"). The fix that got written down then
was to switch montree.xyz and www to DNS-only (grey cloud), pointing the CNAME straight
at Railway's raw address, reasoning that Railway's edge already provided its own
protection so little would be lost.

That reasoning missed the actual cost: grey cloud doesn't just remove Cloudflare's
DDoS/caching layer, it also removes the one thing that was keeping the site reachable
from mainland China. Cloudflare's network is one of the few paths that reliably crosses
the Great Firewall; Railway's raw edge address is not. The old advice was written from
outside China, against data that looked clean from outside China, and the regional
breakage wasn't caught until Sep 4 2026, when it caused a real multi-hour outage for
Chinese users.

As of Sep 4 2026, Railway's edge for this service identifies itself as `railway-hikari`
at a Railway-owned address (not Cloudflare space) — so the original CF-on-CF conflict
that motivated the grey-cloud advice may no longer apply the way it did in June. That's
an inference worth monitoring, not a reason to change anything preemptively. Either
way, the policy above (stay proxied, always) stands regardless of whether 1034 ever
recurs — the downside of grey cloud (China unreachable) is categorically worse than the
downside of an intermittent Cloudflare error.

Related history: `docs/CLAUDE_MD_HISTORY.md` rule #168 (superseded),
`docs/handoffs/HANDOFF_2026-09-04_DNS_CHINA_OUTAGE.md` (full incident writeup).
