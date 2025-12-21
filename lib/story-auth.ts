import { jwtVerify, SignJWT } from 'jose';

// JWT Secret - must be set in environment
const getJwtSecret = () => {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) {
    throw new Error('STORY_JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
};

export const JWT_SECRET = getJwtSecret();

// Verify JWT token
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { username: string; type?: 'user' | 'admin' };
  } catch (error) {
    return null;
  }
}

// Create JWT token
export async function createToken(payload: { username: string; type?: 'user' | 'admin' }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

// Get current week's Monday date string
export function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

// Get expiration date (7 days from now)
export function getExpirationDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
}

// Extract token from Authorization header
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.replace('Bearer ', '');
}
