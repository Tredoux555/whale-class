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

export function decryptMessage(encrypted: string): string {
  try {
    // Handle non-encrypted messages
    if (!encrypted.includes(':')) {
      return encrypted;
    }

    // Phase 9: Detect format — GCM (gcm:iv:tag:data) vs legacy CBC (iv:data)
    if (encrypted.startsWith('gcm:')) {
      const parts = encrypted.split(':');
      // parts[0] = 'gcm', parts[1] = iv, parts[2] = authTag, parts[3] = ciphertext
      if (parts.length !== 4) return encrypted;
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
      return encrypted;
    }

    const iv = Buffer.from(ivHex, 'hex');
    const key = getKey();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[MessageEncryption] Decryption error:', error);
    // Return original if decryption fails
    return encrypted;
  }
}
