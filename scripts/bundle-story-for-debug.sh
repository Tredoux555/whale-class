#!/bin/bash

# Story System Debug Bundle Script
# Creates a comprehensive package of all story-related files for AI debugging

OUTPUT_DIR="story-debug-bundle"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BUNDLE_NAME="story-debug-bundle-${TIMESTAMP}"

echo "📦 Creating Story System Debug Bundle..."
echo ""

# Create output directory
mkdir -p "${BUNDLE_NAME}"

# Copy all story-related files
echo "📁 Copying files..."

# Frontend pages
mkdir -p "${BUNDLE_NAME}/app/story"
cp -r app/story/* "${BUNDLE_NAME}/app/story/" 2>/dev/null || true

# API routes
mkdir -p "${BUNDLE_NAME}/app/api/story"
cp -r app/api/story/* "${BUNDLE_NAME}/app/api/story/" 2>/dev/null || true

# Library files
mkdir -p "${BUNDLE_NAME}/lib"
cp lib/story-auth.ts "${BUNDLE_NAME}/lib/" 2>/dev/null || true

# Migrations
mkdir -p "${BUNDLE_NAME}/migrations"
cp migrations/*story*.sql "${BUNDLE_NAME}/migrations/" 2>/dev/null || true
cp migrations/001_create_secret_story_tables*.sql "${BUNDLE_NAME}/migrations/" 2>/dev/null || true
cp migrations/002_create_story_users.sql "${BUNDLE_NAME}/migrations/" 2>/dev/null || true
cp migrations/009_story*.sql "${BUNDLE_NAME}/migrations/" 2>/dev/null || true
cp migrations/010_story*.sql "${BUNDLE_NAME}/migrations/" 2>/dev/null || true

# Scripts
mkdir -p "${BUNDLE_NAME}/scripts"
cp scripts/setup-story-users.js "${BUNDLE_NAME}/scripts/" 2>/dev/null || true

# Documentation
mkdir -p "${BUNDLE_NAME}/docs"
cp STORY*.md "${BUNDLE_NAME}/docs/" 2>/dev/null || true
cp HOW_TO_FIX_STORY*.md "${BUNDLE_NAME}/docs/" 2>/dev/null || true
cp PROJECT_STRUCTURE_AND_STORY_SYSTEM.md "${BUNDLE_NAME}/docs/" 2>/dev/null || true

# Copy the debug package we just created
cp STORY_SYSTEM_DEBUG_PACKAGE.md "${BUNDLE_NAME}/" 2>/dev/null || true

# Create a README for the bundle
cat > "${BUNDLE_NAME}/README.md" << 'EOF'
# Story System Debug Bundle

This bundle contains all files related to the Story messaging system for debugging purposes.

## Contents

- `app/` - Frontend pages and API routes
- `lib/` - Library utilities
- `migrations/` - Database schema files
- `scripts/` - Setup scripts
- `docs/` - Documentation files
- `STORY_SYSTEM_DEBUG_PACKAGE.md` - Complete code package for AI

## Quick Start

1. Review `STORY_SYSTEM_DEBUG_PACKAGE.md` for complete codebase overview
2. Check `migrations/story_complete_schema.sql` for database structure
3. Review API routes in `app/api/story/`
4. Check frontend pages in `app/story/`

## Environment Variables Needed

- `DATABASE_URL` - PostgreSQL connection string
- `STORY_JWT_SECRET` - JWT signing secret
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key

## Common Issues

See `STORY_SYSTEM_DEBUG_PACKAGE.md` for debugging notes and common issues.
EOF

# Create a file list
echo "Creating file list..."
find "${BUNDLE_NAME}" -type f | sort > "${BUNDLE_NAME}/FILE_LIST.txt"

# Create zip archive
echo ""
echo "📦 Creating zip archive..."
zip -r "${BUNDLE_NAME}.zip" "${BUNDLE_NAME}" -q

# Calculate sizes
BUNDLE_SIZE=$(du -sh "${BUNDLE_NAME}" | cut -f1)
ZIP_SIZE=$(du -sh "${BUNDLE_NAME}.zip" | cut -f1)

echo ""
echo "✅ Bundle created successfully!"
echo ""
echo "📊 Bundle Info:"
echo "   Directory: ${BUNDLE_NAME}/"
echo "   Archive: ${BUNDLE_NAME}.zip"
echo "   Size: ${BUNDLE_SIZE} (${ZIP_SIZE} compressed)"
echo ""
echo "📄 Files included:"
echo "   - Frontend pages: $(find "${BUNDLE_NAME}/app/story" -type f 2>/dev/null | wc -l | tr -d ' ') files"
echo "   - API routes: $(find "${BUNDLE_NAME}/app/api/story" -type f 2>/dev/null | wc -l | tr -d ' ') files"
echo "   - Migrations: $(find "${BUNDLE_NAME}/migrations" -type f 2>/dev/null | wc -l | tr -d ' ') files"
echo "   - Documentation: $(find "${BUNDLE_NAME}/docs" -type f 2>/dev/null | wc -l | tr -d ' ') files"
echo ""
echo "💡 Usage:"
echo "   1. Share ${BUNDLE_NAME}.zip with AI for debugging"
echo "   2. Or share STORY_SYSTEM_DEBUG_PACKAGE.md for complete code overview"
echo ""

