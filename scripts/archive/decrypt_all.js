const crypto = require('crypto');
const fs = require('fs');

// Load env
const env = fs.readFileSync('/sessions/dreamy-epic-feynman/mnt/whale/.env.local', 'utf8');
const vars = {};
env.split('\n').forEach(function(l) {
  const eq = l.indexOf('=');
  if (eq > 0) vars[l.slice(0, eq).trim()] = l.slice(eq + 1).trim();
});

const currentKey = Buffer.from(vars.MESSAGE_ENCRYPTION_KEY, 'utf8');
const oldKey = Buffer.from('change-this-to-32-char-key-12345', 'utf8');

function decryptWithKey(encrypted, key) {
  if (!encrypted || !encrypted.includes(':')) return encrypted || '';
  try {
    if (encrypted.startsWith('gcm:')) {
      const parts = encrypted.split(':');
      if (parts.length !== 4) return null;
      const iv = Buffer.from(parts[1], 'hex');
      const authTag = Buffer.from(parts[2], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      let d = decipher.update(parts[3], 'hex', 'utf8');
      d += decipher.final('utf8');
      return d;
    }
    const colonIdx = encrypted.indexOf(':');
    const ivHex = encrypted.slice(0, colonIdx);
    const encHex = encrypted.slice(colonIdx + 1);
    if (!ivHex || !encHex) return null;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let d = decipher.update(encHex, 'hex', 'utf8');
    d += decipher.final('utf8');
    return d;
  } catch(e) { return null; }
}

const {createClient} = require('@supabase/supabase-js');
const sb = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  let all = [];
  let from = 0;
  const batch = 1000;
  while(true) {
    const {data, error} = await sb.from('story_message_history')
      .select('id, week_start_date, message_type, message_content, author, created_at')
      .order('created_at', {ascending: true})
      .range(from, from + batch - 1);
    if (error) { console.error(error); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    from += batch;
    if (data.length < batch) break;
  }

  console.log('Total fetched:', all.length);

  let currentKeySuccess = 0, oldKeySuccess = 0, plaintext = 0, failed = 0, media = 0;

  const msgs = all.map(function(m) {
    if (m.message_type !== 'text' || !m.message_content) {
      media++;
      return { id: m.id, date: m.created_at, author: m.author, type: m.message_type, content: '[' + m.message_type + ']' };
    }

    // Try current key first
    let content = decryptWithKey(m.message_content, currentKey);
    if (content !== null) {
      currentKeySuccess++;
      return { id: m.id, date: m.created_at, author: m.author, type: 'text', content: content };
    }

    // Try old key
    content = decryptWithKey(m.message_content, oldKey);
    if (content !== null) {
      oldKeySuccess++;
      return { id: m.id, date: m.created_at, author: m.author, type: 'text', content: content };
    }

    failed++;
    return { id: m.id, date: m.created_at, author: m.author, type: 'text', content: m.message_content };
  });

  console.log('Current key decrypted:', currentKeySuccess);
  console.log('Old key decrypted:', oldKeySuccess);
  console.log('Plaintext/no encryption:', plaintext);
  console.log('Media:', media);
  console.log('Failed to decrypt:', failed);

  // Write all messages
  const readable = msgs.filter(function(m) {
    return m.content && !m.content.startsWith('gcm:') && !m.content.startsWith('[') && m.content.length > 1;
  });

  console.log('Total readable:', readable.length);

  const output = readable.map(function(m) {
    const d = new Date(m.date);
    const dateStr = d.toISOString().slice(0, 10) + ' ' + d.toISOString().slice(11, 16);
    return dateStr + ' | ' + m.author + ': ' + m.content;
  }).join('\n---\n');

  fs.writeFileSync('/tmp/all_messages.txt', output);
  console.log('File size:', (Buffer.byteLength(output) / 1024).toFixed(0), 'KB');
}
run();
