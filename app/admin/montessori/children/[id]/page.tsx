// app/admin/montessori/children/[id]/page.tsx
"use client";

import { use } from "react";
import Link from "next/link";
import EnhancedChildDashboard from "@/components/EnhancedChildDashboard";

// 🚨 SESSION 113 V2: removed dead checkAuth() useEffect — /api/videos doesn't
//    exist. Middleware enforces admin JWT on /admin/*.

export default function ChildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0]">
      {/* Header */}
      <header className="bg-[#4A90E2] text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">👶</div>
              <div>
                <h1 className="text-2xl font-bold">Child Profile</h1>
                <p className="text-sm opacity-90">Progress & Activities</p>
              </div>
            </div>
            <Link
              href="/admin/montessori/children"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Back to Children
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {resolvedParams.id ? (
          <EnhancedChildDashboard key={resolvedParams.id} childId={resolvedParams.id} />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading child ID...</p>
          </div>
        )}
      </main>
    </div>
  );
}
