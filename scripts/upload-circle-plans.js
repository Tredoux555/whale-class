#!/usr/bin/env node

/**
 * Script to upload circle-plans.json to Supabase Storage
 * Run this once to initialize the data in Supabase Storage
 * 
 * Usage: node scripts/upload-circle-plans.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if it exists
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = 'videos';
const CIRCLE_PLANS_FILE = 'data/circle-plans.json';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables.');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function uploadCirclePlans() {
  try {
    // Read the JSON file
    const filePath = path.join(__dirname, '..', 'data', 'circle-plans.json');
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent); // Validate JSON
    
    console.log(`📄 Read circle-plans.json (${fileContent.length} bytes)`);
    console.log(`📊 Contains ${jsonData.themes?.length || 0} themes`);

    // Upload to Supabase Storage
    console.log(`📤 Uploading to Supabase Storage: ${STORAGE_BUCKET}/${CIRCLE_PLANS_FILE}...`);
    
    const blob = new Blob([fileContent], { type: 'application/json' });
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(CIRCLE_PLANS_FILE, blob, {
        upsert: true,
        contentType: 'application/json',
      });

    if (error) {
      console.error('❌ Upload error:', error);
      process.exit(1);
    }

    console.log('✅ Successfully uploaded circle-plans.json to Supabase Storage!');
    console.log(`📍 Path: ${STORAGE_BUCKET}/${CIRCLE_PLANS_FILE}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

uploadCirclePlans();

