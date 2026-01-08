// scripts/curriculum/sync-assets.js
// Scans curriculum folders and updates manifest.json with what exists
//
// Usage: node scripts/curriculum/sync-assets.js

const fs = require('fs');
const path = require('path');

const CURRICULUM_DIR = path.join(__dirname, '../../curriculum');
const MANIFEST_PATH = path.join(CURRICULUM_DIR, 'manifest.json');
const IMAGES_DIR = path.join(CURRICULUM_DIR, 'assets/images/phonics/beginning-sounds');
const AUDIO_DIR = path.join(CURRICULUM_DIR, 'assets/audio/phonics/words');

function loadManifest() {
  const data = fs.readFileSync(MANIFEST_PATH, 'utf8');
  return JSON.parse(data);
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function syncAssets() {
  console.log('Syncing curriculum assets...\n');
  
  const manifest = loadManifest();
  let imagesFound = 0;
  let audioFound = 0;
  
  // Scan all phases
  for (const phase of ['phase1', 'phase2', 'phase3', 'vowels']) {
    const sounds = manifest.beginningSounds[phase];
    if (!sounds) continue;
    
    for (const [sound, data] of Object.entries(sounds)) {
      console.log(`Checking /${sound}/...`);
      
      let soundComplete = true;
      
      for (const word of data.words) {
        const asset = data.assets[word];
        
        // Check for image
        const imgPath = path.join(IMAGES_DIR, sound, `${word}.png`);
        const imgPathJpg = path.join(IMAGES_DIR, sound, `${word}.jpg`);
        
        if (fs.existsSync(imgPath)) {
          asset.image = `curriculum/assets/images/phonics/beginning-sounds/${sound}/${word}.png`;
          asset.status = 'local';
          imagesFound++;
          console.log(`  ✓ ${word}.png`);
        } else if (fs.existsSync(imgPathJpg)) {
          asset.image = `curriculum/assets/images/phonics/beginning-sounds/${sound}/${word}.jpg`;
          asset.status = 'local';
          imagesFound++;
          console.log(`  ✓ ${word}.jpg`);
        } else {
          asset.status = 'missing';
          soundComplete = false;
          console.log(`  ✗ ${word} (missing)`);
        }
        
        // Check for audio (in public folder for now)
        const audioPath = path.join(__dirname, '../../public/audio-new/words/pink', `${word}.mp3`);
        if (fs.existsSync(audioPath)) {
          asset.audio = `/audio-new/words/pink/${word}.mp3`;
          audioFound++;
        }
      }
      
      data.complete = soundComplete;
    }
    console.log('');
  }
  
  // Update stats
  manifest.stats.imagesComplete = imagesFound;
  manifest.stats.audioComplete = audioFound;
  manifest.lastUpdated = new Date().toISOString().split('T')[0];
  
  saveManifest(manifest);
  
  console.log('='.repeat(40));
  console.log(`Images found: ${imagesFound}/${manifest.stats.totalWords}`);
  console.log(`Audio found: ${audioFound}/${manifest.stats.totalWords}`);
  console.log('\nManifest updated!');
}

syncAssets();
