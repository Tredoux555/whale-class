# 🌐 GoDaddy + Vercel Custom Domain Setup

## Quick Setup Guide

### Step 1: Add Domain to Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Click on your **whale-class** project
3. Go to **Settings** → **Domains**
4. Click **Add Domain**
5. Enter your domain (e.g., `whaleclass.com` or `www.whaleclass.com`)
6. Vercel will show you the DNS records needed

### Step 2: Configure DNS in GoDaddy

#### Option A: Using A Record (Root Domain - e.g., whaleclass.com)

1. **Log in to GoDaddy:**
   - Go to: https://dcc.godaddy.com
   - Sign in to your account

2. **Access DNS Management:**
   - Click on **My Products**
   - Find your domain
   - Click **DNS** or **Manage DNS**

3. **Add/Update A Record:**
   - Find the **A Record** for `@` (root domain)
   - **Delete** any existing A records for `@`
   - Click **Add** to create new A record:
     - **Type**: A
     - **Name**: `@` (or leave blank)
     - **Value**: `76.76.21.21` (Vercel's IP - this is an example, use what Vercel shows)
     - **TTL**: 600 (or default)

4. **Add CNAME for www (if you want www.whaleclass.com):**
   - Click **Add**
   - **Type**: CNAME
   - **Name**: `www`
   - **Value**: `cname.vercel-dns.com` (or what Vercel shows)
   - **TTL**: 600

#### Option B: Using CNAME (Subdomain - e.g., app.whaleclass.com)

1. **In GoDaddy DNS:**
   - Click **Add**
   - **Type**: CNAME
   - **Name**: `app` (or your subdomain)
   - **Value**: `cname.vercel-dns.com` (or what Vercel shows)
   - **TTL**: 600

### Step 3: Verify in Vercel

1. Go back to Vercel dashboard
2. Wait a few minutes for DNS propagation
3. Vercel will show **"Valid Configuration"** when DNS is correct
4. SSL certificate will be automatically provisioned (takes ~5-10 minutes)

## 📋 Common DNS Records for Vercel

### Root Domain (whaleclass.com)
```
Type: A
Name: @
Value: 76.76.21.21 (or Vercel's IP)
TTL: 600
```

### www Subdomain (www.whaleclass.com)
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com (or Vercel's CNAME)
TTL: 600
```

## ⚠️ Important Notes

1. **DNS Propagation:**
   - Can take 24-48 hours (usually much faster)
   - Usually works within 1-2 hours
   - Check status in Vercel dashboard

2. **Remove Conflicting Records:**
   - Delete any existing A records for `@`
   - Delete any conflicting CNAME records
   - Only keep the Vercel records

3. **SSL Certificate:**
   - Vercel automatically provisions SSL
   - Takes 5-10 minutes after DNS is verified
   - Your site will be HTTPS automatically

4. **Both www and non-www:**
   - Vercel can handle both
   - Add both domains in Vercel
   - Configure redirects in Vercel settings if needed

## 🔍 Troubleshooting

### DNS Not Working?
1. Check DNS propagation: https://www.whatsmydns.net
2. Verify records in GoDaddy match Vercel's requirements
3. Wait up to 48 hours for full propagation
4. Clear your browser cache

### SSL Not Working?
1. Wait 5-10 minutes after DNS verification
2. Check Vercel dashboard for SSL status
3. Try accessing `https://yourdomain.com` (not http)

### Still Having Issues?
1. Double-check DNS records match exactly what Vercel shows
2. Make sure TTL is set (600 is good)
3. Remove any conflicting records
4. Contact Vercel support if needed

## ✅ Quick Checklist

- [ ] Domain added to Vercel
- [ ] DNS records added in GoDaddy
- [ ] Old DNS records removed
- [ ] Wait for DNS propagation (1-2 hours)
- [ ] Verify in Vercel dashboard
- [ ] SSL certificate provisioned
- [ ] Test https://yourdomain.com

## 🎉 After Setup

Your Whale Class platform will be live at:
- **https://yourdomain.com**
- **https://www.yourdomain.com** (if configured)

Parents can access it easily, and it will work great as a PWA! 🐋

