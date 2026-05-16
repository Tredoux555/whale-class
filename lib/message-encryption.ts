import crypto from 'crypto';

function getKey(): Buffer {
  const key = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('[message-encryption] MESSAGE_ENCRYPTION_KEY must be set (exactly 32 characters)');
  }
  if (key.length !== 32) {
    throw new Error(`[message-encryption] MESSAGE_ENCRYPTION_KEY must be exactly 32 characters (got ${key.length})`);
  }
  return Buffer.from(key, 'utf8');
}

// Phase 9: New messages use AES-256-GCM (authenticated encryption)
// Format: gcm:<iv>:<authTag>:<encrypted>
export function encryptMessage(message: string): string {
  try {
    const iv = crypto.randomBytes(12); // GCM uses 12-byte IV
    const key = getKey();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `gcm:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[MessageEncryption] Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

// 🚨 Session 113 V2 Story audit F-3.2 — sentinel returned on decrypt failure.
// The legacy behaviour returned the original ciphertext verbatim, which the
// frontend then rendered as gibberish ('gcm:abc...:def...:0123...') in
// message bubbles. Mid-rotation of MESSAGE_ENCRYPTION_KEY would silently
// corrupt every old message. Sentinel makes the failure mode visible.
export const DECRYPT_FAILURE_SENTINEL = '[Message could not be decrypted]';

export function decryptMessage(encrypted: string): string {
  try {
    // 🚨 Session 113 V2 Story audit F-3.4 — strict prefix check. The legacy
    // "no colon → return verbatim" path created a covert plaintext channel
    // (any DB row with a colonless string would render as plaintext). All
    // legitimate messages are either GCM-prefixed or legacy-CBC (iv:data
    // format). Anything else is treated as a decrypt failure.
    if (!encrypted || typeof encrypted !== 'string') {
      return DECRYPT_FAILURE_SENTINEL;
    }
    if (!encrypted.includes(':')) {
      // No format marker → not a recognised ciphertext. Treat as failure
      // rather than silently passing through.
      console.warn('[MessageEncryption] decrypt received non-prefixed value — treating as failure');
      return DECRYPT_FAILURE_SENTINEL;
    }

    // Phase 9: Detect format — GCM (gcm:iv:tag:data) vs legacy CBC (iv:data)
    if (encrypted.startsWith('gcm:')) {
      const parts = encrypted.split(':');
      // parts[0] = 'gcm', parts[1] = iv, parts[2] = authTag, parts[3] = ciphertext
      if (parts.length !== 4) return DECRYPT_FAILURE_SENTINEL;
      const iv = Buffer.from(parts[1], 'hex');
      const authTag = Buffer.from(parts[2], 'hex');
      const ciphertext = parts[3];
      const key = getKey();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }

    // Legacy CBC format: <iv>:<encrypted>
    const [ivHex, encryptedHex] = encrypted.split(':');
    if (!ivHex || !encryptedHex) {
      return DECRYPT_FAILURE_SENTINEL;
    }

    const iv = Buffer.from(ivHex, 'hex');
    const key = getKey();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[MessageEncryption] Decryption error:', error);
    return DECRYPT_FAILURE_SENTINEL;
  }
}
