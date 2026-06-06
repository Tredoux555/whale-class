// app/montree/parent/account/page.tsx
//
// Parent account management. Currently the home of in-app account deletion
// (Apple App Store Guideline 5.1.1(v)) for parent (portal) sessions.
'use client';

import Link from 'next/link';
import DeleteAccountSection from '@/components/montree/DeleteAccountSection';

export default function ParentAccountPage() {
  const clearParentSession = () => {
    try {
      localStorage.removeItem('montree_parent_session');
      localStorage.removeItem('montree_selected_child');
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <Link href="/montree/parent/dashboard" className="text-emerald-600 text-sm hover:underline">
          ← Back
        </Link>
        <h1 className="font-bold text-gray-800">Account</h1>
      </div>

      <main className="p-4 max-w-lg mx-auto space-y-6">
        <DeleteAccountSection
          endpoint="/api/montree/parent/auth/delete-account"
          redirectTo="/montree/parent"
          onDeleted={clearParentSession}
        />
      </main>
    </div>
  );
}
