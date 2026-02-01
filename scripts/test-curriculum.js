// Quick test to verify curriculum data
// Run with: node scripts/test-curriculum.js

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../lib/curriculum/data');

const files = ['practical-life.json', 'sensorial.json', 'math.json', 'language.json', 'cultural.json'];

let totalWorks = 0;

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    let worksCount = 0;

    if (data.categories) {
      data.categories.forEach(cat => {
        worksCount += (cat.works || cat.activities || []).length;
      });
    } else if (data.works) {
      worksCount = data.works.length;
    } else if (Array.isArray(data)) {
      worksCount = data.length;
    }

    console.log(`✅ ${file}: ${worksCount} works`);
    totalWorks += worksCount;
  } catch (err) {
    console.error(`❌ ${file}: ${err.message}`);
  }
});

console.log(`\n📚 Total works in static curriculum: ${totalWorks}`);
console.log(`\nIf this number is > 0, the static fallback should work!`);
