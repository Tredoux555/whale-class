# How to Package Story System for AI Debugging

This guide shows you how to easily package the Story messaging system for sharing with an AI assistant.

## 🚀 Quick Methods

### Method 1: Use the Debug Package Document (Recommended)

The easiest way is to use the comprehensive markdown file:

1. **Open the file:**
   ```bash
   open STORY_SYSTEM_DEBUG_PACKAGE.md
   ```

2. **Copy the entire contents** and paste it into your AI chat

3. **Or share the file directly** if your AI supports file uploads

**Advantages:**
- ✅ Single file with all code
- ✅ Well-organized with table of contents
- ✅ Includes database schema, API routes, frontend pages
- ✅ Contains debugging notes and common issues
- ✅ Easy to search and navigate

### Method 2: Create a Bundle Archive

Use the automated script to create a zip file:

```bash
# Run the bundle script
./scripts/bundle-story-for-debug.sh
```

This creates:
- `story-debug-bundle-YYYYMMDD_HHMMSS/` - Directory with all files
- `story-debug-bundle-YYYYMMDD_HHMMSS.zip` - Compressed archive

**Then:**
- Upload the `.zip` file to your AI if it supports file uploads
- Or extract and share individual files as needed

### Method 3: Manual Selection

If you only need specific files, copy these manually:

**Essential Files:**
```
app/story/page.tsx                          # User login
app/story/[session]/page.tsx                # Story viewer
app/story/admin/page.tsx                    # Admin login
app/story/admin/dashboard/page.tsx          # Admin dashboard
app/api/story/auth/route.ts                 # User auth
app/api/story/current/route.ts              # Get story
app/api/story/message/route.ts              # Message handling
app/api/story/upload-media/route.ts         # Media upload
app/api/story/admin/auth/route.ts            # Admin auth
app/api/story/admin/send-message/route.ts   # Admin send message
migrations/story_complete_schema.sql        # Database schema
lib/story-auth.ts                           # Auth utilities
```

## 📋 What to Include When Sharing

When sharing with an AI, include:

1. **The Problem:** What's not working?
2. **Error Messages:** Any console errors or API errors
3. **Environment:** Development or production?
4. **Recent Changes:** What did you change recently?
5. **Expected Behavior:** What should happen?
6. **Actual Behavior:** What actually happens?

## 🎯 Best Practices

### For Quick Questions
- Use `STORY_SYSTEM_DEBUG_PACKAGE.md` - it has everything in one place

### For Complex Issues
- Use the bundle script to create a complete archive
- Include relevant error logs
- Mention which environment (dev/prod)

### For Specific Features
- Copy just the relevant files
- Include the database schema if it's a data issue
- Include the API route and frontend page if it's a UI issue

## 📝 Example Sharing Template

When sharing with AI, you can use this template:

```
I'm working on the Story messaging system. Here's the issue:

**Problem:** [Describe the issue]

**Error:** [Paste error message if any]

**Files Affected:**
- [List relevant files]

**Environment:** [Development/Production]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

[Then paste the relevant code from STORY_SYSTEM_DEBUG_PACKAGE.md]
```

## 🔍 Quick Reference

**Main Entry Points:**
- User login: `/story` → `app/story/page.tsx`
- Story viewer: `/story/[session]` → `app/story/[session]/page.tsx`
- Admin login: `/story/admin` → `app/story/admin/page.tsx`
- Admin dashboard: `/story/admin/dashboard` → `app/story/admin/dashboard/page.tsx`

**Key API Endpoints:**
- `POST /api/story/auth` - User login
- `GET /api/story/current` - Get current story
- `POST /api/story/message` - Save message
- `POST /api/story/upload-media` - Upload media
- `POST /api/story/admin/auth` - Admin login
- `POST /api/story/admin/send-message` - Send admin message

**Database Tables:**
- `secret_stories` - Weekly stories
- `story_users` - User accounts
- `story_message_history` - All messages/media
- `story_login_logs` - Login tracking
- `story_admin_users` - Admin accounts

## 💡 Tips

1. **Always include the database schema** if the issue involves data
2. **Include both frontend and API code** if it's a user-facing issue
3. **Mention environment variables** if there are auth/storage issues
4. **Include error logs** from browser console or server logs
5. **Describe the user flow** that's failing

---

**Need help?** Check `STORY_SYSTEM_DEBUG_PACKAGE.md` for complete codebase overview and debugging notes.

