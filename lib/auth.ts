import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// Lazy secret — evaluated on first use, not at module import time
// This prevents build failures when env vars aren't available (e.g. Railway build step)
let _secretKey: Uint8Array | null = null;
function getSecretKey(): Uint8Array {
  if (!_secretKey) {
    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
      throw new Error("ADMIN_SECRET environment variable is required");
    }
    _secretKey = new TextEncoder().encode(secret);
  }
  return _secretKey;
}

export interface AdminSession {
  isAdmin: boolean;
}

export async function createAdminToken(): Promise<string> {
  try {
    const token = await new SignJWT({ isAdmin: true })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(getSecretKey());
    return token;
  } catch (error) {
    console.error('Error creating admin token:', error);
    throw error;
  }
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload.isAdmin === true;
  } catch {
    return false;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin-token")?.value;
  
  if (!token || !(await verifyAdminToken(token))) {
    return null;
  }
  
  return { isAdmin: true };
}

