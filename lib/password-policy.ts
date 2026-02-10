// lib/password-policy.ts
// Password policy for USER-CHOSEN passwords (8+ chars, uppercase, lowercase, digit)
// NOT APPLIED TO: Login codes, join codes, access codes (6-char system-generated)

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

// Top 100 most common passwords (lowercase for comparison)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
  'qazwsx', 'michael', 'football', 'password1', 'password123', 'batman',
  'login', 'admin', 'welcome', 'princess', 'starwars', 'hello', 'charlie',
  'donald', 'loveme', 'zaq1zaq1', 'monkey123', 'access', 'whatever',
  '1234', '12345', '123456789', '1234567890', '0987654321', 'abcdef',
  'abcdefg', 'abcdefgh', 'qwerty123', 'test', 'testing', 'password2',
  'changeme', 'computer', 'internet', 'jessica', 'letmein1', 'soccer',
  '1q2w3e4r', '1qaz2wsx', 'mustang', 'jennifer', 'harley', 'pepper',
  'ginger', 'killer', 'ranger', 'thomas', 'robert', 'jordan', 'hunter',
  'buster', 'soccer1', 'george', 'andrew', 'charlie1', 'daniel', 'hannah',
  'joshua', 'matthew', 'nicole', 'austin', 'william', 'samantha', 'elizabeth',
  'summer', 'flower', 'freedom', 'thunder', 'maggie', 'chicken', 'hockey',
  'cookie', 'diamond', 'forever', 'nothing', 'orange', 'banana', 'purple',
  'secret', 'angel', 'friends', 'butterfly', 'phoenix', 'dakota', 'matrix',
]);

/**
 * Validate a user-chosen password against the security policy.
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - Not in common passwords list
 */
export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain at least one number');
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common');
  }

  return { valid: errors.length === 0, errors };
}
