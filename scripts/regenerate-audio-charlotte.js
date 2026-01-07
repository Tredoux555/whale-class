#!/usr/bin/env node
/**
 * WHALE AUDIO REGENERATION - Charlotte High Stability
 * 
 * This script regenerates all word audio using:
 * - Voice: Charlotte (XB0fDUnXU5powFXDhCwa) - British, clear
 * - Stability: 0.9 (high - cleaner, more consistent)
 * - Similarity Boost: 0.75
 * - Style: 0.0 (neutral)
 * 
 * Run: node scripts/regenerate-audio-charlotte.js
 */

const fs = require('fs');
const path = require('path');

const API_KEY = 'sk_4758ce62e8712bfcf8016cedd9c92077e2be46f5d1108cb4';
const CHARLOTTE_VOICE_ID = 'XB0fDUnXU5powFXDhCwa';

const VOICE_SETTINGS = {
  stability: 0.9,           // HIGH - cleaner pronunciation
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: false
};

// All CVC words organized by level
const WORDS = {
  pink: [
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
  ],
  blue: [
    'bath', 'beach', 'bee', 'boat', 'book', 'chair', 'cheese', 'chip', 'coat', 'day',
    'eat', 'feet', 'fish', 'food', 'goat', 'leaf', 'lunch', 'mail', 'moon', 'rain',
    'road', 'say', 'sea', 'shell', 'ship', 'shoe', 'shop', 'snail', 'soap', 'spoon',
    'tail', 'tea', 'teeth', 'the', 'thin', 'this', 'three', 'trail', 'tray', 'way', 'zoo'
  ],
  green: [
    'black', 'block', 'blue', 'bread', 'brick', 'brush', 'clap', 'clock', 'cloud', 'crab',
    'crown', 'cry', 'dress', 'drink', 'drum', 'flag', 'flower', 'fly', 'friend', 'frog',
    'fruit', 'glass', 'globe', 'glue', 'grapes', 'grass', 'green', 'plant', 'plate', 'play',
    'sleep', 'slide', 'slow', 'small', 'smell', 'snake', 'snow', 'spider', 'spill', 'spin',
    'star', 'still', 'stone', 'stop', 'sweet', 'swim', 'swing', 'train', 'tree', 'truck'
  ]
};

// Rate limiting - ElevenLabs allows ~10 requests/second
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateAudio(text, outputPath) {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${CHARLOTTE_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: VOICE_SETTINGS,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed: ${text} - ${response.status}: ${error}`);
      return false;
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    return true;
  } catch (err) {
    console.error(`❌ Error: ${text} - ${err.message}`);
    return false;
  }
}

async function regenerateAll() {
  console.log('🎙️ WHALE AUDIO REGENERATION');
  console.log('============================');
  console.log('Voice: Charlotte (High Stability 0.9)');
  console.log('');

  const baseDir = path.join(__dirname, '../public/audio-new/words');
  let totalWords = 0;
  let successCount = 0;
  let failCount = 0;

  for (const [level, words] of Object.entries(WORDS)) {
    const levelDir = path.join(baseDir, level);
    
    // Ensure directory exists
    if (!fs.existsSync(levelDir)) {
      fs.mkdirSync(levelDir, { recursive: true });
    }

    console.log(`\n📁 ${level.toUpperCase()} LEVEL (${words.length} words)`);
    console.log('-'.repeat(40));

    for (const word of words) {
      totalWords++;
      const outputPath = path.join(levelDir, `${word}.mp3`);
      
      process.stdout.write(`  ${word}... `);
      
      const success = await generateAudio(word, outputPath);
      
      if (success) {
        successCount++;
        console.log('✅');
      } else {
        failCount++;
      }
      
      // Rate limit: wait 150ms between requests
      await delay(150);
    }
  }

  console.log('\n============================');
  console.log('📊 SUMMARY');
  console.log(`   Total: ${totalWords}`);
  console.log(`   Success: ${successCount} ✅`);
  console.log(`   Failed: ${failCount} ❌`);
  console.log('============================\n');

  if (failCount === 0) {
    console.log('🎉 All audio regenerated successfully with Charlotte High Stability!');
  } else {
    console.log('⚠️  Some files failed. Check the errors above.');
  }
}

// Run it
regenerateAll().catch(console.error);
