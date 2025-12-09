// app/admin/montessori/children/[id]/page.tsx
"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ChildDashboard from "@/components/ChildDashboard";

export default function ChildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/videos");
      if (response.status === 401) {
        router.push("/admin/login");
      }
    } catch (error) {
      router.push("/admin/login");
    }
  };

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
        <ChildDashboard childId={resolvedParams.id} />
      </main>
    </div>
  );
}
