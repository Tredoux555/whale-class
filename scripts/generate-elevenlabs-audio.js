#!/usr/bin/env node
/**
 * ElevenLabs Audio Generator for Whale Platform
 * Generates all audio files for the phonics games
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ElevenLabs API Configuration
const API_KEY = 'sk_4758ce62e8712bfcf8016cedd9c92077e2be46f5d1108cb4';
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel - warm, clear female voice

const BASE_URL = 'api.elevenlabs.io';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'audio-new');

// Voice settings for child-friendly audio
const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: true
};

// ============================================
// ALL AUDIO DATA
// ============================================

const AUDIO_DATA = {
  // Letter sounds (phonetic)
  letters: {
    folder: 'letters',
    items: [
      { file: 'a', text: 'ah' },
      { file: 'b', text: 'buh' },
      { file: 'c', text: 'kuh' },
      { file: 'd', text: 'duh' },
      { file: 'e', text: 'eh' },
      { file: 'f', text: 'fff' },
      { file: 'g', text: 'guh' },
      { file: 'h', text: 'huh' },
      { file: 'i', text: 'ih' },
      { file: 'j', text: 'juh' },
      { file: 'k', text: 'kuh' },
      { file: 'l', text: 'lll' },
      { file: 'm', text: 'mmm' },
      { file: 'n', text: 'nnn' },
      { file: 'o', text: 'oh' },
      { file: 'p', text: 'puh' },
      { file: 'q', text: 'kwuh' },
      { file: 'r', text: 'rrr' },
      { file: 's', text: 'sss' },
      { file: 't', text: 'tuh' },
      { file: 'u', text: 'uh' },
      { file: 'v', text: 'vvv' },
      { file: 'w', text: 'wuh' },
      { file: 'x', text: 'ks' },
      { file: 'y', text: 'yuh' },
      { file: 'z', text: 'zzz' },
    ]
  },

  // Digraph phonemes
  phonemes: {
    folder: 'phonemes',
    items: [
      { file: 'sh', text: 'shhhh' },
      { file: 'ch', text: 'chuh' },
      { file: 'th', text: 'thhhh' },
    ]
  },

  // UI sounds
  ui: {
    folder: 'ui',
    items: [
      { file: 'correct', text: 'Yes!' },
      { file: 'wrong', text: 'Try again!' },
      { file: 'celebration', text: 'Yay! Great job!' },
      { file: 'complete', text: 'Well done! You finished!' },
      { file: 'unlock', text: 'Level unlocked!' },
      { file: 'countdown', text: 'Three, two, one, go!' },
      { file: 'instructions', text: 'Listen carefully!' },
    ]
  },

  // Pink words (CVC)
  pinkWords: {
    folder: 'words/pink',
    items: [
      'bag', 'bat', 'bed', 'big', 'bin', 'bit', 'box', 'bud', 'bug', 'bun', 'bus',
      'can', 'cap', 'cat', 'cop', 'cot', 'cup', 'cut',
      'dad', 'den', 'dig', 'dip', 'dog', 'dot', 'dug',
      'fan', 'fat', 'fed', 'fig', 'fin', 'fit', 'fog', 'fox', 'fun',
      'get', 'got', 'gum',
      'ham', 'hat', 'hen', 'hip', 'hit', 'hog', 'hop', 'hot', 'hug', 'hut',
      'jam', 'jet', 'job', 'jog', 'jug',
      'kid', 'kit',
      'leg', 'let', 'lid', 'lip', 'lit', 'log', 'lot',
      'man', 'map', 'mat', 'men', 'met', 'mix', 'mom', 'mop', 'mud', 'mug',
      'net', 'not', 'nut',
      'pan', 'pat', 'peg', 'pen', 'pet', 'pig', 'pin', 'pit', 'pop', 'pot', 'pup', 'put',
      'ran', 'rat', 'red', 'rot', 'rug', 'run',
      'sad', 'sat', 'set', 'sit', 'six', 'sun',
      'tag', 'ten', 'tip', 'top', 'tub', 'tug',
      'van', 'web', 'wet', 'wig', 'win', 'yes', 'zip'
    ].map(word => ({ file: word, text: word }))
  },

  // Green words (digraphs, long vowels)
  greenWords: {
    folder: 'words/green',
    items: [
      'bath', 'beach', 'bee', 'boat', 'book',
      'chair', 'cheese', 'chip', 'coat',
      'day', 'eat', 'feet', 'fish', 'food',
      'goat', 'leaf', 'lunch', 'mail', 'moon',
      'rain', 'road', 'say', 'sea', 'shell', 'ship', 'shoe', 'shop',
      'snail', 'soap', 'spoon',
      'tail', 'tea', 'teeth', 'the', 'thin', 'this', 'three', 'trail', 'tray',
      'way', 'zoo'
    ].map(word => ({ file: word, text: word }))
  },

  // Blue words (blends)
  blueWords: {
    folder: 'words/blue',
    items: [
      'black', 'block', 'blue', 'bread', 'brick', 'brush',
      'clap', 'clock', 'cloud', 'crab', 'crown', 'cry',
      'dress', 'drink', 'drum',
      'flag', 'flower', 'fly', 'friend', 'frog', 'fruit',
      'glass', 'globe', 'glue', 'grapes', 'grass', 'green',
      'plant', 'plate', 'play',
      'sleep', 'slide', 'slow', 'small', 'smell', 'snake', 'snow',
      'spider', 'spill', 'spin', 'star', 'still', 'stone', 'stop', 'sweet', 'swim', 'swing',
      'train', 'tree', 'truck'
    ].map(word => ({ file: word, text: word }))
  },

  // Sight words
  sightWords: {
    folder: 'sight-words',
    items: [
      'a', 'about', 'all', 'and', 'are', 'at',
      'be', 'but', 'by', 'can', 'do', 'down',
      'each', 'for', 'from',
      'has', 'have', 'he', 'her', 'him', 'how',
      'i', 'if', 'in', 'into', 'is', 'it',
      'like', 'look',
      'make', 'many', 'me', 'more', 'my',
      'not', 'on', 'other', 'out',
      'said', 'see', 'she', 'so', 'some',
      'that', 'them', 'then', 'there', 'these', 'this', 'time', 'to', 'two',
      'up', 'very',
      'was', 'we', 'were', 'what', 'when', 'which', 'will', 'with', 'would',
      'you'
    ].map(word => ({ file: word, text: word === 'i' ? 'I' : word }))
  },

  // Additional words for sound games
  additionalWords: {
    folder: 'words/pink',
    items: [
      'sock', 'soap', 'star', 'snake', 'spoon',
      'moon', 'mouse', 'milk',
      'fork', 'frog', 'foot',
      'nose', 'nest', 'nine', 'nurse',
      'pear', 'pink',
      'tent', 'tiger', 'toy',
      'cow', 'cake', 'car',
      'horse', 'house', 'hand', 'heart',
      'ball', 'book',
      'doll', 'duck', 'door', 'dish', 'drum',
      'gift', 'girl', 'grape',
      'jar', 'jump', 'jeans', 'juice',
      'watch', 'worm', 'wolf', 'water', 'wing',
      'yak', 'yam', 'yarn', 'yell', 'yellow',
      'vest', 'vase', 'vet', 'vine', 'violin',
      'thumb', 'thick', 'think', 'throw',
      'ring', 'rabbit',
      'lamp', 'lemon',
      'zebra', 'zero', 'zigzag', 'zone',
      'sheep', 'shirt',
      'chicken', 'cherry', 'chin',
      'ant', 'apple', 'alligator', 'ax', 'add', 'arrow',
      'egg', 'elephant', 'elbow', 'envelope', 'elf', 'end',
      'igloo', 'insect', 'ink', 'itch', 'ill',
      'octopus', 'orange', 'ostrich', 'olive', 'ox',
      'umbrella', 'under', 'us', 'uncle', 'umpire',
      'bell', 'sell', 'hill', 'call', 'fall', 'bill', 'fill', 'pill', 'pull', 'bull', 'stall'
    ].map(word => ({ file: word, text: word }))
  },

  // Special handling for yo-yo
  specialWords: {
    folder: 'words/pink',
    items: [
      { file: 'yo-yo', text: 'yo-yo' }
    ]
  },

  // Sentences
  sentences: {
    folder: 'sentences',
    items: [
      { file: 'sentence-01', text: 'The cat sat.' },
      { file: 'sentence-02', text: 'The bat is big.' },
      { file: 'sentence-03', text: 'The man ran.' },
      { file: 'sentence-04', text: 'The van is red.' },
      { file: 'sentence-05', text: 'The cat is big.' },
      { file: 'sentence-06', text: 'The dog is red.' },
      { file: 'sentence-07', text: 'The hen sat down.' },
      { file: 'sentence-08', text: 'The pig is hot.' },
      { file: 'sentence-09', text: 'The fish is blue.' },
      { file: 'sentence-10', text: 'The fox is bad.' },
      { file: 'sentence-11', text: 'The cat sat on the mat.' },
      { file: 'sentence-12', text: 'The dog is in the box.' },
      { file: 'sentence-13', text: 'I can see the cat.' },
      { file: 'sentence-14', text: 'The ball is very big.' },
      { file: 'sentence-15', text: 'The cat will sit down.' },
    ]
  },

  // Instruction phrases
  instructions: {
    folder: 'instructions',
    items: [
      { file: 'i-spy-beginning', text: 'I spy with my little eye, something that begins with' },
      { file: 'i-spy-ending', text: 'I spy with my little eye, something that ends with' },
      { file: 'i-spy-middle', text: 'I spy with my little eye, something with, in the middle' },
      { file: 'listen-carefully', text: 'Listen carefully!' },
      { file: 'tap-to-hear', text: 'Tap to hear the sound again' },
      { file: 'drag-to-match', text: 'Drag the letter to match the picture' },
      { file: 'build-the-word', text: 'Build the word!' },
      { file: 'great-listening', text: 'Great listening!' },
      { file: 'try-again', text: 'Try again! Listen carefully.' },
      { file: 'almost', text: 'Almost! Listen one more time.' },
      { file: 'keep-trying', text: 'Keep trying! You can do it!' },
      { file: 'you-got-it', text: 'You got it!' },
      { file: 'excellent-ears', text: 'Excellent ears!' },
      { file: 'perfect', text: 'Perfect!' },
      { file: 'amazing', text: 'Amazing!' },
      { file: 'super-listener', text: 'Super listener!' },
      { file: 'yes-begins-with', text: 'Yes! That begins with' },
    ]
  }
};

// ============================================
// API FUNCTIONS
// ============================================

function generateAudio(text, outputPath) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: VOICE_SETTINGS
    });

    const options = {
      hostname: BASE_URL,
      port: 443,
      path: `/v1/text-to-speech/${VOICE_ID}`,
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          fs.writeFileSync(outputPath, buffer);
          resolve(outputPath);
        });
      } else {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          reject(new Error(`API Error ${res.statusCode}: ${body}`));
        });
      }
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('🐋 Whale Platform Audio Generator');
  console.log('================================\n');

  // Ensure output directories exist
  ensureDir(OUTPUT_DIR);
  
  let totalFiles = 0;
  let completedFiles = 0;
  let failedFiles = [];

  // Count total files
  for (const category of Object.values(AUDIO_DATA)) {
    totalFiles += category.items.length;
  }

  console.log(`📊 Total files to generate: ${totalFiles}\n`);

  // Process each category
  for (const [categoryName, category] of Object.entries(AUDIO_DATA)) {
    const folderPath = path.join(OUTPUT_DIR, category.folder);
    ensureDir(folderPath);

    console.log(`\n📁 Processing ${categoryName} (${category.items.length} files)...`);

    for (const item of category.items) {
      const fileName = `${item.file}.mp3`;
      const filePath = path.join(folderPath, fileName);

      // Skip if file already exists
      if (fs.existsSync(filePath)) {
        console.log(`  ⏭️  Skipping ${fileName} (already exists)`);
        completedFiles++;
        continue;
      }

      try {
        process.stdout.write(`  🎙️  Generating ${fileName}...`);
        await generateAudio(item.text, filePath);
        console.log(' ✅');
        completedFiles++;

        // Rate limiting - ElevenLabs has limits
        await sleep(500);
      } catch (error) {
        console.log(` ❌ ${error.message}`);
        failedFiles.push({ file: fileName, error: error.message });
      }
    }
  }

  // Summary
  console.log('\n================================');
  console.log('📊 GENERATION COMPLETE');
  console.log('================================');
  console.log(`✅ Completed: ${completedFiles}/${totalFiles}`);
  
  if (failedFiles.length > 0) {
    console.log(`❌ Failed: ${failedFiles.length}`);
    console.log('\nFailed files:');
    failedFiles.forEach(f => console.log(`  - ${f.file}: ${f.error}`));
  }

  console.log(`\n📁 Output directory: ${OUTPUT_DIR}`);
}

// Run
main().catch(console.error);
