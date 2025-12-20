# Educational Font Setup for PDF Generator

## Problem
Standard fonts use **double-story 'a'** (like: a) but children learn to write with **single-story 'a'** (like: ɑ)

## Solution
Use Andika font (free, SIL Open Font License) which has proper infant/child letterforms.

## Setup Instructions

### Option 1: Download Andika Font

1. Go to: https://fonts.google.com/specimen/Andika
2. Download the TTF file: `Andika-Regular.ttf`
3. Save it to: `public/fonts/Andika-Regular.ttf`

### Option 2: Use jsPDF Font Converter

1. Go to: https://rawgit.com/nickshanks/jspdf/master/fontconverter/fontconverter.html
2. Upload `Andika-Regular.ttf`
3. Copy the base64 output
4. Paste it into `lib/materials/fonts/andika.ts` in the `AndikaFont.normal` field

### Option 3: Use ABeeZee (Alternative)

ABeeZee from Google Fonts also has single-story 'a':
- Download from: https://fonts.google.com/specimen/ABeeZee
- Follow same conversion process

## Font Comparison

| Font | Single-Story 'a' | Free | Best For |
|------|------------------|------|----------|
| Andika | ✅ Yes | ✅ Free | Literacy/Education |
| ABeeZee | ✅ Yes | ✅ Free | Children's content |
| OpenDyslexic | ✅ Yes | ✅ Free | Accessibility |
| Comic Neue | ✅ Yes | ✅ Free | Casual/Fun |
| Helvetica | ❌ No | Built-in | Not for kids |

## Current Status

The PDF generator is configured to use Andika font when available. If the font file is not found, it will fall back to Helvetica with larger sizes.


