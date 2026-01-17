# MONTREE DASHBOARD

**The Premium Montessori Progress Tracking System**

## Quick Start

```bash
cd ~/Desktop/whale
npm run dev
# Open: http://localhost:3000/montree/dashboard
```

## Architecture

```
/montree/                    # Marketing landing page (white theme)
/montree/dashboard/          # THE PRODUCT (dark theme)
  ├── page.tsx               # Student grid
  ├── student/[id]/          # Student detail
  │   └── add-work/          # Add work flow
  ├── reports/               # Report generation
  ├── games/                 # English games hub
  └── settings/              # Preferences
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/montree/students` | GET | All students with progress |
| `/api/montree/students/[id]` | GET | Single student detail |
| `/api/montree/works` | GET/POST | Get/save student work |
| `/api/montree/curriculum` | GET | All curriculum works |

## Database IDs

- **School ID:** `772b08f1-4e56-4ea6-83b5-21aa8f079b35`
- **Classroom ID:** `7fc99496-600c-4a46-9a4c-617c08f226e8`

## Features Built

- ✅ Student grid with progress bars
- ✅ Student detail with area breakdown
- ✅ Add work flow with photo capture
- ✅ Real curriculum data (97+ works)
- ✅ Dark theme, mobile-first design

## TODO

- [ ] Report generation (weekly/monthly/term)
- [ ] Video capture integration
- [ ] Connect to existing English games
- [ ] Parent portal link
- [ ] Principal dashboard

## Production URL

```
https://www.teacherpotato.xyz/montree/dashboard
```

Note: Use `www.` prefix for Railway.
