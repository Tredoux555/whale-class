// scripts/generate-pwa-icons.js
// Run: node scripts/generate-pwa-icons.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '../public/montree-icons/icon.svg');
const outputDir = path.join(__dirname, '../public/montree-icons');

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  const svgBuffer = fs.readFileSync(inputSvg);
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✓ Generated icon-${size}.png`);
  }
  
  // Generate screenshot placeholders
  await sharp({
    create: {
      width: 1280,
      height: 720,
      channels: 4,
      background: { r: 16, g: 185, b: 129, alpha: 1 }
    }
  })
    .png()
    .toFile(path.join(outputDir, 'screenshot-wide.png'));
  console.log('✓ Generated screenshot-wide.png');
  
  await sharp({
    create: {
      width: 750,
      height: 1334,
      channels: 4,
      background: { r: 16, g: 185, b: 129, alpha: 1 }
    }
  })
    .png()
    .toFile(path.join(outputDir, 'screenshot-narrow.png'));
  console.log('✓ Generated screenshot-narrow.png');
  
  console.log('\n✅ All icons generated!');
}

generateIcons().catch(console.error);
