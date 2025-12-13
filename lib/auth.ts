import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.ADMIN_SECRET || "whale-class-secret-change-in-production";

export interface AdminSession {
  isAdmin: boolean;
}

export function createAdminToken(): string {
  return jwt.sign({ isAdmin: true }, SECRET, { expiresIn: "30d" });
}

export function verifyAdminToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, SECRET) as AdminSession;
    return decoded.isAdmin === true;
  } catch {
    return false;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin-token")?.value;
  
  if (!token || !verifyAdminToken(token)) {
    return null;
  }
  
  return { isAdmin: true };
}

