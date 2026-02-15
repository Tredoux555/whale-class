# Handoff: Email Setup for LinkedIn Account

**Date:** Feb 14, 2026
**Status:** ✅ Complete

---

## What Was Done

Created new email forwarding address `tredoux@montree.xyz` for LinkedIn account registration.

**Context:** User's LinkedIn account was locked due to location mismatch (set as China, user is South African). The existing `hello@montree.xyz` email was already used for the old account, so a new email address was needed to create a new LinkedIn account with correct location.

---

## Email Configuration

### Cloudflare Email Routing

**Service:** Cloudflare Email Routing (free email forwarding)
**Domain:** montree.xyz
**DNS:** MX records already configured (route1/2/3.mx.cloudflare.net)

### New Email Address

```
Address:     tredoux@montree.xyz
Action:      Send to an email
Destination: tredoux555@gmail.com
Status:      Active (enabled)
```

### Existing Email Addresses

```
hello@montree.xyz → tredoux555@gmail.com (already existed)
tredoux@montree.xyz → tredoux555@gmail.com (newly created)
```

---

## How It Works

1. Email sent to `tredoux@montree.xyz`
2. Cloudflare Email Routing receives it (via MX records)
3. Forwards to `tredoux555@gmail.com`
4. User receives in Gmail inbox

**Important:** This is forwarding only. To send email FROM `tredoux@montree.xyz`, you would need to:
- Set up Gmail alias (Settings → Accounts → "Send mail as")
- OR use SMTP relay through Cloudflare

---

## LinkedIn Account Setup

**Next steps for user:**
1. Go to LinkedIn signup
2. Use email: `tredoux@montree.xyz`
3. Set location: South Africa (correct location)
4. Verify email via Gmail inbox (tredoux555@gmail.com)
5. Complete profile setup

**Previous issue:** Old account used `hello@montree.xyz` + China location → verification blocked

---

## Files Modified

**None** — All changes made via Cloudflare dashboard (no code changes)

---

## Access

**Cloudflare Dashboard:**
- URL: https://dash.cloudflare.com
- Account: tredoux555@gmail.com
- Domain: montree.xyz
- Path: Email → Email Routing → Routing rules

**Routing Rules Page:**
https://dash.cloudflare.com/c34a0012899443b32a0de1ffd5dc6af3/montree.xyz/email/routing/routes

---

## Technical Notes

### Email Routing Service Details

- **Provider:** Cloudflare Email Routing
- **Pricing:** Free (included with domain on Cloudflare)
- **MX Records:** Already configured (not modified)
  - route1.mx.cloudflare.net (priority 27)
  - route2.mx.cloudflare.net (priority 53)
  - route3.mx.cloudflare.net (priority 18)
- **Limits:** 1000 emails/day on free plan
- **Catch-all:** Disabled (Drop action)

### Form Behavior Notes

The Cloudflare "Destination" field is a combobox that:
- Shows previously-used email addresses as suggestions
- Requires clicking the dropdown option (not just typing)
- Form validation prevents empty destination field
- Auto-populates with Cloudflare account email by default

---

## Success Criteria

✅ Email address `tredoux@montree.xyz` created
✅ Forwards to `tredoux555@gmail.com`
✅ Active and enabled
✅ Ready for LinkedIn account registration

---

## Future Considerations

**If more email addresses needed:**
- Can create unlimited custom addresses on free plan
- Pattern: `[name]@montree.xyz` → tredoux555@gmail.com
- Use cases: support@, sales@, team@, etc.

**If sending email needed:**
- Set up Gmail "Send mail as" alias
- OR use SMTP relay (Cloudflare Workers + Resend API)
- Current setup: receive-only forwarding
