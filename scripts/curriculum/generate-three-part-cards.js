// scripts/curriculum/generate-three-part-cards.js
// Generates Montessori three-part cards PDF from curriculum images
// 
// Usage: node scripts/curriculum/generate-three-part-cards.js --sound s
//
// Three-part cards consist of:
// 1. Control Card - Image with label attached (for self-checking)
// 2. Picture Card - Image only
// 3. Label Card - Word only
//
// Output: curriculum/three-part-cards/generated/beginning-{sound}.pdf

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Configuration
const CARD_WIDTH = 180;  // points (2.5 inches)
const CARD_HEIGHT = 200; // points (2.78 inches)
const IMAGE_SIZE = 140;  // points
const MARGIN = 36;       // 0.5 inch margin
const FONT_SIZE = 24;
const CARDS_PER_ROW = 3;

// Paths
const CURRICULUM_DIR = path.join(__dirname, '../../curriculum');
const MANIFEST_PATH = path.join(CURRICULUM_DIR, 'manifest.json');
const OUTPUT_DIR = path.join(CURRICULUM_DIR, 'three-part-cards/generated');

function loadManifest() {
  const data = fs.readFileSync(MANIFEST_PATH, 'utf8');
  return JSON.parse(data);
}

function findSoundData(manifest, sound) {
  // Check all phases for the sound
  for (const phase of ['phase1', 'phase2', 'phase3', 'vowels']) {
    if (manifest.beginningSounds[phase]?.[sound]) {
      return {
        phase,
        ...manifest.beginningSounds[phase][sound]
      };
    }
  }
  return null;
}

function getImagePath(sound, word) {
  return path.join(CURRICULUM_DIR, 'assets/images/phonics/beginning-sounds', sound, `${word}.png`);
}

async function generatePDF(sound) {
  const manifest = loadManifest();
  const soundData = findSoundData(manifest, sound);
  
  if (!soundData) {
    console.error(`Sound "${sound}" not found in manifest`);
    process.exit(1);
  }
  
  console.log(`\nGenerating three-part cards for /${sound}/`);
  console.log(`Words: ${soundData.words.join(', ')}`);
  
  // Check which images exist
  const availableWords = [];
  const missingWords = [];
  
  for (const word of soundData.words) {
    const imgPath = getImagePath(sound, word);
    if (fs.existsSync(imgPath)) {
      availableWords.push(word);
    } else {
      missingWords.push(word);
    }
  }
  
  if (missingWords.length > 0) {
    console.log(`\n⚠️  Missing images: ${missingWords.join(', ')}`);
  }
  
  if (availableWords.length === 0) {
    console.error('No images available. Add images first.');
    process.exit(1);
  }
  
  console.log(`✓ Found ${availableWords.length} images`);
  
  // Create PDF
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN }
  });
  
  const outputPath = path.join(OUTPUT_DIR, `beginning-${sound}.pdf`);
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);
  
  // Title page
  doc.fontSize(36).text(`Sound: /${sound}/`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(18).text('Three-Part Cards', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(14).text(`Words: ${availableWords.join(', ')}`, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(12).text('Instructions:', { align: 'left' });
  doc.text('1. Cut out all cards along the lines');
  doc.text('2. Laminate for durability');
  doc.text('3. Child matches picture cards to label cards');
  doc.text('4. Child checks work using control cards');
  
  // Page 1: Control Cards (image + label together)
  doc.addPage();
  doc.fontSize(16).text('Control Cards (Image + Label)', { align: 'center' });
  doc.moveDown();
  
  let x = MARGIN;
  let y = doc.y;
  
  for (let i = 0; i < availableWords.length; i++) {
    const word = availableWords[i];
    const imgPath = getImagePath(sound, word);
    
    // Draw card border
    doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT).stroke();
    
    // Draw image
    try {
      doc.image(imgPath, x + (CARD_WIDTH - IMAGE_SIZE) / 2, y + 10, {
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        fit: [IMAGE_SIZE, IMAGE_SIZE]
      });
    } catch (e) {
      // Placeholder if image fails
      doc.rect(x + 20, y + 10, IMAGE_SIZE, IMAGE_SIZE).stroke();
      doc.fontSize(10).text('IMAGE', x + 60, y + 70);
    }
    
    // Draw label
    doc.fontSize(FONT_SIZE).text(word, x, y + IMAGE_SIZE + 20, {
      width: CARD_WIDTH,
      align: 'center'
    });
    
    // Move to next position
    x += CARD_WIDTH + 10;
    if ((i + 1) % CARDS_PER_ROW === 0) {
      x = MARGIN;
      y += CARD_HEIGHT + 20;
      
      // New page if needed
      if (y + CARD_HEIGHT > doc.page.height - MARGIN) {
        doc.addPage();
        y = MARGIN;
      }
    }
  }
  
  // Page 2: Picture Cards (image only)
  doc.addPage();
  doc.fontSize(16).text('Picture Cards (Image Only)', { align: 'center' });
  doc.moveDown();
  
  x = MARGIN;
  y = doc.y;
  
  for (let i = 0; i < availableWords.length; i++) {
    const word = availableWords[i];
    const imgPath = getImagePath(sound, word);
    
    // Draw card border
    doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT).stroke();
    
    // Draw image (larger, centered)
    try {
      doc.image(imgPath, x + (CARD_WIDTH - IMAGE_SIZE) / 2, y + (CARD_HEIGHT - IMAGE_SIZE) / 2, {
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        fit: [IMAGE_SIZE, IMAGE_SIZE]
      });
    } catch (e) {
      doc.rect(x + 20, y + 30, IMAGE_SIZE, IMAGE_SIZE).stroke();
    }
    
    x += CARD_WIDTH + 10;
    if ((i + 1) % CARDS_PER_ROW === 0) {
      x = MARGIN;
      y += CARD_HEIGHT + 20;
      
      if (y + CARD_HEIGHT > doc.page.height - MARGIN) {
        doc.addPage();
        y = MARGIN;
      }
    }
  }
  
  // Page 3: Label Cards (word only)
  doc.addPage();
  doc.fontSize(16).text('Label Cards (Word Only)', { align: 'center' });
  doc.moveDown();
  
  x = MARGIN;
  y = doc.y;
  
  const LABEL_HEIGHT = 60;
  
  for (let i = 0; i < availableWords.length; i++) {
    const word = availableWords[i];
    
    // Draw card border
    doc.rect(x, y, CARD_WIDTH, LABEL_HEIGHT).stroke();
    
    // Draw word centered
    doc.fontSize(FONT_SIZE).text(word, x, y + (LABEL_HEIGHT - FONT_SIZE) / 2, {
      width: CARD_WIDTH,
      align: 'center'
    });
    
    x += CARD_WIDTH + 10;
    if ((i + 1) % CARDS_PER_ROW === 0) {
      x = MARGIN;
      y += LABEL_HEIGHT + 10;
      
      if (y + LABEL_HEIGHT > doc.page.height - MARGIN) {
        doc.addPage();
        y = MARGIN;
      }
    }
  }
  
  // Finalize
  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`\n✅ PDF created: ${outputPath}`);
      resolve(outputPath);
    });
    stream.on('error', reject);
  });
}

// Main
const args = process.argv.slice(2);
const soundIndex = args.indexOf('--sound');

if (soundIndex === -1 || !args[soundIndex + 1]) {
  console.log('Usage: node generate-three-part-cards.js --sound <letter>');
  console.log('Example: node generate-three-part-cards.js --sound s');
  process.exit(1);
}

const sound = args[soundIndex + 1].toLowerCase();

generatePDF(sound).catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
