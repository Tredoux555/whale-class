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

export function encryptMessage(message: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const key = getKey();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
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
