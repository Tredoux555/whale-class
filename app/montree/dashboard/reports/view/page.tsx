// app/montree/dashboard/reports/view/page.tsx
// Native-compatible report view using query params
// Usage: /montree/dashboard/reports/view?id=xxx
// This is used in native builds where dynamic [id] routes don't work

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

function ReportViewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reportId = searchParams.get('id');
  
  // Minimal state for loading
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!reportId) {
      setError('No report ID provided');
      setLoading(false);
      return;
    }
    
    // For web, redirect to the proper dynamic route
    // For native, this page will be enhanced with SQLite queries
    if (typeof window !== 'undefined') {
      const isNative = (window as any).Capacitor?.isNativePlatform?.();
      if (!isNative) {
        // Web: redirect to dynamic route
        router.replace(`/montree/dashboard/reports/${reportId}`);
        return;
      }
    }
    
    setLoading(false);
  }, [reportId, router]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }
  
  if (error || !reportId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-gray-600 mb-4">{error || 'No report ID'}</p>
          <Link href="/montree/dashboard/reports" className="text-blue-500 hover:underline">
            ← Back to reports
          </Link>
        </div>
      </div>
    );
  }
  
  // Native placeholder - will be replaced with SQLite queries in Phase 2
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/montree/dashboard/reports" className="text-blue-500 mb-4 inline-block">
          ← Back to reports
        </Link>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h1 className="text-xl font-bold text-gray-800 mb-4">Report View</h1>
          <p className="text-gray-600">Report ID: {reportId}</p>
          <p className="text-gray-400 text-sm mt-4">
            Native report viewing coming in Phase 2 (SQLite integration)
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ReportViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    }>
      <ReportViewContent />
    </Suspense>
  );
}
