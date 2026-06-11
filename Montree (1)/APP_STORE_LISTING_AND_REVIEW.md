# Montree — App Store Listing + Review Pack

*Drafted 2026-06-07. Everything an App Store Connect (and Google Play) listing needs, ready to paste. Pair with `APPLE_PREFLIGHT_CHECKLIST.md`.*

## App identity

- **Name:** Montree
- **Subtitle (30 char max):** Montessori observation, simplified
- **Promotional text (170 char):** Snap a photo of a child at work and Montree identifies the lesson and tracks their progress — Montessori record-keeping that takes seconds, not evenings.
- **Bundle ID:** `xyz.montree.app`
- **Primary category:** Education
- **Secondary category:** Productivity
- **Age rating:** 4+ (no objectionable content)
- **Support URL:** https://montree.xyz/support  *(create if missing — Apple requires a reachable support page)*
- **Marketing URL:** https://montree.xyz
- **Privacy Policy URL:** https://montree.xyz/privacy  *(live ✅)*

## Description (long)

> Montree is the record-keeping companion for Montessori teachers and schools.
>
> Snap a photo of a child during a lesson and Montree recognizes the work, then advances that child's progress automatically — the documentation that used to eat your evenings now takes seconds.
>
> **For teachers**
> • Photo-to-progress: identify a work from a photo and track presented → practicing → mastered
> • A living record for every child across the full Montessori curriculum
> • Weekly reports and media galleries families love
> • Phonics and language works built in
>
> **For school leaders**
> • A calm dashboard of every classroom's momentum
> • Parent communication, meetings, and consent in one place
> • Set up classrooms and invite teachers in minutes
>
> **Built for the classroom**
> • Children never log in — teachers and schools control all records
> • Your data is private: no ads, no third-party tracking, ever
> • Delete your account and data from inside the app at any time
>
> Montree is a tool for the adults who run the classroom — teachers, principals, and parents — designed to give you back your time.

## Keywords (100 char max, comma-separated, no spaces)

`montessori,classroom,teacher,observation,preschool,childcare,early learning,progress,phonics,records`

## App Privacy "nutrition labels" (App Store Connect)

For each: **Linked to identity = Yes** · **Used for tracking = No**.

- **Contact info** — name, email → App functionality, Account management
- **User content** — photos, observations, messages, voice recordings, reports → App functionality
- **Identifiers** — user/account ID → App functionality
- **Diagnostics** — crash/error logs → App functionality *(once error tracking is added)*

**Tracking section:** "No, we do not track." Do **not** add advertising SDKs.

Children's data note: information about children is entered by schools, not collected from children directly. Declare photos + user content honestly. Do **not** enroll in the **Kids Category** (that bans Stripe/AI third parties) — Montree is a tool for adults.

## App Review notes (paste into App Store Connect → App Review Information)

> Montree is a B2B tool for Montessori schools. The people who use the app are teachers, principals, and parents — **children do not log in and have no accounts**. Information about children is entered by adult staff.
>
> Subscriptions are billed to *schools* via Stripe (B2B SaaS, sold outside the app). There is no consumer in-app purchase, so StoreKit IAP does not apply.
>
> **Demo account for review (full access):**
> - URL is loaded automatically by the app (montree.xyz)
> - Email: `REVIEW@montree.xyz`  ← *you create this*
> - Password: `__________`  ← *you set this*
> - Role: Principal (so the reviewer can see the school dashboard + a classroom)
>
> **To verify in-app account deletion (Guideline 5.1.1(v)):** Settings → "Delete account". A teacher/parent deletes only their own login; a principal who is the sole member sees a typed-confirmation step that deletes the whole school. (Please use a throwaway demo account — deletion is real.)

### Reviewer demo account — how to create it (5 min, you do this)

1. Sign up a fresh school at montree.xyz (or in super-admin) named e.g. "Apple Review School".
2. Make the login a **principal** with email `REVIEW@montree.xyz` and a known password.
3. Seed one classroom + a few sample children so the dashboard isn't empty.
4. Do **not** use a real school — the reviewer may trigger destructive actions (incl. account deletion).
5. Put the credentials in the App Review notes above.

> Security note: I did not invent or store real credentials. You create the demo login so the password never lives in a doc or repo.

## Screenshot shot-list (you capture on device/simulator)

Apple needs 6.7" iPhone + (optional) 12.9" iPad. Capture these 5, in order:

1. **Photo-to-progress** — the snap screen identifying a work (the hero feature).
2. **Child record** — one child's progress across the curriculum.
3. **Principal dashboard** — classrooms overview with momentum.
4. **Weekly report / media gallery** — what families receive.
5. **Phonics / language works** — the built-in curriculum depth.

Tip: add a one-line caption bar to each (brand teal `#0D3330`, emerald `#4ADE80` accent). The icon master is at `resources/icon-master.svg` on the `appstore/phase1-native` branch — export at 1024×1024 for the App Store icon.

## Google Play (faster first win)

Play is lenient on remote-wrapper apps. Same description/keywords work. You'll also need: a 512×512 icon, a 1024×500 feature graphic, the privacy policy URL, and the Data Safety form (mirror the Apple privacy answers above: data collected, not shared for ads, not used for tracking). Build a signed AAB and submit — often live in 1–3 days.
