import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.ADMIN_SECRET || "whale-class-secret-change-in-production";

export interface AdminSession {
  isAdmin: boolean;
}

export function createAdminToken(): string {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:10',message:'createAdminToken called',data:{hasJwt:typeof jwt !== 'undefined',hasSign:typeof jwt?.sign === 'function',hasSecret:!!SECRET,secretLength:SECRET?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
  // #endregion
  try {
    const token = jwt.sign({ isAdmin: true }, SECRET, { expiresIn: "30d" });
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:16',message:'Token signed successfully',data:{tokenCreated:!!token,tokenType:typeof token},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    return token;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:21',message:'Error signing token',data:{errorMessage:error instanceof Error ? error.message : String(error),errorName:error instanceof Error ? error.name : 'Unknown'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    throw error;
  }
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

