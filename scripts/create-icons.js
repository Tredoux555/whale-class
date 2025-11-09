const fs = require('fs');
const path = require('path');

function createPlaceholderIcon(size, filename) {
  // Create a simple SVG as placeholder
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#4A90E2"/>
  <text x="${size/2}" y="${size/2}" font-family="Arial" font-size="${size * 0.4}" fill="white" text-anchor="middle" dominant-baseline="middle">🐋</text>
</svg>`;
  
  const publicDir = path.join(__dirname, '..', 'public');
  const svgPath = path.join(publicDir, filename.replace('.png', '.svg'));
  fs.writeFileSync(svgPath, svg);
  console.log(`Created ${filename.replace('.png', '.svg')}`);
}

// Create placeholder icons
createPlaceholderIcon(192, 'icon-192.png');
createPlaceholderIcon(512, 'icon-512.png');

console.log('\n✅ SVG icons created!');
console.log('\n📝 To create PNG icons for PWA:');
console.log('   1. Open icon-192.svg and icon-512.svg in an image editor');
console.log('   2. Export as PNG with the same dimensions');
console.log('   3. Or use an online converter: https://cloudconvert.com/svg-to-png');
console.log('   4. Save as icon-192.png and icon-512.png in the public folder');

