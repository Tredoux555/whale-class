// scripts/test-teacher-login.ts
// Script to test teacher login and create session

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  try {
    console.log('Testing teacher login...\n');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'teacher@test.whale',
      password: 'test123456',
    });

    if (error) {
      console.error('Login failed:', error.message);
      process.exit(1);
    }

    if (!data.session) {
      console.error('No session created');
      process.exit(1);
    }

    console.log('✅ Login successful!');
    console.log(`\nSession Token (first 50 chars): ${data.session.access_token.substring(0, 50)}...`);
    console.log(`\nUser ID: ${data.user.id}`);
    console.log(`Email: ${data.user.email}`);
    console.log(`\nYou can now use this session in your browser.`);
    console.log(`\nTo test in browser:`);
    console.log(`1. Open browser console`);
    const urlParts = supabaseUrl ? supabaseUrl.split('//')[1]?.split('.') || [] : [];
    const projectId = urlParts[0] || 'default';
    console.log(`2. Run: localStorage.setItem('sb-${projectId}-auth-token', JSON.stringify(${JSON.stringify(data.session)}))`);
    console.log(`3. Refresh the page`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLogin();

