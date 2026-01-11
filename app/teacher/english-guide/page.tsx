'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherEnglishGuidePage() {
  const router = useRouter();

  useEffect(() => {
    // Check teacher login first
    const name = localStorage.getItem('teacherName');
    if (!name) {
      router.push('/teacher');
    } else {
      // Redirect directly to the full English guide
      router.replace('/admin/english-guide');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-xl text-gray-500">Loading guide...</div>
    </div>
  );
}
