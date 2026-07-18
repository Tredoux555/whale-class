# Lyf Coach — Trust & UI Copy

These are the honesty-checked versions, ready to ship. Where I changed your wording, I've noted why — see "What I changed and why" at the bottom.

---

## 1. Below the chat input

> 🔒 Your conversations are private and never shared.

_(Unchanged — accurate as-is.)_

---

## 2. Signup screen (just above the button)

> Your sessions are encrypted, stored securely, and only ever yours. Delete everything, anytime, in one tap.

_(Unchanged — "encrypted" and "stored securely" are both true. See note on "end-to-end" below — this line deliberately avoids that phrase.)_

---

## 3. Email confirmation

**Subject:** You're in. Your space is ready.

**Body:**

> Welcome to Lyf Coach.
>
> This is your private space — what you share here stays here. Your conversations are stored securely, are never used to train AI, and are never shared or sold.
>
> Tap below to confirm your email and open your space.
>
> **[ Confirm my account ]**
>
> If you didn't sign up, ignore this — nothing has been created.
>
> — The Lyf Coach team

---

## 4. Trust bar (small, near the top)

> Private & secure · Never used to train AI · Delete anytime

---

## 5. Web signup — product distinction (from your coach)

Place this one line on the **web** signup screen. It keeps the web honest *and* sells the iPhone app to privacy-conscious users — a feature distinction, not a warning:

> Lyf Coach web stores your conversations securely on our servers. If you want fully on-device privacy, our iPhone app keeps everything local.

---

## What I changed and why

You said honesty is the product, so two phrases needed fixing — both make a specific technical promise the architecture doesn't keep:

**"End-to-end private" / "End-to-end" (trust bar) → removed.**
"End-to-end" means only you can decrypt your data and the server can't read it (think Signal). Lyf Coach stores conversations in the cloud and sends them to Anthropic's API to generate replies — so the server *can* read them. That's a normal, fine architecture, but calling it "end-to-end" is a claim a regulator (or a skeptical user) could call deceptive. On a therapy-adjacent app, getting caught overpromising on privacy is the one thing that ends trust permanently. I swapped it for **"Never used to train AI"** — a real, strong, true differentiator.

**"Never seen by anyone but you" (email) → removed.**
Strictly untrue: the systems that run the app (Railway, Supabase, Anthropic) process your conversations, and operators can technically access stored data. I replaced it with **"never used to train AI, and never shared or sold"** — which is fully defensible and still reassuring.

**Kept "encrypted" and "stored securely"** — these are accurate (encryption in transit + at rest) and don't imply zero-knowledge.

If you'd still like the original "end-to-end" wording, the only honest way to use it is to actually build client-side/zero-knowledge encryption (where the server stores ciphertext it can't read). Happy to scope that — it's a real build, not a copy change.
