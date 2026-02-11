#!/usr/bin/env npx tsx
// scripts/rotate-encryption-key.ts
// Re-encrypt all Story messages from old key to new key
// Table: story_message_history, column: message_content (~1605 rows)
// Handles both CBC (iv:encrypted) and GCM (gcm:iv:authTag:encrypted) formats
//
// Usage:
//   OLD_ENCRYPTION_KEY=change-this-to-32-char-key-12345 \
//   NEW_ENCRYPTION_KEY=<your-new-32-char-key> \
//   npx tsx scripts/rotate-encryption-key.ts [--dry-run]
//
// Steps:
// 1. Set NEW_ENCRYPTION_KEY in Railway FIRST (keep old one as OLD_ENCRYPTION_KEY)
// 2. Run this script with --dry-run to verify
// 3. Run without --dry-run to execute
// 4. Remove OLD_ENCRYPTION_KEY from Railway
// 5. Update MESSAGE_ENCRYPTION_KEY in Railway to the new key

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');

// Keys
const OLD_KEY_STR = process.env.OLD_ENCRYPTION_KEY;
const NEW_KEY_STR = process.env.NEW_ENCRYPTION_KEY;

if (!OLD_KEY_STR || OLD_KEY_STR.length !== 32) {
  console.error('ERROR: OLD_ENCRYPTION_KEY must be exactly 32 characters');
  process.exit(1);
}
if (!NEW_KEY_STR || NEW_KEY_STR.length !== 32) {
  console.error('ERROR: NEW_ENCRYPTION_KEY must be exactly 32 characters');
  process.exit(1);
}

const OLD_KEY = Buffer.from(OLD_KEY_STR, 'utf8');
const NEW_KEY = Buffer.from(NEW_KEY_STR, 'utf8');

// Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Old format: CBC (iv:encrypted) ---
function decryptCBC(encrypted: string): string | null {
  try {
    if (!encrypted.includes(':')) return null;
    const parts = encrypted.split(':');
    if (parts.length !== 2) return null;

    const [ivHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', OLD_KEY, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

// --- Old format: GCM with OLD key (gcm:iv:authTag:encrypted) ---
function decryptGCM(encrypted: string): string | null {
  try {
    const parts = encrypted.split(':');
    if (parts.length !== 4 || parts[0] !== 'gcm') return null;

    const [, ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', OLD_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

// --- New format: GCM with NEW key (gcm:iv:authTag:encrypted) ---
function encryptGCM(plaintext: string): string {
  const iv = crypto.randomBytes(12); // GCM uses 12-byte IV
  const cipher = crypto.createCipheriv('aes-256-gcm', NEW_KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  // Prefix with 'gcm:' so we can detect the format
  return `gcm:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function main() {
  console.log(`=== Message Encryption Key Rotation ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`);
  console.log(`Old key: ${OLD_KEY_STR.substring(0, 4)}...${OLD_KEY_STR.substring(OLD_KEY_STR.length - 4)}`);
  console.log(`New key: ${NEW_KEY_STR.substring(0, 4)}...${NEW_KEY_STR.substring(NEW_KEY_STR.length - 4)}`);
  console.log('');

  // Fetch all messages with encrypted content
  // Table: story_message_history, column: message_content (1600+ rows)
  // Supabase has a default 1000-row limit — paginate to get ALL rows
  const PAGE_SIZE = 1000;
  let allMessages: { id: string; message_content: string }[] = [];
  let offset = 0;

  while (true) {
    const { data: page, error } = await supabase
      .from('story_message_history')
      .select('id, message_content')
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('ERROR: Failed to fetch messages:', error.message);
      process.exit(1);
    }

    if (!page || page.length === 0) break;
    allMessages = allMessages.concat(page);
    if (page.length < PAGE_SIZE) break; // Last page
    offset += PAGE_SIZE;
  }

  const messages = allMessages;

  if (messages.length === 0) {
    console.log('No messages found. Nothing to migrate.');
    process.exit(0);
  }

  console.log(`Found ${messages.length} messages to check (fetched in ${Math.ceil(messages.length / PAGE_SIZE)} pages).`);

  let migrated = 0;
  let skippedPlaintext = 0;
  let skippedAlreadyGCM = 0;
  let failed = 0;

  for (const msg of messages) {
    const content = msg.message_content;

    // Skip null/empty
    if (!content) {
      skippedPlaintext++;
      continue;
    }

    // Not encrypted (no colon = plaintext)
    if (!content.includes(':')) {
      skippedPlaintext++;
      continue;
    }

    let decrypted: string | null = null;

    // Try GCM decrypt with OLD key first (messages encrypted after Phase 9 upgrade)
    if (content.startsWith('gcm:')) {
      decrypted = decryptGCM(content);
      if (decrypted === null) {
        // Already encrypted with NEW key — skip
        skippedAlreadyGCM++;
        continue;
      }
    } else {
      // Try CBC decrypt (messages encrypted before Phase 9)
      decrypted = decryptCBC(content);
      if (decrypted === null) {
        skippedPlaintext++; // Not valid CBC — likely plaintext with colons
        continue;
      }
    }

    // Re-encrypt with GCM
    const newContent = encryptGCM(decrypted);

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would re-encrypt message ${msg.id}`);
      migrated++;
    } else {
      const { error: updateError } = await supabase
        .from('story_message_history')
        .update({ message_content: newContent })
        .eq('id', msg.id);

      if (updateError) {
        console.error(`  FAILED to update message ${msg.id}:`, updateError.message);
        failed++;
      } else {
        migrated++;
      }
    }
  }

  console.log('');
  console.log(`=== Results ===`);
  console.log(`  Total messages: ${messages.length}`);
  console.log(`  Migrated (CBC → GCM): ${migrated}`);
  console.log(`  Skipped (plaintext): ${skippedPlaintext}`);
  console.log(`  Skipped (already GCM): ${skippedAlreadyGCM}`);
  console.log(`  Failed: ${failed}`);

  if (DRY_RUN) {
    console.log('');
    console.log('This was a dry run. Run without --dry-run to execute.');
  } else if (failed > 0) {
    console.log('');
    console.log('WARNING: Some messages failed to migrate. Check errors above.');
    process.exit(1);
  } else {
    console.log('');
    console.log('SUCCESS: All messages migrated. Now update MESSAGE_ENCRYPTION_KEY in Railway.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
