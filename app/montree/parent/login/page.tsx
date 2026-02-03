'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ParentLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to parent portal (code-only access)
    router.push('/montree/parent');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="animate-pulse text-4xl mb-4">🌳</div>
        <p className="text-gray-500">Redirecting...</p>
      </div>
    </div>
  );
}
