# 🔧 Story System Deep Dive - January 19, 2026

## Issues Found

### 1. **Database Column Mismatch** 🔴 CRITICAL
The code expects different column names than what's in the database:

| Table | Code Expects | Migration Created |
|-------|--------------|-------------------|
| story_login_logs | `login_at` | `login_time` |
| story_login_logs | `session_token` | `session_id` |
| story_message_history | `content` | `message_content` |

### 2. **Missing Tables** 🔴 CRITICAL
- `story_admin_login_logs` - Required for admin login tracking
- `vault_audit_log` - Required for vault security logging

### 3. **Missing Columns** 🟡 MEDIUM
- `story_login_logs.logout_at` - For tracking logouts
- `story_message_history.is_from_admin` - For admin message tracking
- `story_message_history.session_token` - For session linking
- `story_message_history.login_log_id` - For audit trail
- `vault_files.file_url` - For file storage
- `vault_files.encrypted_key` - For encryption metadata
- `vault_files.file_hash` - For integrity checks
- `vault_files.deleted_at` - For soft delete

### 4. **Timestamp Types** 🟡 MEDIUM
All `TIMESTAMP` columns should be `TIMESTAMPTZ` for proper timezone handling in Beijing.

---

## Fix Instructions

### Step 1: Run the SQL Fix
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `/FIX_STORY_SYSTEM_JAN19.sql`
3. Run the SQL

### Step 2: Create Storage Bucket (if not exists)
In Supabase Dashboard → Storage:
1. Create bucket: `vault-secure`
2. Set to private (not public)

### Step 3: Test the App
1. Go to `/story/admin`
2. Login with: **T** / **redoux**
3. Check all tabs work:
   - ✅ Active Users
   - ✅ Activity Log  
   - ✅ Messages
   - ✅ Media Vault
   - ✅ System Controls

4. Go to `/story`
5. Login with: **T** / **redoux**
6. Test story viewing and message features

---

## Architecture Summary

### Authentication Flow
```
/story (Parent Login)
   └─> /api/story/auth (POST)
       └─> JWT token → sessionStorage
           └─> /story/{session} (Story Viewer)

/story/admin (Admin Login)  
   └─> /api/story/admin/auth (POST)
       └─> JWT token → sessionStorage
           └─> /story/admin/dashboard
```

### Database Tables
```
secret_stories       - Weekly stories with hidden messages
story_users          - Parent user credentials
story_login_logs     - Parent login tracking
story_message_history - All messages (text/image/video/audio)
story_admin_users    - Admin credentials
story_admin_login_logs - Admin login tracking
vault_files          - Encrypted media storage
vault_audit_log      - Security audit trail
```

### API Routes
```
/api/story/auth           - Parent authentication
/api/story/current        - Get current story
/api/story/current-media  - Get media for current week
/api/story/message        - Send message (parent)
/api/story/upload-media   - Upload media (parent)

/api/story/admin/auth         - Admin authentication
/api/story/admin/online-users - Active users dashboard
/api/story/admin/login-logs   - Login history
/api/story/admin/message-history - Message management
/api/story/admin/send-message    - Send text message
/api/story/admin/send-image      - Send image
/api/story/admin/send-audio      - Send audio
/api/story/admin/system-controls - System management
/api/story/admin/vault/*         - Encrypted file vault
```

---

## Hardcoded Credentials (Fallback)
If database auth fails, these hardcoded credentials work:

| Username | Password | Access |
|----------|----------|--------|
| T | redoux | Parent + Admin |
| Z | oe | Parent |

---

## Quick Debug Commands

```bash
# Check if dev server is running
curl http://localhost:3000/api/story/test-connection

# Test parent login
curl -X POST http://localhost:3000/api/story/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"T","password":"redoux"}'

# Test admin login  
curl -X POST http://localhost:3000/api/story/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"T","password":"redoux"}'
```

---

## File Locations

| Purpose | File |
|---------|------|
| Parent Login Page | `/app/story/page.tsx` |
| Story Viewer | `/app/story/[session]/page.tsx` |
| Admin Login | `/app/story/admin/page.tsx` |
| Admin Dashboard | `/app/story/admin/dashboard/page.tsx` |
| Auth Library | `/lib/story-db.ts` |
| Encryption | `/lib/message-encryption.ts` |
| SQL Fix | `/FIX_STORY_SYSTEM_JAN19.sql` |
