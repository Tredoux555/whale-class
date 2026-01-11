'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ParentDemoBypass() {
  const router = useRouter();
  const [status, setStatus] = useState('Finding demo family...');

  useEffect(() => {
    const autoLogin = async () => {
      try {
        // Try to find demo family
        const res = await fetch(`/api/unified/families?email=${encodeURIComponent('demo@test.com')}`);
        const data = await res.json();

        if (data.families && data.families.length > 0) {
          const familyId = data.families[0].id;
          localStorage.setItem('montree_family_id', familyId);
          setStatus('Redirecting to family dashboard...');
          router.push(`/parent/home/${familyId}`);
          return;
        }

        // Fallback to old API
        const oldRes = await fetch(`/api/montree-home/families?email=${encodeURIComponent('demo@test.com')}`);
        const oldData = await oldRes.json();
        
        if (oldData.families && oldData.families.length > 0) {
          const familyId = oldData.families[0].id;
          localStorage.setItem('montree_family_id', familyId);
          setStatus('Redirecting to family dashboard...');
          router.push(`/parent/home/${familyId}`);
          return;
        }

        setStatus('Demo family not found. Please contact admin.');
      } catch (error) {
        console.error('Auto-login failed:', error);
        setStatus('Error connecting. Please try again.');
      }
    };

    autoLogin();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
          <span className="text-4xl animate-bounce">👨‍👩‍👧</span>
        </div>
        <p className="text-gray-600 font-medium">{status}</p>
      </div>
    </div>
  );
}
