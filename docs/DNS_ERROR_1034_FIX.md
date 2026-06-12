# Cloudflare Error 1034 on montree.xyz — diagnosis + 2-minute fix

**Seen:** Jun 12 ~23:03 (Ray ID a0a9be54be090a1b) on /montree/super-admin — "Edge IP Restricted".
**Status:** INTERMITTENT. At 23:20 the site answered 12/12 probes fine. Overnight
monitor running → `~/Desktop/montree_uptime_overnight.log` (probe every 2 min;
kill with `pkill -f montree_monitor`).

## Diagnosis

- `montree.xyz` resolves to Cloudflare proxied IPs (104.21.68.162 / 172.67.196.225)
  → the zone record is **orange-cloud (proxied)**.
- The Railway origin `whale-class.up.railway.app` resolves to Railway edge
  (69.46.46.14 / .51) — but Railway serves parts of its edge **via Cloudflare**,
  and when Cloudflare's resolver gets a Cloudflare-owned IP for the CNAME target
  it refuses with **Error 1034 (Edge IP Restricted)** — Cloudflare-on-Cloudflare.
  That's why it's intermittent rather than constant.
- Could not fix overnight: dash.cloudflare.com never finishes loading from the
  China network with VPN off (static assets load, API calls hang), and there is
  no CF API token on this machine.

## The fix (Tredoux, ~2 min, VPN ON)

1. dash.cloudflare.com → zone **montree.xyz** → **DNS → Records**.
2. Find the record(s) for `montree.xyz` (@) and `www` — CNAME → `…up.railway.app`.
3. Click edit → toggle **Proxy status** from Proxied (orange cloud) to
   **DNS only (grey cloud)** → Save. Both records.
4. Verify: `dig +short montree.xyz` should return 69.46.46.x (Railway edge)
   within a few minutes. Site keeps working during the switch (Railway issues
   its own cert for montree.xyz, so TLS stays valid).

## Tradeoffs / notes

- Grey cloud = no Cloudflare DDoS shield/caching on the apex. Railway's edge is
  itself Cloudflare-backed, so you lose little; and CF-proxy from China was
  adding flakiness anyway.
- If you'd rather keep the orange cloud: Cloudflare SSL mode must be
  **Full (strict)** and you accept the residual 1034 risk — Railway's official
  guidance for Cloudflare users is DNS-only.
- This pairs with the planned **Railway region pin → Singapore** (biggest TTFB
  win for the Asia user base; 1–2 min 503 window on the next deploy after the
  pin — do it at a quiet hour).
