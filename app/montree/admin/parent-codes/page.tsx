// /app/montree/admin/parent-codes/page.tsx
// Admin page to view and print parent access codes for all students
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';

interface ChildCode {
  child_id: string;
  child_name: string;
  code: string;
  parent_url: string;
  qr_url: string;
  expires_at: string;
  used: boolean;
}

export default function ParentCodesPage() {
  const { t } = useI18n();
  const [codes, setCodes] = useState<ChildCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      const res = await fetch('/api/montree/admin/parent-codes');
      if (!res.ok) {
        console.error('Failed to fetch codes: HTTP', res.status);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setCodes(data.codes || []);
      }
    } catch (error) {
      console.error('Failed to fetch codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAllCodes = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/montree/admin/parent-codes/generate-all', {
        method: 'POST',
      });
      if (!res.ok) {
        console.error('Failed to generate codes: HTTP', res.status);
        setGenerating(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        fetchCodes();
      }
    } catch (error) {
      console.error('Failed to generate codes:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl animate-bounce block mb-4">🌳</span>
          <p className="text-gray-600">{t('parentCodes.loading' as TranslationKey)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - hide on print */}
      <header className="bg-white border-b print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/montree/dashboard"
                className="text-gray-500 hover:text-gray-700"
              >
                ← {t('parentCodes.backToDashboard' as TranslationKey)}
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t('parentCodes.title' as TranslationKey)}</h1>
                <p className="text-sm text-gray-500">{codes.length} {t('parentCodes.students' as TranslationKey)}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={generateAllCodes}
                disabled={generating}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {generating ? `⏳ ${t('parentCodes.generating' as TranslationKey)}` : `🔄 ${t('parentCodes.generateMissing' as TranslationKey)}`}
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                🖨️ {t('parentCodes.printCards' as TranslationKey)}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Print Header - only show on print */}
      <div className="hidden print:block text-center py-4 border-b">
        <h1 className="text-2xl font-bold">🌳 {t('parentCodes.printHeader' as TranslationKey)}</h1>
        <p className="text-gray-600">{t('parentCodes.printSubheader' as TranslationKey)}</p>
      </div>

      {/* Code Cards Grid */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {codes.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl block mb-4">📭</span>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('parentCodes.noCodesYet' as TranslationKey)}</h2>
            <p className="text-gray-500 mb-4">{t('parentCodes.generateForAll' as TranslationKey)}</p>
            <button
              onClick={generateAllCodes}
              disabled={generating}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {generating ? `⏳ ${t('parentCodes.generating' as TranslationKey)}` : `✨ ${t('parentCodes.generateAll' as TranslationKey)}`}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-2">
            {codes.map((item) => (
              <div
                key={item.child_id}
                className="bg-white rounded-xl border-2 border-gray-200 p-4 print:p-3 print:break-inside-avoid"
              >
                {/* Child Name */}
                <div className="text-center mb-3">
                  <h3 className="text-lg font-bold text-gray-900">{item.child_name}</h3>
                  <p className="text-xs text-gray-500">{t('parentCodes.portalAccess' as TranslationKey)}</p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center mb-3">
                  <img
                    src={item.qr_url}
                    alt={`QR code for ${item.child_name}`}
                    className="w-32 h-32 print:w-24 print:h-24"
                  />
                </div>

                {/* Access Code */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center mb-2">
                  <p className="text-xs text-emerald-600 mb-1">{t('parentCodes.accessCode' as TranslationKey)}</p>
                  <p className="text-2xl font-mono font-bold tracking-wider text-emerald-700">
                    {item.code}
                  </p>
                </div>

                {/* URL */}
                <p className="text-xs text-center text-gray-400 break-all">
                  montree.xyz/montree/parent
                </p>

                {/* Status Badge - hide on print */}
                {item.used && (
                  <div className="mt-2 text-center print:hidden">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      ✓ {t('parentCodes.connected' as TranslationKey)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
