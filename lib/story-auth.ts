import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.STORY_JWT_SECRET || 'change-this-secret-in-production'
);

// Helper function to verify JWT tokens
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

export { JWT_SECRET };

