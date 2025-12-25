import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || 'change-this-to-32-char-key-12345';

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error(`MESSAGE_ENCRYPTION_KEY must be exactly 32 characters, got ${ENCRYPTION_KEY.length}. Current key: "${ENCRYPTION_KEY}"`);
}

export function encryptMessage(message: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY, 'utf8');
    
    if (key.length !== 32) {
      throw new Error(`Encryption key must be 32 bytes, got ${key.length}`);
    }
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const combined = iv.toString('hex') + ':' + encrypted;
    return combined;
  } catch (error) {
    console.error('[MessageEncryption] Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

export function decryptMessage(encrypted: string): string {
  try {
    const [ivHex, encryptedHex] = encrypted.split(':');
    
    if (!ivHex || !encryptedHex) {
      throw new Error('Invalid encrypted format');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY, 'utf8');
    
    if (key.length !== 32) {
      throw new Error(`Decryption key must be 32 bytes, got ${key.length}`);
    }
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[MessageEncryption] Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
}
