# Add Story System Environment Variables to Vercel

## Quick Steps

1. Go to: https://vercel.com/dashboard
2. Select your **whale-class** project
3. Go to **Settings** → **Environment Variables**
4. Add these 3 variables (one at a time):

### Variable 1: ANTHROPIC_API_KEY
- **Name:** `ANTHROPIC_API_KEY`
- **Value:** `[YOUR_ANTHROPIC_API_KEY]` (Get from https://console.anthropic.com/)
- **Environments:** Production, Preview, Development (check all)

### Variable 2: STORY_JWT_SECRET
- **Name:** ` STORY_JWT_SECRET`
- **Value:** `d5bf08e53658390333ec76f688cf34e72332859b9ba85f24868eb0b7235c29ea`
- **Environments:** Production, Preview, Development (check all)

### Variable 3: DATABASE_URL
- **Name:** `DATABASE_URL`
- **Value:** `postgresql://postgres.dmfncjjtsoxrnvcdnvjq:Ya0ryafijQvg5Thq@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres`
- **Environments:** Production, Preview, Development (check all)

## After Adding Variables

1. Vercel will automatically redeploy
2. Wait ~2 minutes for deployment
3. Test at: https://teacherpotato.xyz/story
4. Login with:
   - Username: `T`, Password: `redoux`
   - OR Username: `Z`, Password: `oe`

## How to Use

### Send a Secret Message
1. Click the first **'c'** in the story
2. Type your message
3. Click 💾 Save

### Read a Secret Message
1. Click the first **'t'** in the story
2. Message appears at end of paragraph 3
3. Click 't' again to hide

---

**Security:** Keep the /story URL private. System designed for just T and Z.



