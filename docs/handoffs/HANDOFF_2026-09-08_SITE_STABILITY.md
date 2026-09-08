# HANDOFF 2026-09-08 — Site stability (montree.xyz / teacherpotato.xyz)

## Symptoms
- montree.xyz and www.teacherpotato.xyz loading unreliably: intermittent
  timeouts / "not available" over the last 48h, recovering on their own.

## Diagnosis
1. **Deploy churn on a single replica.** ~15 deploys in 48h against one replica
   in asia-southeast1. Every deploy is a full cold window with no second
   instance to serve traffic — each push = a visible outage.
2. **Healthcheck killed a live container.** Deploy `33dcae53` was terminated by
   Railway's healthcheck (`healthcheckTimeout: 60`) even though the server had
   already logged "Ready". `start.sh` runs `timeout 20 pip3 install yt-dlp`
   before starting node, so the port bind can land past the 60s budget.
3. **Stale CNAMEs.** Railway's current requiredValue is
   montree.xyz → `1qt6rnhm.up.railway.app` and
   www.teacherpotato.xyz → `r6fp1yd3.up.railway.app`.
   DNS still points at the retired `kkcmcz76.up.railway.app`, which returns
   "Application not found" when hit directly — it only still works via
   host-header routing, which is not something to rely on.
4. **teacherpotato.xyz apex is not on Cloudflare.** It is an AWS-backed
   registrar HTTP forwarder (A → AWS Global Accelerator) that 301s to
   **http://**www.teacherpotato.xyz — plaintext hop, no proxy, no control.

## Changed in this commit
- `railway.json`: `healthcheckTimeout` 60 → 300, so a slow port bind no longer
  gets a healthy container killed.
- `docs/DNS_ERROR_1034_FIX.md`: canonical CNAME target is now described as
  "whatever Railway shows as the required CNAME value for that domain";
  `kkcmcz76.up.railway.app` marked RETIRED (both the DNS step and the
  cron-routing recommendation).
- `docs/handoffs/HANDOFF_SESSION_163_DOMAIN_ISOLATION.md`: DNS architecture
  block no longer pins `kkcmcz76`.

No workflow called `kkcmcz76.up.railway.app` as a URL, so no workflow URLs were
changed. `dns-guard.yml` logic is untouched and still enforces `proxied=true`.

## Manual to-dos (dashboard work, not in this repo)
1. **Railway → project → service `whale-class` → Settings → Regions →
   asia-southeast1: replicas 1 → 2.** This is the single highest-value fix —
   it removes the deploy-window outage entirely.
2. **Cloudflare → montree.xyz → DNS: repoint the CNAME to
   `1qt6rnhm.up.railway.app`.** Keep it **Proxied (orange cloud)**, SSL/TLS mode
   **Full**. Do not grey-cloud.
3. **Cloudflare → www.teacherpotato.xyz: repoint to `r6fp1yd3.up.railway.app`,
   also Proxied.**
4. **teacherpotato.xyz apex:** move it onto Cloudflare as a proxied record, or
   at minimum change the registrar redirect to target
   **https://**www.teacherpotato.xyz instead of http://.
5. **Batch deploys.** Do not push several commits minutes apart — each push is a
   restart. Group changes and push once; with 2 replicas this stops mattering,
   but until then it is the main source of user-visible flakiness.

## Do not
- Do not "fix" any CNAME back to `kkcmcz76.up.railway.app`. It is retired.
- Do not grey-cloud montree.xyz (China traffic depends on the proxy).
