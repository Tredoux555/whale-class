#!/usr/bin/env node
/**
 * WHALE - Download Educational Images from Pixabay
 * 
 * Downloads child-friendly illustrations for all game words
 * Uses Pixabay API (free, CC0 license, commercial use OK)
 * 
 * Usage: PIXABAY_KEY=your_key node scripts/download-game-images.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Get API key from environment
const API_KEY = process.env.PIXABAY_KEY;

if (!API_KEY) {
  console.error('❌ Missing PIXABAY_KEY environment variable!');
  console.error('');
  console.error('To get your free API key:');
  console.error('1. Go to https://pixabay.com/accounts/register/');
  console.error('2. Create free account');
  console.error('3. Go to https://pixabay.com/api/docs/');
  console.error('4. Copy your API key from the top of the page');
  console.error('');
  console.error('Then run: PIXABAY_KEY=your_key_here node scripts/download-game-images.js');
  process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, '../public/images/words');

// All words needed for the games
const WORDS = [
  // Animals
  'cat', 'dog', 'bat', 'rat', 'pig', 'hen', 'fox', 'bug', 'ant', 'bee',
  'cow', 'frog', 'fish', 'duck', 'bird', 'goat', 'wolf', 'worm', 'crab',
  'elephant', 'zebra', 'rabbit', 'mouse', 'sheep', 'horse', 'tiger',
  'octopus', 'ostrich', 'alligator', 'chicken', 'insect', 'spider',
  // Objects - household
  'cup', 'mug', 'pot', 'pan', 'bed', 'rug', 'mat', 'hat', 'cap', 'bag',
  'box', 'lid', 'bin', 'tub', 'jug', 'jar', 'can', 'fan', 'pen', 'net',
  'web', 'wig', 'bib', 'mop', 'map', 'tap', 'lamp', 'desk', 'dish', 'soap',
  'fork', 'spoon', 'chair', 'door', 'book', 'clock', 'watch', 'shoe',
  'sock', 'shirt', 'vest', 'coat', 'dress', 'jeans', 'ring', 'vase',
  // Body parts
  'leg', 'lip', 'hip', 'chin', 'hand', 'foot', 'nose', 'elbow', 'thumb',
  // Food
  'ham', 'jam', 'egg', 'nut', 'bun', 'gum', 'pie', 'pea', 'fig', 'yam',
  'cake', 'milk', 'cheese', 'grape', 'apple', 'orange', 'lemon', 'pear',
  'cherry', 'olive', 'bread', 'juice',
  // Nature
  'sun', 'mud', 'log', 'fog', 'web', 'leaf', 'tree', 'rain', 'moon',
  'star', 'nest', 'vine', 'grass', 'flower', 'snake', 'plant',
  // Transport
  'bus', 'van', 'car', 'jet', 'ship', 'boat', 'train', 'truck',
  // Toys & play
  'bat', 'ball', 'top', 'doll', 'drum', 'kite', 'tent', 'swing', 'slide',
  // Actions/concepts shown as objects
  'run', 'hop', 'hug', 'dig', 'sit', 'hit', 'mix', 'cut', 'jump',
  // Numbers
  'six', 'nine', 'two', 'three', 'zero',
  // Colors (as objects)
  'red', 'pink', 'green', 'yellow',
  // Other objects
  'gift', 'heart', 'arrow', 'envelope', 'umbrella', 'igloo', 'house',
  'ink', 'ax', 'wax', 'zip', 'zone', 'zoo', 'violin', 'yarn', 'yo-yo',
  'nurse', 'vet', 'girl', 'elf', 'uncle', 'umpire',
];

// Remove duplicates
const uniqueWords = [...new Set(WORDS)];

// Download helper
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete partial file
      reject(err);
    });
  });
}

// Search Pixabay for an image
async function searchPixabay(query) {
  return new Promise((resolve, reject) => {
    // Prefer illustrations/vectors for consistent child-friendly style
    const url = `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(query)}&image_type=illustration&safesearch=true&per_page=3`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Rate limiting
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function downloadWord(word) {
  const filepath = path.join(OUTPUT_DIR, `${word}.png`);
  
  // Skip if already exists
  if (fs.existsSync(filepath)) {
    console.log(`  ⏭️  ${word} (already exists)`);
    return { word, status: 'skipped' };
  }
  
  try {
    // Search for illustration
    let result = await searchPixabay(word);
    
    // If no illustration found, try photo
    if (!result.hits || result.hits.length === 0) {
      const photoUrl = `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(word)}&image_type=photo&safesearch=true&per_page=3`;
      result = await new Promise((resolve, reject) => {
        https.get(photoUrl, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });
    }
    
    if (!result.hits || result.hits.length === 0) {
      console.log(`  ❌ ${word} (no results)`);
      return { word, status: 'not_found' };
    }
    
    // Get the webformat URL (640px, good quality)
    const imageUrl = result.hits[0].webformatURL;
    
    // Download
    await downloadImage(imageUrl, filepath);
    console.log(`  ✅ ${word}`);
    return { word, status: 'downloaded' };
    
  } catch (err) {
    console.log(`  ❌ ${word} (${err.message})`);
    return { word, status: 'error', error: err.message };
  }
}

async function main() {
  console.log('🖼️  WHALE - Educational Image Downloader');
  console.log('=========================================');
  console.log(`Words to download: ${uniqueWords.length}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('');
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const results = {
    downloaded: 0,
    skipped: 0,
    not_found: [],
    errors: []
  };
  
  for (const word of uniqueWords) {
    const result = await downloadWord(word);
    
    if (result.status === 'downloaded') results.downloaded++;
    else if (result.status === 'skipped') results.skipped++;
    else if (result.status === 'not_found') results.not_found.push(word);
    else if (result.status === 'error') results.errors.push(word);
    
    // Rate limit: Pixabay allows 100 requests/minute
    await delay(700);
  }
  
  // Summary
  console.log('');
  console.log('=========================================');
  console.log('📊 SUMMARY');
  console.log('=========================================');
  console.log(`  Downloaded: ${results.downloaded}`);
  console.log(`  Skipped (existing): ${results.skipped}`);
  console.log(`  Not found: ${results.not_found.length}`);
  console.log(`  Errors: ${results.errors.length}`);
  
  if (results.not_found.length > 0) {
    console.log('');
    console.log('Words not found (may need manual search):');
    console.log(`  ${results.not_found.join(', ')}`);
  }
  
  console.log('');
  console.log('✅ Done! Images saved to /public/images/words/');
}

main().catch(console.error);
