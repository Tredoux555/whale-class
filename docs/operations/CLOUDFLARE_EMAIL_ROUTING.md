# Cloudflare Email Routing — hello@montree.xyz

**Purpose:** Make `hello@montree.xyz` actually receive mail (forward to Tredoux's Gmail).

**Why this matters:** The `/montree/about` page lists `hello@montree.xyz` as the canonical contact address. Until Email Routing is wired, mail sent to that address bounces or vanishes. Address must be live before the About page receives meaningful traffic.

---

## State at start of this doc (verified by Browser Claude, May 15 2026)

- ✅ montree.xyz nameservers point to Cloudflare
- ✅ MX records present
- ✅ SPF record present
- ⚠️ Custom address `hello@montree.xyz → tredoux555@gmail.com` is the only piece NOT yet confirmed wired

So the "walkthrough" is really a 5-minute verification + one custom-address add. Not a full DNS setup from scratch.

---

## Step-by-step (5 minutes)

### 1. Log into Cloudflare

Open https://dash.cloudflare.com → log in → click into the `montree.xyz` zone.

### 2. Navigate to Email Routing

Left sidebar → **Email** → **Email Routing**.

If the destination address `tredoux555@gmail.com` is already listed as Verified, skip to step 4.

### 3. Add destination address (only if not already there)

- Click **Destination addresses** tab
- Click **Add destination address**
- Enter `tredoux555@gmail.com`
- Cloudflare sends a one-time verification email to that Gmail account
- Open Gmail, click the verification link, return to Cloudflare — should now show **Verified**

### 4. Add custom address

- Click **Custom addresses** tab
- Look for an existing entry for `hello@montree.xyz`
- If it exists and is set to forward to `tredoux555@gmail.com`, skip to step 5
- If it doesn't exist:
  - Click **Create address**
  - Custom address: `hello`
  - Domain: `montree.xyz` (auto-filled)
  - Action: **Send to an email**
  - Destination: select `tredoux555@gmail.com`
  - Click **Save**

### 5. Verify it works

From a different email address (use a personal/burner — not the Gmail destination), send a test message to `hello@montree.xyz`. Subject: "Test from <date>". Body: anything.

Within about 10 seconds, the message should land in `tredoux555@gmail.com`. Note: the original sender's address should be preserved in the From header (Cloudflare forwards, doesn't rewrite the From).

### 6. Optional — set up "Send as"

If Tredoux wants to REPLY from `hello@montree.xyz` (not just receive at it), Gmail needs a "Send as" configuration. This requires an SMTP relay because Cloudflare Email Routing is inbound-only (no outbound).

Options for outbound:
- **Cloudflare doesn't help here** — Email Routing is inbound only by design.
- **Recommended: Resend** — `montree.xyz` domain verification in Resend would also enable replies via Resend's SMTP relay. The Resend domain verification is already on the project's task list (carry-over from earlier sessions). Once verified, configure Gmail "Send as" with Resend SMTP credentials.
- **Alternative: Google Workspace** — $6/user/month, adds a real Gmail account at hello@montree.xyz. Heaviest hammer; probably overkill until there's a real team.

For v1 ship of the About page, inbound-only is fine. Replies can come from `tredoux555@gmail.com` directly. The minor "actually came from a different address" wrinkle is acceptable for a single-founder company.

---

## Troubleshooting

**Verification email never arrives in Gmail.**
Check spam folder. If still not there, return to Cloudflare → Destination addresses, click the unverified row, "Resend verification".

**Test email to hello@montree.xyz bounces with "no such address".**
The custom address rule isn't saved. Return to step 4, confirm the rule shows up in the Custom addresses list and is enabled.

**Test email is silently swallowed (sender sees nothing, Gmail receives nothing).**
Cloudflare's MX record might be missing or pointed at the wrong server. Cloudflare → Email Routing → DNS records — should show `MX route1.mx.cloudflare.net (priority 9)`, `MX route2.mx.cloudflare.net (priority 26)`, `MX route3.mx.cloudflare.net (priority 79)`. If missing, click "Add records automatically" — Cloudflare adds them in one click.

**Test email arrives but the From header shows a Cloudflare-rewritten sender.**
Cloudflare's default behavior IS to preserve the original sender's From address, with the envelope From rewritten to Cloudflare's relay (to satisfy SPF for receiving servers). This is correct and expected — replies will go to the original sender, not to Cloudflare.

---

## Acceptance criteria

- [ ] Cloudflare Email Routing → Custom addresses shows `hello@montree.xyz → tredoux555@gmail.com` as enabled
- [ ] Destination address `tredoux555@gmail.com` shows as Verified
- [ ] Test email sent from a different account to `hello@montree.xyz` lands in Gmail within 15 seconds
- [ ] The forwarded message preserves the original sender's email address in the From header

When all four pass, the About page is safe to actively promote — the contact line is live.

---

## After this is done

1. Mark task #4 as completed in the Cowork task list.
2. The /montree/about page goes from "lists a contact address that doesn't work" to "real, working corporate identity page."
3. Browser Claude can then move on to walking Tredoux through Google Search Console → URL Inspection → Request Indexing for both `/` and `/montree/about` (which forces Google to re-crawl with the new favicon + Organization JSON-LD).

---

## Reference

- Cloudflare Email Routing docs: https://developers.cloudflare.com/email-routing/
- The contact line on the About page lives at `app/montree/about/page.tsx` and is rendered both in the visible HTML and in the Schema.org Organization JSON-LD `email` field.
