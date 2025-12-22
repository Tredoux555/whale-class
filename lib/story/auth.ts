import { SignJWT, jwtVerify } from 'jose';
import { compare, hash } from 'bcryptjs';
import { JWTPayload } from './types';

// Get JWT secret as Uint8Array for jose
function getJWTSecret(isAdmin = false): Uint8Array {
  const secret = isAdmin 
    ? (process.env.STORY_ADMIN_JWT_SECRET || process.env.STORY_JWT_SECRET)
    : process.env.STORY_JWT_SECRET;
    
  if (!secret) {
    throw new Error('STORY_JWT_SECRET environment variable is not set');
  }
  
  return new TextEncoder().encode(secret);
}

/**
 * Create a JWT token for user authentication
 */
export async function createUserToken(username: string): Promise<string> {
  const secret = getJWTSecret(false);
  
  return new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

/**
 * Create a JWT token for admin authentication
 */
export async function createAdminToken(username: string): Promise<string> {
  const secret = getJWTSecret(true);
  
  return new SignJWT({ username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

/**
 * Verify a user JWT token
 */
export async function verifyUserToken(token: string): Promise<JWTPayload> {
  const secret = getJWTSecret(false);
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JWTPayload;
}

/**
 * Verify an admin JWT token
 */
export async function verifyAdminToken(token: string): Promise<JWTPayload> {
  const secret = getJWTSecret(true);
  const { payload } = await jwtVerify(token, secret);
  
  if (payload.role !== 'admin') {
    throw new Error('Not an admin token');
  }
  
  return payload as unknown as JWTPayload;
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  return authHeader.replace('Bearer ', '');
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

/**
 * Hash a password (for creating new users)
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}
