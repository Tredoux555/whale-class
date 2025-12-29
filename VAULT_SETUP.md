# 🔒 VAULT SYSTEM SETUP

## Required Environment Variables (Railway)

Add these to Railway dashboard:

```
VAULT_PASSWORD=your-secure-password-here
```

## Required Supabase Setup

### 1. Run SQL Migration
Run `VAULT_FIX.sql` in Supabase SQL Editor to create tables.

### 2. Create Storage Bucket
In Supabase Dashboard:
1. Go to **Storage** (left sidebar)
2. Click **New Bucket**
3. Name: `vault-secure`
4. **Public bucket**: OFF (private)
5. Click **Create bucket**

### 3. Storage Policies
After creating bucket, add policy:
1. Click on `vault-secure` bucket
2. Go to **Policies** tab
3. Click **New Policy**
4. Select **For full customization**
5. Policy name: `Service role full access`
6. Operations: ALL (SELECT, INSERT, UPDATE, DELETE)
7. Policy definition: `service_role` (or use `true` for testing)

## Features Added

1. **Auto-refresh messages** - Messages tab refreshes every 10 seconds
2. **Save to Vault button** - Click on any image/video in messages → Save to Vault
3. **Vault API** - New endpoint `/api/story/admin/vault/save-from-message`

## Testing

1. Go to https://teacherpotato.xyz/story/admin
2. Login as admin
3. Go to Messages tab - should auto-refresh
4. Upload an image, then click "Save to Vault"
5. Go to Vault tab, unlock with VAULT_PASSWORD
6. File should appear

## Troubleshooting

- **"Upload failed"** → Check vault-secure bucket exists
- **"Storage not configured"** → Check SUPABASE_SERVICE_ROLE_KEY in Railway
- **"Decryption failed"** → VAULT_PASSWORD changed since upload
