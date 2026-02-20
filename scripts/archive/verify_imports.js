const fs = require('fs');
const path = require('path');

const dashboardPath = './app/story/admin/dashboard';

// Check page.tsx imports
const pageContent = fs.readFileSync(path.join(dashboardPath, 'page.tsx'), 'utf-8');
const pageImports = pageContent.match(/import .* from ['"].*['"]/g) || [];

console.log('=== PAGE.TSX IMPORTS ===');
pageImports.forEach(imp => console.log(imp));

// Check components for 'use client'
const componentsPath = path.join(dashboardPath, 'components');
const files = fs.readdirSync(componentsPath);

console.log('\n=== COMPONENTS WITH "use client" ===');
files.forEach(file => {
  const content = fs.readFileSync(path.join(componentsPath, file), 'utf-8');
  const hasUseClient = content.includes("'use client'");
  console.log(`${file}: ${hasUseClient ? '✓' : '✗'}`);
});

// Check hooks
const hooksPath = path.join(dashboardPath, 'hooks');
const hookFiles = fs.readdirSync(hooksPath);

console.log('\n=== HOOKS ===');
hookFiles.forEach(file => {
  console.log(`✓ ${file}`);
});

console.log('\n=== TOTAL FILES ===');
console.log(`Components: ${files.length}`);
console.log(`Hooks: ${hookFiles.length}`);
console.log(`+ types.ts + utils.ts + page.tsx = ${files.length + hookFiles.length + 3} total`);
