// lib/lens/flags.ts
// Client-safe flags for Montree Lens — no server-only imports (no jose, no
// node:crypto, no supabase), so this is the one file the door page
// (app/lens/page.tsx, a client component) can import alongside auth.ts and
// route-helpers.ts on the server.
//
// LENS_OPEN_BETA: Montree Lens is in open beta with exactly one observer row
// in production. While this is true, the invite-code door is skipped —
// anyone who opens /lens is signed in as that one observer automatically
// (see resolveBetaObserver in lib/lens/route-helpers.ts and
// app/api/lens/auth/auto/route.ts). Flip this to false to retire the open
// beta and restore the invite-code door; nothing behind the flag is deleted.
export const LENS_OPEN_BETA = true;
