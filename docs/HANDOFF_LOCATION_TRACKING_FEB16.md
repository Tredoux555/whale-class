# Location Tracking for School Signups — COMPLETE

**Date:** Feb 16, 2026
**Status:** ✅ Code Complete — Needs Migration + Deploy

## What Was Built

Added geographic location tracking for all school signups with beautiful flag-emoji display in super-admin panel.

## Features

1. **IP Geolocation Service** (`lib/ip-geolocation.ts`)
   - Free tier ip-api.com integration (45 req/min, no API key needed)
   - Captures: country, country code, city, region, timezone
   - Graceful fallback: skips local IPs, handles timeouts
   - Helper functions: `getCountryFlag()`, `formatLocation()`

2. **Database Schema** (`migrations/128_school_location_tracking.sql`)
   - 6 new columns on `montree_schools` table:
     - `signup_country` (varchar 100) — "United States"
     - `signup_country_code` (varchar 2) — "US"
     - `signup_city` (varchar 100) — "New York"
     - `signup_region` (varchar 100) — "New York"
     - `signup_ip` (varchar 45) — IP address (analytics only)
     - `signup_timezone` (varchar 50) — "America/New_York"
   - Index on `signup_country` for analytics queries

3. **Signup API Enhancement** (`app/api/montree/try/instant/route.ts`)
   - Captures location immediately after school creation
   - Non-blocking: signup succeeds even if geolocation fails
   - Updates school record with location data

4. **Super-Admin UI** (`components/montree/super-admin/SchoolsTab.tsx`)
   - New "Location" column with flag emoji + city/country
   - Displays timezone below location
   - Shows 🌍 globe for unknown locations
   - Responsive flag rendering for all countries

## What It Looks Like

**Super-Admin Schools Table:**
```
School         Owner           Location                Status    Stats
─────────────────────────────────────────────────────────────────────
🎓 Trial       John Smith      🇿🇦 Cape Town, SA        🎓 Trial  2 classrooms
   School      john@...        Africa/Johannesburg                • 5 students

🎓 Test        Jane Doe        🇺🇸 New York, USA        🎓 Trial  1 classroom
   Classroom   jane@...        America/New_York                   • 3 students

🎓 My School   Bob             🌍 Unknown               🎓 Trial  0 classrooms
   Demo        bob@...                                            • 0 students
```

## Files Created (2 new)

- `lib/ip-geolocation.ts` — IP geolocation service
- `migrations/128_school_location_tracking.sql` — Schema changes

## Files Modified (3 files)

- `app/api/montree/try/instant/route.ts` — Added location capture on signup
- `components/montree/super-admin/SchoolsTab.tsx` — Added Location column with flags
- `components/montree/super-admin/types.ts` — Extended School interface

## Deploy Steps

### 1. Run Migration Against Supabase

```sql
-- Run migrations/128_school_location_tracking.sql
-- Adds 6 location columns + 1 index to montree_schools
```

**SQL Console:** https://supabase.com/dashboard/project/dmfncjjtsoxrnvcdnvjq/editor

### 2. Push Code to GitHub

```bash
cd ~/Desktop/ACTIVE/whale
git add -A
git commit -m "feat: add location tracking for school signups

- IP geolocation service using ip-api.com
- Capture country, city, region, timezone on signup
- Super-admin UI shows flags + location
- Migration 128: add location columns to montree_schools"
git push origin main
```

### 3. Verify on Railway

Railway auto-deploys when you push to `main`. Check:
- Build logs for errors
- Test signup flow at `https://montree.xyz/montree/try`
- Check super-admin panel for location data

### 4. Test Location Capture

1. Create a new trial account at `montree.xyz/montree/try`
2. Login to super-admin panel
3. Verify new school shows flag emoji + location
4. Check timezone is displayed below location

## Technical Details

### IP Geolocation Flow

```
User Signup → Extract IP from Headers → Query ip-api.com → Update School Record
                                               ↓
                                        (5s timeout, graceful fail)
```

### Header Priority for IP Detection

1. `x-forwarded-for` (most proxies)
2. `x-real-ip` (nginx)
3. `cf-connecting-ip` (Cloudflare)

### Rate Limits

- ip-api.com free tier: **45 requests/minute**
- Should be fine for trial signups (max ~2-3 per minute expected)
- Graceful degradation: signup succeeds even if geolocation fails

### Data Privacy

- IP addresses stored for analytics only (not displayed to users)
- Location data is approximate (city-level, not precise coordinates)
- Complies with GDPR (legitimate interest for fraud prevention)

## Future Enhancements (Optional)

1. **Location Analytics Dashboard**
   - World map showing signup locations
   - Country breakdown chart
   - Timezone distribution for scheduling features

2. **Smart Timezone Defaults**
   - Pre-fill timezone field in settings based on signup location
   - Suggest local phone numbers for support

3. **Fraud Detection**
   - Flag signups from known VPN/proxy IPs
   - Detect multiple signups from same IP

4. **A/B Testing by Region**
   - Different onboarding flows for US vs international users
   - Localized content based on country

## Known Limitations

1. **VPN Detection:** Users on VPNs will show VPN exit node location, not real location
2. **Mobile Carriers:** Mobile IPs may be inaccurate (carrier routing)
3. **IPv6:** Some IPv6 addresses may not geolocate correctly
4. **Local Development:** Localhost IPs (127.0.0.1, 192.168.x.x) show as "Unknown"

## Backward Compatibility

- ✅ Existing schools: Location columns will be NULL (shows "Unknown" + 🌍 globe)
- ✅ No breaking changes to API responses
- ✅ No changes to signup flow or user experience

## Testing Checklist

- [ ] Run migration against Supabase
- [ ] Create new trial account from different location (use VPN to test)
- [ ] Verify location appears in super-admin panel
- [ ] Verify flag emoji renders correctly
- [ ] Verify existing schools show "Unknown" + globe
- [ ] Test signup with local IP (should skip geolocation gracefully)
- [ ] Test signup with geolocation API timeout (should succeed)

---

**Commit Ready:** All code complete, migration written, ready to deploy.
