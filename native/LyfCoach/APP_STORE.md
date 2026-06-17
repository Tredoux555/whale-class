# Sanctuary — App Store Prep (honest)

> Structure mirrors `~/Desktop/Montree App Store Pack/` but the content is
> Sanctuary-specific. **Every claim here is one the app can actually back** — no
> "zero-knowledge", no "100% private", no "unhackable". The privacy manifest is
> `Sanctuary/Resources/PrivacyInfo.xcprivacy`.

---

## 0. The honesty rule (read first)

Sanctuary encrypts your journal/coach/projects on your device with a key derived
from your password; our server only ever stores ciphertext it cannot read. That
is strong and true. What it is **not**:

- **Not "zero-knowledge".** Metadata is visible to the server: that an account
  exists, that it logged in, when, and that entries exist (their count/size/
  timing) — only the *content* is unreadable.
- **Not safe on an unlocked/seized device.** Anyone past your lock screen +
  Face ID can read everything. Keep the phone locked.
- **Not immune to a weak password.** A fully-compromised server could, at login,
  attempt an offline dictionary attack on a weak password. Argon2id + the
  strong-password requirement are the mitigations — choose a real passphrase.

The App Store listing and the in-app copy must stay within these limits.

## 1. Listing copy

**Name:** Lyf Coach
**Subtitle:** Your private, on-device journal & coach

**Promotional text (≤170 chars):**
A calm, private space for your journal, planner, projects, and a coach who
listens. Encrypted on your device — we can't read your journal.

**Description:**
```
Lyf Coach is a quiet, private place that only opens for you.

• Journal — write freely. Your entries are encrypted on your device with a key
  only you hold. We store them, but we can't read them.
• Coach — talk things through with a warm, on-device AI coach that helps you
  focus and protects you from burnout. By default it runs entirely on your
  iPhone; nothing leaves the device. When you want a deeper take, you can
  explicitly ask the cloud coach for a single reply.
• Planner — keep what's coming up, encrypted.
• Projects — track what matters and the next step on each.

How the privacy works, honestly:
Your password derives an encryption key on your device. Everything you write is
encrypted before it leaves the phone, and our servers only hold ciphertext we
cannot read. Unlock with Face ID after the first setup. We can't recover your
journal if you forget your password — that's the point.

What this can't do (we'd rather tell you): an unlocked phone can read everything,
and we never hide that your account exists or when you sign in. Keep your phone
locked and choose a strong passphrase.
```

**Keywords:** journal, diary, private, encrypted, coach, planner, projects,
secure, on-device, face id

**Category:** Lifestyle (or Productivity). **Age rating:** 4+ (no objectionable
content; the app is a personal journal).

## 2. Privacy labels (App Store Connect → App Privacy)

Answer honestly. Recommended declarations:

- **Data used to track you:** None.
- **Data linked to you:**
  - *Identifiers* → User ID (the account username). Used for **App Functionality**
    only. Not used for tracking.
  - *User Content* → Other User Content (journal/coach/projects). Used for **App
    Functionality**. **End-to-end encrypted; the developer cannot read it.** Not
    used for tracking. (Declare it rather than hide it — it is transmitted, even
    if unreadable.)
  - *Diagnostics* → Crash data, only if you add crash reporting (none by default).
- **Data not linked to you:** None beyond the above.

Do NOT claim "Data Not Collected" for User Content if the ciphertext is
transmitted/stored — declare it as collected-but-encrypted. That's the honest call.

## 3. Reviewer notes (App Review → Notes)

```
Sanctuary is a single-user private journal/coach/planner. It is the native,
end-to-end-encrypted companion to montree.xyz's personal space.

Test account: we will provide a demo account + password in the App Review
message. First launch: tap "Set up a new sanctuary", choose a name + password
(this is the demo account's password). Add a journal entry; lock with Face ID;
unlock; the entry persists. The Coach tab answers on-device (Apple Foundation
Models) on supported devices; "Ask the deeper coach" makes one explicit cloud
request.

There are NO hidden or undocumented features, no covert messaging, and no
content beyond the user's own private notes. All data the user writes is
encrypted on-device before upload; our servers store only ciphertext.

On-device AI requires an Apple-Intelligence-capable device + iOS 26. On other
devices the Coach clearly falls back to a secure cloud reply, with an in-app
disclosure shown before sending.
```

> 🚩 **Apple 2.3.1 (hidden features):** the web sanctuary has a covert
> "Messages" door. This NATIVE app deliberately does NOT include it — keep it
> out of any App Store build. The native app is exactly what the screenshots
> show: Planner / Coach / Projects (+ an owner-only Vault).

## 4. TestFlight + submission

1. Archive (Product ▸ Archive) with a Distribution signing cert.
2. Distribute App ▸ TestFlight & App Store Connect ▸ Upload.
3. App Store Connect ▸ TestFlight ▸ add the family as internal testers.
4. Complete the App Privacy questionnaire per §2.
5. Add the reviewer notes (§3) + the demo account before submitting for review.
6. Screenshots: capture the door, Journal, Coach (on-device), Planner on a real
   device (6.7" + 6.1"). Do NOT show real private content.

## 5. What's done vs pending

- **Done (this repo):** privacy manifest, listing/labels/reviewer copy (this doc).
- **Pending Tredoux:** Apple Developer enrolment, screenshots on device, the
  demo account, final App Store Connect submission. See `../../VERIFY.md` /
  `VERIFY` step.
```
