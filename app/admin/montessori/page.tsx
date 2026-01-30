// app/admin/montessori/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Child } from "@/types/database";

export default function MontessoriDashboard() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchChildren();
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

  const fetchChildren = async () => {
    try {
      const response = await fetch("/api/whale/children?active=true");
      if (response.ok) {
        const data = await response.json();
        setChildren(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0]"
      
    >
      {/* Header */}
      <header className="bg-[#4A90E2] text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">📊</div>
              <div>
                <h1 className="text-2xl font-bold">Montessori Tracking</h1>
                <p className="text-sm opacity-90">Progress & Activities</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin"
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Back to Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="mb-6 flex flex-wrap gap-4">
          <Link
            href="/admin/montessori/children"
            className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md flex items-center gap-2"
          >
            <span className="text-xl">👶</span> Manage Children
          </Link>
          <Link
            href="/admin/montessori/activities"
            className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-teal-600 transition-all shadow-md flex items-center gap-2"
          >
            <span className="text-xl">📚</span> Activities Library
          </Link>
          <Link
            href="/admin/montessori/reports"
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-md flex items-center gap-2"
          >
            <span className="text-xl">📈</span> Reports
          </Link>
        </div>

        {/* Children Overview */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-[#2C5F7C] mb-4">Active Children</h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-bounce">🌳</div>
              <p className="text-[#2C5F7C] text-lg">Loading...</p>
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👶</div>
              <p className="text-[#2C5F7C] text-lg font-semibold">No children yet!</p>
              <p className="text-[#2C5F7C]/70 mt-2">Add children to start tracking their progress.</p>
              <Link
                href="/admin/montessori/children"
                className="inline-block mt-4 px-6 py-3 bg-[#4A90E2] text-white rounded-lg font-semibold hover:bg-[#2C5F7C] transition-colors"
              >
                Add First Child
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((child) => (
                <Link
                  key={child.id}
                  href={`/admin/montessori/children/${child.id}`}
                  className="block bg-gradient-to-br from-[#E8F4F8] to-[#B8E0F0] rounded-xl p-4 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {child.photo_url ? (
                      <img
                        src={child.photo_url}
                        alt={child.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#4A90E2] flex items-center justify-center text-white text-2xl font-bold border-2 border-white">
                        {child.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-[#2C5F7C] text-lg">{child.name}</h3>
                      <p className="text-sm text-[#2C5F7C]/70">Age Group: {child.age_group}</p>
                    </div>
                  </div>
                  <div className="text-sm text-[#2C5F7C]/70">
                    Enrolled: {new Date(child.enrollment_date).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
