#!/usr/bin/env node
/**
 * WHALE COMPLETE AUDIO REGENERATION - Charlotte High Stability
 * 
 * Regenerates ALL audio files:
 * - Letters (phoneme sounds)
 * - Phonemes (ch, sh, th)
 * - Sight words
 * - Sentences
 * - Instructions
 * - Words (pink, blue, green levels)
 * 
 * Voice: Charlotte (XB0fDUnXU5powFXDhCwa) - British, clear
 * Stability: 0.9 (high - cleaner pronunciation)
 */

const fs = require('fs');
const path = require('path');

const API_KEY = 'sk_4758ce62e8712bfcf8016cedd9c92077e2be46f5d1108cb4';
const CHARLOTTE_VOICE_ID = 'XB0fDUnXU5powFXDhCwa';

const VOICE_SETTINGS = {
  stability: 0.9,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: false
};

const BASE_DIR = path.join(__dirname, '../public/audio-new');

// Rate limiting
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
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    return true;
  } catch (err) {
    console.error(`❌ Error: ${text} - ${err.message}`);
    return false;
  }
}

// ============================================
// AUDIO DATA
// ============================================

// Letter sounds (phonemes for each letter)
const LETTER_SOUNDS = {
  'a': 'ah',
  'b': 'buh',
  'c': 'kuh',
  'd': 'duh',
  'e': 'eh',
  'f': 'fff',
  'g': 'guh',
  'h': 'huh',
  'i': 'ih',
  'j': 'juh',
  'k': 'kuh',
  'l': 'lll',
  'm': 'mmm',
  'n': 'nnn',
  'o': 'oh',
  'p': 'puh',
  'q': 'kwuh',
  'r': 'rrr',
  's': 'sss',
  't': 'tuh',
  'u': 'uh',
  'v': 'vvv',
  'w': 'wuh',
  'x': 'ks',
  'y': 'yuh',
  'z': 'zzz'
};

// Digraph phonemes
const PHONEMES = {
  'sh': 'shhhh',
  'ch': 'chuh',
  'th': 'thhhh'
};

// Sight words
const SIGHT_WORDS = [
  'a', 'about', 'all', 'and', 'are', 'at', 'be', 'but', 'by', 'can',
  'do', 'down', 'each', 'for', 'from', 'has', 'have', 'he', 'her', 'him',
  'how', 'i', 'if', 'in', 'into', 'is', 'it', 'like', 'look', 'make',
  'many', 'me', 'more', 'my', 'not', 'on', 'other', 'out', 'said', 'see',
  'she', 'so', 'some', 'that', 'them', 'then', 'there', 'these', 'this', 'time',
  'to', 'two', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'which',
  'will', 'with', 'would', 'you'
];

// Sentences
const SENTENCES = [
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
  { file: 'sentence-15', text: 'The cat will sit down.' }
];

// Instructions
const INSTRUCTIONS = [
  { file: 'i-spy-beginning', text: 'I spy with my little eye, something that begins with' },
  { file: 'i-spy-ending', text: 'I spy with my little eye, something that ends with' },
  { file: 'i-spy-middle', text: 'Listen carefully!' },
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
  { file: 'yes-begins-with', text: 'Yes!' }
];

// Words by level
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

// ============================================
// REGENERATION FUNCTIONS
// ============================================

async function regenerateLetters() {
  console.log('\n📁 LETTERS (26 phoneme sounds)');
  console.log('-'.repeat(40));
  
  let success = 0, fail = 0;
  
  for (const [letter, sound] of Object.entries(LETTER_SOUNDS)) {
    const outputPath = path.join(BASE_DIR, 'letters', `${letter}.mp3`);
    process.stdout.write(`  ${letter} (${sound})... `);
    
    if (await generateAudio(sound, outputPath)) {
      success++;
      console.log('✅');
    } else {
      fail++;
    }
    await delay(150);
  }
  
  return { success, fail };
}

async function regeneratePhonemes() {
  console.log('\n📁 PHONEMES (digraphs)');
  console.log('-'.repeat(40));
  
  let success = 0, fail = 0;
  
  for (const [phoneme, sound] of Object.entries(PHONEMES)) {
    const outputPath = path.join(BASE_DIR, 'phonemes', `${phoneme}.mp3`);
    process.stdout.write(`  ${phoneme} (${sound})... `);
    
    if (await generateAudio(sound, outputPath)) {
      success++;
      console.log('✅');
    } else {
      fail++;
    }
    await delay(150);
  }
  
  return { success, fail };
}

async function regenerateSightWords() {
  console.log('\n📁 SIGHT WORDS (' + SIGHT_WORDS.length + ' words)');
  console.log('-'.repeat(40));
  
  let success = 0, fail = 0;
  
  for (const word of SIGHT_WORDS) {
    const outputPath = path.join(BASE_DIR, 'sight-words', `${word}.mp3`);
    process.stdout.write(`  ${word}... `);
    
    if (await generateAudio(word, outputPath)) {
      success++;
      console.log('✅');
    } else {
      fail++;
    }
    await delay(150);
  }
  
  return { success, fail };
}

async function regenerateSentences() {
  console.log('\n📁 SENTENCES (' + SENTENCES.length + ' sentences)');
  console.log('-'.repeat(40));
  
  let success = 0, fail = 0;
  
  for (const sentence of SENTENCES) {
    const outputPath = path.join(BASE_DIR, 'sentences', `${sentence.file}.mp3`);
    process.stdout.write(`  ${sentence.file}... `);
    
    if (await generateAudio(sentence.text, outputPath)) {
      success++;
      console.log('✅');
    } else {
      fail++;
    }
    await delay(150);
  }
  
  return { success, fail };
}

async function regenerateInstructions() {
  console.log('\n📁 INSTRUCTIONS (' + INSTRUCTIONS.length + ' phrases)');
  console.log('-'.repeat(40));
  
  let success = 0, fail = 0;
  
  for (const instruction of INSTRUCTIONS) {
    const outputPath = path.join(BASE_DIR, 'instructions', `${instruction.file}.mp3`);
    process.stdout.write(`  ${instruction.file}... `);
    
    if (await generateAudio(instruction.text, outputPath)) {
      success++;
      console.log('✅');
    } else {
      fail++;
    }
    await delay(150);
  }
  
  return { success, fail };
}

async function regenerateWords() {
  let totalSuccess = 0, totalFail = 0;
  
  for (const [level, words] of Object.entries(WORDS)) {
    console.log(`\n📁 WORDS - ${level.toUpperCase()} (${words.length} words)`);
    console.log('-'.repeat(40));
    
    for (const word of words) {
      const outputPath = path.join(BASE_DIR, 'words', level, `${word}.mp3`);
      process.stdout.write(`  ${word}... `);
      
      if (await generateAudio(word, outputPath)) {
        totalSuccess++;
        console.log('✅');
      } else {
        totalFail++;
      }
      await delay(150);
    }
  }
  
  return { success: totalSuccess, fail: totalFail };
}

// ============================================
// MAIN
// ============================================

async function regenerateAll() {
  console.log('🎙️ WHALE COMPLETE AUDIO REGENERATION');
  console.log('=====================================');
  console.log('Voice: Charlotte (High Stability 0.9)');
  console.log('');
  
  const results = {
    letters: await regenerateLetters(),
    phonemes: await regeneratePhonemes(),
    sightWords: await regenerateSightWords(),
    sentences: await regenerateSentences(),
    instructions: await regenerateInstructions(),
    words: await regenerateWords()
  };
  
  // Summary
  console.log('\n=====================================');
  console.log('📊 SUMMARY');
  console.log('=====================================');
  
  let totalSuccess = 0, totalFail = 0;
  
  for (const [category, { success, fail }] of Object.entries(results)) {
    console.log(`  ${category}: ${success} ✅ / ${fail} ❌`);
    totalSuccess += success;
    totalFail += fail;
  }
  
  console.log('-------------------------------------');
  console.log(`  TOTAL: ${totalSuccess} ✅ / ${totalFail} ❌`);
  console.log('=====================================\n');
  
  if (totalFail === 0) {
    console.log('🎉 All audio regenerated successfully with Charlotte High Stability!');
  } else {
    console.log('⚠️  Some files failed. Check the errors above.');
  }
}

regenerateAll().catch(console.error);
