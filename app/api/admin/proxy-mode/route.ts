import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { cookies } from "next/headers";

// GET - Check current proxy mode
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ proxyEnabled: false, message: "Not logged in" });
  }

  const cookieStore = await cookies();
  const proxyMode = cookieStore.get("video-proxy-enabled")?.value === "true";
  
  return NextResponse.json({ proxyEnabled: proxyMode });
}

// POST - Toggle proxy mode (only works when admin is logged in)
export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    
    if (enabled) {
      // Set cookie to enable proxy mode (expires in 30 days, same as admin session)
      cookieStore.set("video-proxy-enabled", "true", {
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
    } else {
      // Delete cookie to disable proxy mode
      cookieStore.delete("video-proxy-enabled");
    }

    return NextResponse.json({
      success: true,
      proxyEnabled: enabled,
      message: enabled ? "Proxy mode enabled" : "Proxy mode disabled",
    });
  } catch (error) {
    console.error("Error toggling proxy mode:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to toggle proxy mode: ${errorMessage}` },
      { status: 500 }
    );
  }
}
