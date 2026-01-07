#!/usr/bin/env node
/**
 * ElevenLabs Audio Regenerator
 * Regenerates word audio with cleaner settings
 * 
 * Usage: node regenerate-audio.js
 */

const fs = require('fs');
const path = require('path');

const API_KEY = 'sk_4758ce62e8712bfcf8016cedd9c92077e2be46f5d1108cb4';

// Voice options - Rachel is good but let's try cleaner settings
// Or try "Sarah" (21m00Tcm4TlvDq8ikWAM is Rachel)
const VOICES = {
  rachel: '21m00Tcm4TlvDq8ikWAM',
  sarah: 'EXAVITQu4vr4xnSDxMaL',  // Clear female
  charlotte: 'XB0fDUnXU5powFXDhCwa', // British female - very clear
};

// Use Charlotte for cleaner pronunciation
const VOICE_ID = VOICES.charlotte;

// Higher stability = more consistent, cleaner output
const VOICE_SETTINGS = {
  stability: 0.85,        // Higher = more consistent (was 0.5)
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true
};

const OUTPUT_DIR = path.join(__dirname, '../public/audio-new');

// Words to regenerate - start with the problematic ones
const WORDS_TO_FIX = [
  // CVC words that might have artifacts
  'bat', 'cat', 'hat', 'mat', 'rat', 'sat',
  'bed', 'red', 'fed', 'led',
  'big', 'dig', 'fig', 'pig', 'wig',
  'dog', 'fog', 'hog', 'log',
  'bug', 'mug', 'rug', 'tug',
  'cup', 'pup', 'cut', 'hut',
  'can', 'fan', 'man', 'pan', 'ran', 'van',
  'hen', 'pen', 'ten', 'den',
  'bin', 'fin', 'pin', 'win',
  'pot', 'hot', 'dot', 'cot', 'got', 'not',
  'sun', 'fun', 'run', 'bun', 'gun',
];

async function generateAudio(text, outputPath) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  
  try {
    const response = await fetch(url, {
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
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log(`✅ ${text} -> ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`❌ ${text}: ${error.message}`);
    return false;
  }
}

async function regenerateWords() {
  console.log('🔊 ElevenLabs Audio Regenerator');
  console.log(`Voice: Charlotte (cleaner for short words)`);
  console.log(`Stability: ${VOICE_SETTINGS.stability} (higher = cleaner)`);
  console.log(`Words to regenerate: ${WORDS_TO_FIX.length}\n`);

  const pinkDir = path.join(OUTPUT_DIR, 'words/pink');
  
  // Ensure directory exists
  if (!fs.existsSync(pinkDir)) {
    fs.mkdirSync(pinkDir, { recursive: true });
  }

  let success = 0;
  let failed = 0;

  for (const word of WORDS_TO_FIX) {
    const outputPath = path.join(pinkDir, `${word}.mp3`);
    
    // Add slight pause after word to prevent cutoff
    const textToSpeak = word;
    
    const result = await generateAudio(textToSpeak, outputPath);
    if (result) success++;
    else failed++;
    
    // Rate limit: ~3 requests per second max
    await new Promise(r => setTimeout(r, 350));
  }

  console.log(`\n✅ Done! ${success} succeeded, ${failed} failed`);
}

// Run
regenerateWords().catch(console.error);
