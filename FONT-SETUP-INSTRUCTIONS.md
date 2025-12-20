# Educational Font Setup - Single-Story 'a' Fix

## ✅ Implementation Complete

The PDF generator has been updated to use an educational font with **single-story 'a'** (ɑ) instead of the double-story 'a' (a) found in standard fonts.

## Current Status

- ✅ Code updated to support Andika font
- ✅ Font sizes increased for kindergarten readability
- ⏳ Font file needs to be added (see instructions below)

## Font Sizes (Updated)

| Card Size | Font Size | Previous |
|-----------|-----------|----------|
| Small     | 40pt      | 32pt     |
| Medium    | 56pt      | 48pt     |
| Large     | 80pt      | 64pt     |
| Jumbo     | 110pt     | 96pt     |
| Sentences | 44pt      | 36pt     |

## Setup Instructions

### Step 1: Download Andika Font

1. Go to: https://fonts.google.com/specimen/Andika
2. Click "Download family"
3. Extract the ZIP file
4. Find `Andika-Regular.ttf`

### Step 2: Convert Font for jsPDF

1. Go to: https://rawgit.com/nickshanks/jspdf/master/fontconverter/fontconverter.html
   - **OR** use: https://github.com/nickshanks/jspdf-fontconverter (if available)
2. Upload `Andika-Regular.ttf`
3. Copy the base64 output (it will be a very long string)

### Step 3: Add Font to Project

1. Open: `lib/materials/fonts/andika.ts`
2. Replace `PLACEHOLDER_BASE64_FONT_DATA` with the base64 string you copied
3. Save the file

### Step 4: Test

1. Generate a PDF with the Material Generator
2. Check that lowercase 'a' appears as single-story (ɑ) instead of double-story (a)

## Fallback Behavior

If the Andika font is not loaded:
- The system will automatically use Helvetica with **bold** styling
- Font sizes are still **much larger** for kindergarten readability
- All other features work normally

## Alternative Fonts

If Andika doesn't work, you can use:

1. **ABeeZee** (Google Fonts) - Also has single-story 'a'
2. **OpenDyslexic** - Free, accessibility-focused
3. **Comic Neue** - Comic Sans alternative

Follow the same conversion process for any of these fonts.

## Why This Matters

- Children learn to **write** with single-story 'a' (ɑ)
- Standard fonts use double-story 'a' (a)
- Using matching letterforms helps with:
  - Letter recognition
  - Handwriting practice
  - Reading comprehension
  - Reduced confusion

## Files Modified

- ✅ `lib/materials/pdf-generator.ts` - Updated to use educational font
- ✅ `lib/materials/generators/sentence-generator.ts` - Updated for sentences
- ✅ `lib/materials/fonts/andika.ts` - Font definition file (needs base64 data)
- ✅ `lib/materials/fonts/README.md` - Setup documentation

