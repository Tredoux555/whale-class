const fs = require('fs');
const path = require('path');

// Simple approach: Create SVG icons with whale emoji
// Then we'll need to convert them to PNG (user can use online tool or ImageMagick)

const sizes = [32, 180, 192, 512];

sizes.forEach(size => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#4A90E2"/>
  <text x="50%" y="50%" font-size="${size * 0.7}" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif">🐋</text>
</svg>`;
  
  const svgPath = path.join(__dirname, '..', 'public', `icon-${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log(`Created ${svgPath}`);
});

console.log('\nSVG icons created!');
console.log('To convert to PNG, you can:');
console.log('1. Use an online converter: https://cloudconvert.com/svg-to-png');
console.log('2. Or use ImageMagick: convert icon-192.svg icon-192.png');
console.log('3. Or use the HTML generator: open public/generate-whale-icon.html in a browser');

