"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SeedPage() {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState<string>("");

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

  const handleSeedCurriculum = async () => {
    if (!confirm('Seed curriculum roadmap? This will add all curriculum works to the database.')) {
      return;
    }

    setSeeding(true);
    setMessage("");
    try {
      const response = await fetch('/api/admin/seed-curriculum', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setMessage('❌ Admin access required. Please log in as admin.');
          return;
        }
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (data.success) {
        setMessage(`✅ Successfully seeded ${data.count} curriculum works!\n\nBreakdown:\n${Object.entries(data.breakdown.byStage).map(([stage, count]) => `  ${stage}: ${count} works`).join('\n')}\n\n${Object.entries(data.breakdown.byArea).map(([area, count]) => `  ${area}: ${count} works`).join('\n')}`);
      } else {
        setMessage(`❌ Seed failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessage(`❌ Seed failed: ${errorMessage}`);
      console.error('Seed error:', error);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-[#E8F4F8] to-[#B8E0F0]"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
    >
      {/* Header */}
      <header className="bg-[#4A90E2] text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🌱</div>
              <div>
                <h1 className="text-2xl font-bold">Seed Data</h1>
                <p className="text-sm opacity-90">Initialize curriculum data</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin"
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Curriculum Seeding</h2>
            <p className="text-gray-600 mb-6">
              Seed the curriculum roadmap with all Montessori works. This will populate the database with curriculum areas, categories, and works.
            </p>

            <button
              onClick={handleSeedCurriculum}
              disabled={seeding}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {seeding ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Seeding...
                </>
              ) : (
                <>
                  <span className="text-xl">🌱</span>
                  Seed Curriculum Data
                </>
              )}
            </button>

            {message && (
              <div className={`mt-6 p-4 rounded-lg whitespace-pre-line ${
                message.startsWith('✅') 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">What gets seeded?</h3>
              <ul className="space-y-2 text-gray-600">
                <li>✅ Curriculum Areas (Practical Life, Sensorial, Mathematics, Language, Cultural)</li>
                <li>✅ Curriculum Categories (by stage and area)</li>
                <li>✅ Curriculum Roadmap (all works with sequences)</li>
                <li>✅ Work definitions and descriptions</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

