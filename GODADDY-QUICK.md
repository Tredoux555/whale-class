# Quick GoDaddy DNS Configuration

## What You Need from Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `whaleclass.com`)
3. Vercel will show you the exact DNS records needed

## GoDaddy Steps (Quick)

### 1. Log in to GoDaddy
- Go to: https://dcc.godaddy.com
- Sign in

### 2. Access DNS
- My Products → Your Domain → DNS (or Manage DNS)

### 3. Update Records

**For Root Domain (whaleclass.com):**
- Find A record for `@`
- Delete it if it exists
- Add new A record:
  - Name: `@` (or blank)
  - Value: `[Use Vercel's IP from dashboard]`
  - TTL: 600

**For www (www.whaleclass.com):**
- Add CNAME record:
  - Name: `www`
  - Value: `[Use Vercel's CNAME from dashboard]`
  - TTL: 600

### 4. Save and Wait
- Save changes
- Wait 1-2 hours for DNS propagation
- Check Vercel dashboard for verification

## Vercel DNS Values

**Common Vercel values (but check your dashboard!):**
- A Record: `76.76.21.21` (or what Vercel shows)
- CNAME: `cname.vercel-dns.com` (or what Vercel shows)

**⚠️ Always use the exact values Vercel shows in your dashboard!**

## After Setup

1. Vercel will verify DNS (1-2 hours)
2. SSL certificate auto-provisions (5-10 minutes)
3. Your site is live at https://yourdomain.com

Need help? Check the full guide in `GODADDY-SETUP.md`

