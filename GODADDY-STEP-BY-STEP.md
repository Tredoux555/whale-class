# 🚀 GoDaddy + Vercel Domain Setup - Step by Step

## Quick 5-Minute Setup

### Step 1: Add Domain in Vercel (2 minutes)

1. Go to: https://vercel.com/dashboard
2. Click on your **whale-class** project
3. Click **Settings** tab
4. Click **Domains** in the left sidebar
5. Click **Add** button
6. Enter your domain (e.g., `whaleclass.com` or `www.whaleclass.com`)
7. Click **Add**
8. **IMPORTANT:** Copy the DNS records Vercel shows you:
   - A Record value (IP address)
   - CNAME value (if using www)

### Step 2: Configure GoDaddy DNS (3 minutes)

1. **Log in to GoDaddy:**
   - Go to: https://dcc.godaddy.com
   - Sign in

2. **Open DNS Management:**
   - Click **My Products**
   - Find your domain name
   - Click **DNS** (or **Manage DNS**)

3. **For Root Domain (whaleclass.com):**
   - Look for existing **A Record** with Name `@`
   - **Delete it** if it exists
   - Click **Add** button
   - Fill in:
     - **Type**: `A`
     - **Name**: `@` (or leave blank)
     - **Value**: `[Paste the IP from Vercel]` (usually starts with 76.76)
     - **TTL**: `600` (or 1 hour)
   - Click **Save**

4. **For www (www.whaleclass.com) - Optional but Recommended:**
   - Click **Add** button
   - Fill in:
     - **Type**: `CNAME`
     - **Name**: `www`
     - **Value**: `[Paste the CNAME from Vercel]` (usually `cname.vercel-dns.com`)
     - **TTL**: `600`
   - Click **Save**

### Step 3: Verify (Wait 5-60 minutes)

1. Go back to Vercel dashboard
2. Check the **Domains** section
3. Status will show:
   - ⏳ "Pending" → DNS propagating
   - ✅ "Valid Configuration" → Ready!
4. SSL certificate auto-provisions (5-10 minutes after DNS verified)

### Step 4: Test

1. Wait for "Valid Configuration" in Vercel
2. Visit: `https://yourdomain.com`
3. Should see your Whale Class site! 🐋

## 📋 Common Vercel DNS Values

**A Record (Root Domain):**
- Value: `76.76.21.21` (or what Vercel shows)
- This is Vercel's IP address

**CNAME (www):**
- Value: `cname.vercel-dns.com` (or what Vercel shows)

**⚠️ Always use the EXACT values Vercel shows in your dashboard!**

## 🎯 What Domain Should I Use?

**Option 1: Root Domain Only**
- `whaleclass.com`
- Use A record only

**Option 2: Both www and non-www (Recommended)**
- `whaleclass.com` (A record)
- `www.whaleclass.com` (CNAME)
- Vercel can redirect one to the other

## ⚠️ Important Tips

1. **Delete Old Records:**
   - Remove any existing A records for `@`
   - Remove conflicting CNAME records
   - Only keep Vercel's records

2. **DNS Propagation:**
   - Usually works in 1-2 hours
   - Can take up to 48 hours (rare)
   - Check status: https://www.whatsmydns.net

3. **SSL Certificate:**
   - Automatically provisioned by Vercel
   - Free and auto-renewing
   - Takes 5-10 minutes after DNS verified

4. **Both Domains:**
   - Add both `whaleclass.com` and `www.whaleclass.com` in Vercel
   - Configure redirect in Vercel settings if needed

## 🔍 Troubleshooting

**DNS Not Working?**
- Double-check values match Vercel exactly
- Wait longer (up to 48 hours)
- Check: https://www.whatsmydns.net

**SSL Not Working?**
- Wait 5-10 minutes after DNS verified
- Make sure you're using `https://` not `http://`

**Still Issues?**
- Verify records in GoDaddy match Vercel exactly
- Check TTL is set (600 is good)
- Contact Vercel support if needed

## ✅ Checklist

- [ ] Domain added to Vercel
- [ ] DNS records copied from Vercel
- [ ] A record added in GoDaddy
- [ ] CNAME added in GoDaddy (if using www)
- [ ] Old DNS records removed
- [ ] Saved changes in GoDaddy
- [ ] Waiting for DNS propagation
- [ ] Verified in Vercel dashboard
- [ ] SSL certificate active
- [ ] Tested https://yourdomain.com

## 🎉 Done!

Your Whale Class platform is now live at your custom domain! 🐋

Parents can easily access it, and it works great as a PWA!

