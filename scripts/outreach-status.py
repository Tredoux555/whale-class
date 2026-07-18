#!/usr/bin/env python3
"""outreach-status.py — CLI for the Montree super-admin outreach pipeline.

Flip email status + social status from the terminal instead of clicking
dropdowns in the browser super-admin UI. Stdlib only (urllib / csv / json / os).

Auth: reads SUPER_ADMIN_PASSWORD from the repo's .env.local, POSTs it to
/api/montree/super-admin/auth, holds the returned JWT in the
x-super-admin-token header for every subsequent call (exactly like the UI).

Contracts (verified against the routes, Jul 2026):
  - POST /api/montree/super-admin/auth  {password} -> {authenticated, token}
  - GET  /api/montree/super-admin/global-outreach?view=contacts&all=1&q=<term>
         -> {contacts:[...], total}   (searches org_name + email, whole table)
  - PATCH /api/montree/super-admin/campaign-manager {id, status}  (email status)
  - PATCH /api/montree/super-admin/global-outreach {action:set_social, id,
          social_status}                                          (social status)
  - GET  /api/montree/super-admin/outreach?view=stats            (by-status totals)

Subcommands:
  find "<name or email>"
  set-status --id <id> --status <value>
  set-status --csv file.csv     (columns: match, country?, status)
  set-social --csv file.csv     (columns: match, country?, social_status)
  counts

Exit non-zero if any row ERRORs.
"""

import argparse
import csv
import json
import os
import sys
import urllib.request
import urllib.error

DEFAULT_BASE_URL = "https://montree.xyz"

# Allowed EMAIL statuses — the campaign-manager PATCH accepts any string, but
# the DB CHECK + the dashboard stats enumerate exactly these. Never invent one.
EMAIL_STATUSES = {
    "new", "drafted", "sent", "replied", "bounced",
    "converted", "dead", "demo_requested", "contacted", "follow_up",
    "pilot",
}
# Ladder rank for downgrade protection. Higher = later in the pipeline.
# Terminal / off-ladder states get a high rank so we never clobber them.
EMAIL_RANK = {
    "new": 0,
    "drafted": 1,
    "contacted": 1,
    "sent": 2,
    "follow_up": 2,
    "demo_requested": 3,
    "replied": 3,
    "bounced": 3,       # a bounce is a terminal outcome of a send
    "pilot": 4,         # V2.1 (migration 294): actively piloting, pre-convert
    "converted": 5,
    "dead": 5,
}

# Allowed SOCIAL statuses (migration 289 / global-outreach SOCIAL_STATUS_SET).
SOCIAL_STATUSES = {
    "none", "found", "invited", "messaged", "replied", "connected", "dead",
}
SOCIAL_RANK = {
    "none": 0, "found": 1, "invited": 2, "messaged": 2,
    "replied": 3, "connected": 4, "dead": 4,
}


# ── env + http ──────────────────────────────────────────────────────────────

def load_env(repo_root):
    """Parse .env.local for the values we need (no external deps)."""
    env = {}
    path = os.path.join(repo_root, ".env.local")
    if not os.path.isfile(path):
        sys.exit(f"ERROR: .env.local not found at {path}")
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            env[k] = v
    return env


TOKEN_CACHE = os.path.join("/tmp", "montree_super_admin_token.json")


class Client:
    def __init__(self, base_url, password):
        self.base = base_url.rstrip("/")
        self.password = password
        self.token = None
        self._load_cached_token()

    def _load_cached_token(self):
        """Reuse a recently-minted token from /tmp. The auth route is rate
        limited to 5 logins / 15 min (fail-closed), so we must NOT log in on
        every invocation. Tokens live 1h; we treat a <50-min-old cache as good."""
        try:
            import time
            with open(TOKEN_CACHE, "r", encoding="utf-8") as f:
                c = json.load(f)
            if c.get("base") == self.base and time.time() - c.get("ts", 0) < 3000:
                self.token = c.get("token")
        except Exception:
            pass

    def _save_cached_token(self):
        try:
            import time
            with open(TOKEN_CACHE, "w", encoding="utf-8") as f:
                json.dump({"token": self.token, "base": self.base, "ts": time.time()}, f)
        except Exception:
            pass

    def _request(self, method, path, body=None, auth=True):
        url = self.base + path
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Content-Type", "application/json")
        # Cloudflare (error 1010) rejects the default python-urllib UA. Present
        # a normal browser UA + accept headers so the edge lets us through.
        req.add_header(
            "User-Agent",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        )
        req.add_header("Accept", "application/json, text/plain, */*")
        req.add_header("Accept-Language", "en-US,en;q=0.9")
        req.add_header("Referer", self.base + "/montree/super-admin")
        req.add_header("Origin", self.base)
        if auth:
            if not self.token:
                self.login()
            req.add_header("x-super-admin-token", self.token)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read().decode("utf-8")
                return resp.status, (json.loads(raw) if raw else {})
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", "replace")
            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = {"error": raw[:300]}
            return e.code, parsed
        except urllib.error.URLError as e:
            return 0, {"error": f"network error: {e.reason}"}

    def login(self):
        status, body = self._request(
            "POST", "/api/montree/super-admin/auth",
            {"password": self.password}, auth=False,
        )
        if status != 200 or not body.get("token"):
            sys.exit(f"ERROR: super-admin login failed ({status}): "
                     f"{body.get('error', body)}")
        self.token = body["token"]
        self._save_cached_token()

    # ── API wrappers ──
    def search(self, q):
        """Search contacts by org_name/email across the whole table."""
        from urllib.parse import quote
        path = (f"/api/montree/super-admin/global-outreach"
                f"?view=contacts&all=1&limit=200&q={quote(q)}")
        status, body = self._request("GET", path)
        if status != 200:
            raise RuntimeError(f"search failed ({status}): {body.get('error', body)}")
        return body.get("contacts", [])

    def get_by_id(self, contact_id, name_hint, country=None, email_hint=None):
        """Re-fetch a single row to confirm a write landed. global-outreach
        search matches org_name/email only, so we search a hint and pick the
        row whose id matches. Try the email first (unique, no comma/paren
        sanitizer trouble), then a short prefix of the org_name (the full name
        may contain commas/parens that the server's .or() sanitizer strips,
        making an exact-name search miss)."""
        hints = []
        if email_hint:
            hints.append(email_hint)
        if name_hint:
            # first 3 words, stripped of punctuation the sanitizer would drop
            import re
            words = re.sub(r"[(),]", " ", name_hint).split()
            if words:
                hints.append(" ".join(words[:3]))
            hints.append(name_hint)
        for h in hints:
            try:
                rows = self.search(h)
            except Exception:
                continue
            for r in rows:
                if r.get("id") == contact_id:
                    return r
        return None

    def set_email_status(self, contact_id, status):
        return self._request(
            "PATCH", "/api/montree/super-admin/campaign-manager",
            {"id": contact_id, "status": status},
        )

    def set_social_status(self, contact_id, social_status):
        return self._request(
            "PATCH", "/api/montree/super-admin/global-outreach",
            {"action": "set_social", "id": contact_id, "social_status": social_status},
        )

    def stats(self):
        status, body = self._request(
            "GET", "/api/montree/super-admin/outreach?view=stats")
        if status != 200:
            raise RuntimeError(f"stats failed ({status}): {body.get('error', body)}")
        return body.get("stats", {})


# ── row resolution ────────────────────────────────────────────────────────────

def resolve_row(client, match, country=None):
    """Find the single contact matching `match` (name or email), optionally
    narrowed by country. Returns (row, candidates).

    - If an exact email match exists, prefer it (unique).
    - Else if exactly one row matches, use it.
    - Country filter is applied case-insensitively when supplied.
    Returns (row, []) on a clean single match; (None, candidates) otherwise.
    """
    match = (match or "").strip()
    if not match:
        return None, []
    rows = client.search(match)

    # Narrow by country if given.
    if country:
        cc = country.strip().lower()
        narrowed = [r for r in rows if (r.get("country") or "").strip().lower() == cc]
        if narrowed:
            rows = narrowed

    if not rows:
        return None, []

    # If match looks like an email, prefer an exact (case-insensitive) email hit.
    if "@" in match:
        exact = [r for r in rows if (r.get("email") or "").strip().lower() == match.lower()]
        if len(exact) == 1:
            return exact[0], []
        if len(exact) > 1:
            return None, exact
        # fall through to name handling if no exact email hit

    # Exact org_name match (case-insensitive) collapses near-duplicates.
    exact_name = [r for r in rows if (r.get("org_name") or "").strip().lower() == match.lower()]
    if len(exact_name) == 1:
        return exact_name[0], []
    if len(exact_name) > 1:
        return None, exact_name

    if len(rows) == 1:
        return rows[0], []
    return None, rows


def fmt_candidate(r):
    return (f"{(r.get('org_name') or '')[:40]:40} | "
            f"{(r.get('country') or '')[:14]:14} | "
            f"{(r.get('email') or '')[:34]:34} | "
            f"status={r.get('status')} | id={r.get('id')}")


# ── subcommands ───────────────────────────────────────────────────────────────

def cmd_find(client, args):
    rows = client.search(args.query)
    if not rows:
        print(f"NOT_FOUND: no contacts match {args.query!r}")
        return 0
    print(f"{len(rows)} match(es) for {args.query!r}:")
    print(f"{'id':36} | {'org_name':34} | {'country':12} | "
          f"{'email':32} | {'status':10} | social")
    print("-" * 150)
    for r in rows:
        print(f"{(r.get('id') or ''):36} | "
              f"{(r.get('org_name') or '')[:34]:34} | "
              f"{(r.get('country') or '')[:12]:12} | "
              f"{(r.get('email') or '')[:32]:32} | "
              f"{(r.get('status') or ''):10} | "
              f"{r.get('social_status') or '-'}")
    return 0


def _apply(client, match, country, target, axis, allow_downgrade=False):
    """Resolve + flip one row on the given axis ('email' or 'social').
    Returns (outcome, detail) where outcome is OK/SKIP/AMBIGUOUS/NOT_FOUND/ERROR.
    """
    valid = EMAIL_STATUSES if axis == "email" else SOCIAL_STATUSES
    rank = EMAIL_RANK if axis == "email" else SOCIAL_RANK
    cur_field = "status" if axis == "email" else "social_status"

    if target not in valid:
        return "ERROR", f"invalid {axis} status {target!r} (allowed: {sorted(valid)})"

    row, candidates = resolve_row(client, match, country)
    if row is None:
        if candidates:
            lines = "\n".join("      " + fmt_candidate(c) for c in candidates[:8])
            return "AMBIGUOUS", f"{len(candidates)} candidates:\n{lines}"
        return "NOT_FOUND", f"no row for {match!r}" + (f" / {country}" if country else "")

    current = (row.get(cur_field) or ("none" if axis == "social" else "new"))
    # Downgrade protection. --allow-downgrade overrides it for intentional
    # moves like bounce-recovery re-drafts (bounced -> drafted on a corrected
    # address). 'replied'/'converted' are still guarded even then.
    is_downgrade = rank.get(current, 0) > rank.get(target, 0)
    hard_guard = current in ("replied", "converted", "demo_requested")
    if is_downgrade and (hard_guard or not allow_downgrade):
        return "SKIP", f"already at later status {current!r} (won't set {target!r})"
    if current == target:
        return "SKIP", f"already {target!r}"

    if axis == "email":
        status, body = client.set_email_status(row["id"], target)
        ok = status == 200 and body.get("success")
    else:
        status, body = client.set_social_status(row["id"], target)
        ok = status == 200 and body.get("contact")

    if ok:
        return "OK", f"{row.get('org_name')} : {current} -> {target}"

    # The campaign-manager PATCH has a known server-side quirk: it flips the row
    # in the DB but then throws on its own audit-log insert (a Supabase builder
    # `.catch()` footgun), returning a bare 500 with an empty body. The write
    # itself lands. So on a non-200 we VERIFY by re-reading the row: if it now
    # shows the target status, report OK; otherwise it's a real ERROR.
    verify = client.get_by_id(row["id"], row.get("org_name") or match, country,
                              email_hint=row.get("email"))
    if verify and (verify.get(cur_field) or "") == target:
        return "OK", f"{row.get('org_name')} : {current} -> {target} (verified; API returned {status})"
    return "ERROR", f"PATCH failed ({status}): {body.get('error', body)}"


def cmd_set_status(client, args):
    return _run_flips(client, args, axis="email")


def cmd_set_social(client, args):
    return _run_flips(client, args, axis="social")


def _run_flips(client, args, axis):
    status_col = "status" if axis == "email" else "social_status"
    jobs = []  # (label, match, country, target)

    if getattr(args, "csv", None):
        with open(args.csv, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            fields = {k.lower(): k for k in (reader.fieldnames or [])}
            if "match" not in fields or status_col not in fields:
                sys.exit(f"ERROR: CSV must have 'match' and '{status_col}' columns "
                         f"(got {reader.fieldnames})")
            for row in reader:
                match = (row.get(fields["match"]) or "").strip()
                if not match:
                    continue
                country = (row.get(fields.get("country", "")) or "").strip() or None
                target = (row.get(fields[status_col]) or "").strip()
                jobs.append((match, match, country, target))
    else:
        # single-row mode (email axis only exposes --id/--status)
        if axis != "email":
            sys.exit("ERROR: set-social requires --csv")
        if not args.id or not args.status:
            sys.exit("ERROR: set-status needs --id and --status (or --csv)")
        # direct id flip — no resolution
        if args.status not in EMAIL_STATUSES:
            sys.exit(f"ERROR: invalid status {args.status!r}")
        st, body = client.set_email_status(args.id, args.status)
        if st == 200 and body.get("success"):
            print(f"OK       {args.id} -> {args.status}")
            return 0
        # 500-quirk verify: re-read is not possible by id alone, so trust a
        # 200; a non-200 without a body is reported as ERROR for direct flips.
        print(f"ERROR    {args.id}: PATCH failed ({st}): {body.get('error', body)}")
        return 1

    allow_downgrade = getattr(args, "allow_downgrade", False)
    errors = 0
    counts = {"OK": 0, "SKIP": 0, "AMBIGUOUS": 0, "NOT_FOUND": 0, "ERROR": 0}
    for label, match, country, target in jobs:
        outcome, detail = _apply(client, match, country, target, axis,
                                 allow_downgrade=allow_downgrade)
        counts[outcome] += 1
        if outcome == "ERROR":
            errors += 1
        tag = f"{label[:38]:38}"
        print(f"{outcome:10} {tag} {detail}")
    print("-" * 60)
    print("  ".join(f"{k}={v}" for k, v in counts.items()))
    return 1 if errors else 0


def cmd_counts(client, args):
    s = client.stats()
    by_status = s.get("by_status", {})
    print(f"total contacts: {s.get('total', 0)}")
    print(f"with_email: {s.get('with_email', 0)}   bounced(email_status): {s.get('bounced', 0)}")
    print("by status:")
    for k in sorted(by_status, key=lambda x: -by_status[x]):
        print(f"  {k:16} {by_status[k]}")
    return 0


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env = load_env(repo_root)
    password = env.get("SUPER_ADMIN_PASSWORD")
    if not password:
        sys.exit("ERROR: SUPER_ADMIN_PASSWORD not found in .env.local")
    base_url = env.get("MONTREE_BASE_URL") or DEFAULT_BASE_URL

    p = argparse.ArgumentParser(description="Montree outreach status CLI")
    p.add_argument("--base-url", default=base_url, help="override base URL")
    sub = p.add_subparsers(dest="cmd", required=True)

    pf = sub.add_parser("find", help="search contacts")
    pf.add_argument("query")

    ps = sub.add_parser("set-status", help="flip email status")
    ps.add_argument("--id")
    ps.add_argument("--status")
    ps.add_argument("--csv")
    ps.add_argument("--allow-downgrade", action="store_true",
                    help="permit moving to an earlier status (e.g. bounce-"
                         "recovery re-draft); replied/converted stay guarded")

    pso = sub.add_parser("set-social", help="flip social status (--csv only)")
    pso.add_argument("--csv")
    pso.add_argument("--allow-downgrade", action="store_true")

    sub.add_parser("counts", help="by-status totals")

    args = p.parse_args()
    client = Client(args.base_url, password)

    if args.cmd == "find":
        rc = cmd_find(client, args)
    elif args.cmd == "set-status":
        rc = cmd_set_status(client, args)
    elif args.cmd == "set-social":
        rc = cmd_set_social(client, args)
    elif args.cmd == "counts":
        rc = cmd_counts(client, args)
    else:
        p.error("unknown command")
        rc = 2
    sys.exit(rc)


if __name__ == "__main__":
    main()
