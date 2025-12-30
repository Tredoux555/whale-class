import crypto from 'crypto';

function getKey(): Buffer {
  const key = process.env.MESSAGE_ENCRYPTION_KEY || 'change-this-to-32-char-key-12345';
  if (key.length !== 32) {
    console.warn(`MESSAGE_ENCRYPTION_KEY should be 32 chars, using default`);
    return Buffer.from('change-this-to-32-char-key-12345', 'utf8');
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
