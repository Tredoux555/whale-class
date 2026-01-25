# HANDOFF: Session 94 - iOS Capacitor Navigation Crisis

## Date: January 25, 2026

## CRITICAL PROBLEM
The iOS Capacitor app has an infinite reload loop. When the app loads, it shows a blank white screen and Xcode console shows hundreds of "⚡️ WebView loaded" messages repeating forever.

## ROOT CAUSE ANALYSIS
I created a cascade of navigation problems:

1. **Original setup**: Root `/` had `router.replace('/montree')` which doesn't work in Capacitor
2. **My "fix"**: Changed to `window.location.href = '/montree/'` - this caused redirect loop
3. **Next "fix"**: Made both pages identical but still had conditional redirect to dashboard
4. **Result**: Infinite reload loop - app unusable

## WHAT WORKS (from earlier in session)
- Xcode is installed and configured correctly
- Capacitor build process works (122 pages generated)
- `npx cap sync ios` works
- Simulator launches correctly
- The BUILD is fine - the CODE is broken

## WHAT'S BROKEN
- `/app/page.tsx` - root page causes infinite redirects
- `/app/montree/page.tsx` - landing page causes infinite redirects
- Navigation between pages doesn't work (blinks/reloads instead of navigating)

## FILES THAT NEED FIXING

### 1. /Users/tredouxwillemse/Desktop/ACTIVE/whale/app/page.tsx
Current state: Has useEffect with localStorage check that redirects to dashboard
Problem: Something in the render cycle causes infinite reloads

### 2. /Users/tredouxwillemse/Desktop/ACTIVE/whale/app/montree/page.tsx
Current state: Same as above - identical code
Problem: Same infinite reload issue

### 3. /Users/tredouxwillemse/Desktop/ACTIVE/whale/app/montree/onboarding/page.tsx
Modified to work offline (localStorage instead of API) - this part is probably fine

## THE ACTUAL SOLUTION NEEDED
For Capacitor static builds, the app needs:

1. **NO client-side redirects on initial load** - Capacitor WebView doesn't handle them well
2. **Simple `<a href>` tags for navigation** - not Next.js Link, not router.push, not window.location.href
3. **No useEffect redirects** - these cause the reload loop
4. **Server config**: The app uses `trailingSlash: true` in next.config.ts for Capacitor builds

## RECOMMENDED APPROACH FOR NEXT SESSION

### Option A: Pure Static HTML for Capacitor
Make the landing pages completely static with no JavaScript redirects:
- Remove ALL useEffect hooks that do navigation
- Use only `<a href="/path/">` for links
- Check localStorage ONLY to conditionally render UI (not to redirect)
- If user is logged in, show "Go to Dashboard" button instead of auto-redirecting

### Option B: Use Capacitor's Router
Instead of HTML navigation, use Capacitor's native navigation APIs

## BUILD COMMANDS
```bash
cd ~/Desktop/ACTIVE/whale
CAPACITOR_BUILD=true npm run build
npx cap sync ios
npx cap open ios
```

Then in Xcode:
1. Cmd+Shift+K (clean)
2. Play ▶️

## TEST URLS (once working)
- Landing: / or /montree/
- Onboarding: /montree/onboarding/
- Login: /montree/login/
- Demo: /montree/demo/
- Dashboard: /montree/dashboard/

## LOGIN TEST DATA
- Code: whaleclass-7a4b
- Teacher: Tredoux

## DESIGN DECISIONS MADE THIS SESSION
1. Landing page redesigned: Big tree icon, "Watch them grow" headline, 3 buttons
2. "Set Up My School" should hide after school is created (check localStorage for 'montree_school')
3. Onboarding saves to localStorage (works offline, no API needed)
4. Demo path should be prominent on landing page

## KEY INSIGHT
The problem is NOT the build, NOT Capacitor config, NOT Xcode. 
The problem is JavaScript trying to do client-side navigation/redirects in a static WebView context.

**SOLUTION: Remove all programmatic navigation. Use only HTML anchor tags. No useEffect redirects.**

## FILES REFERENCE
- Project: /Users/tredouxwillemse/Desktop/ACTIVE/whale
- Capacitor config: /Users/tredouxwillemse/Desktop/ACTIVE/whale/capacitor.config.json
- Next config: /Users/tredouxwillemse/Desktop/ACTIVE/whale/next.config.ts
- iOS project: /Users/tredouxwillemse/Desktop/ACTIVE/whale/ios/

## WHAT NOT TO DO
- Don't use `router.push()` or `router.replace()`
- Don't use `window.location.href` in useEffect
- Don't create redirect chains between pages
- Don't assume Next.js client-side routing works in Capacitor

## PRIORITY
This is blocking - app is completely unusable until fixed.
