// lib/story/login-path.ts
//
// The correct login destination for the CURRENT surface. The public Lyf Coach
// app and the owner Sanctuary share the same client code (personal-client, the
// coach chat provider, the voice recorder); on a lost/expired session each must
// bounce to its OWN login — /lyf-coach/login for the public coach, /story/admin
// for the owner. ONE helper so every auth bounce across the shared code agrees,
// and a public user never lands on the Sanctuary login (the "two login paths").

export function coachLoginPath(): string {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/lyf-coach')) {
    return '/lyf-coach/login';
  }
  return '/story/admin';
}
