'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Users, Loader2, TreePine } from 'lucide-react';

interface Family {
  id: string;
  name: string;
  email: string;
  children: { id: string; name: string; color: string }[];
}

export default function MontreeHomeLanding() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [families, setFamilies] = useState<Family[]>([]);
  const [error, setError] = useState('');
  const [showFamilies, setShowFamilies] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/montree-home/families?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (data.families && data.families.length > 0) {
        setFamilies(data.families);
        setShowFamilies(true);
      } else {
        setError('No family found with this email. Please contact your administrator.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectFamily = (familyId: string) => {
    localStorage.setItem('montree_family_id', familyId);
    router.push(`/parent/home/${familyId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <TreePine className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Montree Home</h1>
            <p className="text-sm text-gray-500">Montessori at Home</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-12">
        {!showFamilies ? (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Home</h2>
              <p className="text-gray-600">
                Enter your email to access your family&apos;s Montessori journey
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Finding your family...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5" />
                    Continue
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t text-center">
              <p className="text-sm text-gray-500">
                New to Montree Home?{' '}
                <a href="mailto:support@teacherpotato.xyz" className="text-green-600 hover:underline">
                  Contact us to get started
                </a>
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Select Your Family</h2>
              <p className="text-gray-600 text-sm">Choose which family to view</p>
            </div>

            <div className="space-y-3">
              {families.map((family) => (
                <button
                  key={family.id}
                  onClick={() => selectFamily(family.id)}
                  className="w-full p-4 bg-gray-50 hover:bg-green-50 rounded-xl text-left transition-colors border-2 border-transparent hover:border-green-500"
                >
                  <div className="font-medium text-gray-900">{family.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {family.children?.length || 0} children
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowFamilies(false);
                setFamilies([]);
                setEmail('');
              }}
              className="w-full mt-4 text-gray-500 text-sm hover:text-gray-700"
            >
              Use a different email
            </button>
          </div>
        )}
      </main>

      {/* Features Section */}
      {!showFamilies && (
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              emoji="🌱"
              title="Daily Activities"
              description="Curated Montessori activities based on your child's progress"
            />
            <FeatureCard
              emoji="📊"
              title="Track Progress"
              description="See your child's journey across all curriculum areas"
            />
            <FeatureCard
              emoji="📚"
              title="250+ Activities"
              description="Complete Montessori curriculum for ages 2.5-6"
            />
          </div>
        </section>
      )}
    </div>
  );
}

function FeatureCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
