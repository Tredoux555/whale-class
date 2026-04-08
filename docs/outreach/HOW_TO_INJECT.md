# How to Inject the Emails into GMass — Automation Playbook

**Purpose:** Both sacred emails are now HTML files ready to paste straight into Gmail. This doc tells next-session-Claude (and you) exactly how to do it fast, with zero retyping.

## Files in this folder

| File | What it is | Used for |
|------|------------|----------|
| `Letter_Montree_Pitch.html` | Campaign A email body, Gmail-safe inline CSS | Paste into GMass compose |
| `Letter_Teacher_Application.html` | Campaign B email body, Gmail-safe inline CSS | Paste into GMass compose (5-7 days after A) |
| `Montree_Outreach_Cleaned.xlsx` | 346 scrubbed recipients across 3 tabs | Upload to Google Sheets, link from GMass |
| `SEND_PLAYBOOK.md` | Full pre/during/post checklist for the mass send | Read before pulling the trigger |
| `HOW_TO_INJECT.md` | This file | Step-by-step for automation |

## The automated flow (next session)

**When user says "let's do the Montree send," Claude should:**

1. **Read both HTML letter files** to confirm content hasn't drifted. If user wants last-minute tweaks, make them to the HTML, not to a retyped copy.

2. **Convert `Tredoux_Resume_Tight.html` → `Tredoux_Resume_Draft3.pdf`** if a headshot has been added or other edits made. Options: (a) `mcp__Desktop_Commander__write_pdf` if available, (b) drive Chrome to the local HTML file with `file://` URL and use the browser's print-to-PDF shortcut, (c) ask user to print-to-PDF from their Mac directly. Save the PDF to `whale/assets/personal/Tredoux_Resume_Draft3.pdf`.

3. **Upload the cleaned xlsx to Google Drive as a Sheet.** Drive the Chrome browser to `drive.google.com`, drag-drop or upload `Montree_Outreach_Cleaned.xlsx`, open it as a Google Sheet. Or find the existing "Montree Global Outreach" sheet GMass already uses and add the cleaned 346 rows as a new tab called `Send Apr 2026 — Cleaned`.

4. **Campaign A — Montree Pitch:**
   - Drive Chrome to `mail.google.com`
   - Click Compose, then the red GMass button
   - In GMass spreadsheet picker, select the sheet from step 3
   - Open `Letter_Montree_Pitch.html` in a second Chrome tab via `file://` URL, select all, copy
   - Paste into the Gmail compose body — Gmail preserves the inline styles
   - Subject: `Montree`
   - Configure: throttle ON, click tracking OFF, open tracking ON, unsubscribe ON
   - Configure F1 and F2 follow-ups (same wording as Mar 28 campaign, saved in CLAUDE.md)
   - **STOP at the final Send button** and ask user to confirm

5. **Campaign B — Teacher Job Application (5-7 days after A):**
   - Same steps as Campaign A, but:
   - Subject: `Teacher, builder, or both`
   - Paste from `Letter_Teacher_Application.html`
   - **ATTACH** `Tredoux_Resume_Draft3.pdf` (or Draft2 if no edits were made)
   - Same throttling / tracking settings
   - **STOP at the final Send button** and ask user to confirm

## Why HTML and not plain text

GMass compose is a Gmail compose window, which is a rich-text editor. When you paste from a browser tab, Gmail strips the `<html>`/`<head>`/`<body>` wrapper and keeps the styled inner content. The inline `style="..."` attributes survive; any `<style>` block gets dropped. That's why both letter files use **inline styles only** — no `<style>` blocks, no Google Fonts (Gmail blocks external fonts anyway), no classes. System font stack falls back gracefully on any machine.

## Merge tags

Both files use `{SchoolName}` as the merge tag. This assumes the Google Sheet column header is literally `SchoolName` (matching the uploaded xlsx header). If GMass uses a different tag syntax (e.g., `<<SchoolName>>` or `{{SchoolName}}`), adjust the HTML before paste — just find-replace in the file.

## If something goes wrong

- **Paste strips all styles** → Gmail compose was in plain-text mode. Click the `A` icon bottom-left to switch to rich-text, then re-paste.
- **Merge tag shows up literally in recipients' emails** → tag syntax mismatch. Check GMass's docs for its exact merge tag format and update the HTML.
- **Email goes to spam in test** → reputation is bruised from the Mar 28 batch. Warm up the inbox for 2-3 more days with normal sends before retrying.
- **High bounce rate in first 20 sends** → PAUSE campaign, re-scrub the remaining rows, resume with cleaned subset.

## Content lock

The two letters in this folder are the **canonical** version. Do not retype, do not regenerate, do not "improve" without user explicit approval. The sacred email text is mirrored in `whale/CLAUDE.md` under the GMASS OUTREACH CAMPAIGN section for cross-reference.
