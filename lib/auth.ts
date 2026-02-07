import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SECRET = process.env.ADMIN_SECRET;
if (!SECRET) {
  throw new Error("ADMIN_SECRET environment variable is required");
}
const SECRET_KEY = new TextEncoder().encode(SECRET);

export interface AdminSession {
  isAdmin: boolean;
}

export async function createAdminToken(): Promise<string> {
  try {
    const token = await new SignJWT({ isAdmin: true })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(SECRET_KEY);
    return token;
  } catch (error) {
    console.error('Error creating admin token:', error);
    throw error;
  }
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
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

