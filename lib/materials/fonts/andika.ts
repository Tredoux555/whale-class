// lib/materials/fonts/andika.ts
// Andika font for jsPDF (educational font with single-story 'a')
// 
// TO SETUP:
// 1. Download Andika-Regular.ttf from https://fonts.google.com/specimen/Andika
// 2. Convert using: https://rawgit.com/nickshanks/jspdf/master/fontconverter/fontconverter.html
// 3. Paste the base64 output below in the 'normal' field
//
// This font has single-story lowercase 'a' (ɑ) which matches how children learn to write

export const AndikaFont = {
  normal: 'PLACEHOLDER_BASE64_FONT_DATA',
  // After conversion, replace PLACEHOLDER_BASE64_FONT_DATA with the actual base64 string
};

// Check if font is loaded
export function isAndikaFontLoaded(): boolean {
  return AndikaFont.normal !== 'PLACEHOLDER_BASE64_FONT_DATA' && AndikaFont.normal.length > 100;
}


