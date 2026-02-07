'use client';

import { useRouter } from 'next/navigation';

export default function TeachingToolsSection() {
  const router = useRouter();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Teaching Tools</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <a href="/api/guides/language-making-guide" download="Montessori_Language_Making_Guide.docx"
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-lg flex-shrink-0">
            📄
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-800 text-sm">Language Guide</p>
            <p className="text-xs text-gray-400">Making &amp; presenting</p>
          </div>
        </a>
        <button onClick={() => router.push('/montree/dashboard/card-generator')}
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-lg flex-shrink-0">
            🃏
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-800 text-sm">3-Part Cards</p>
            <p className="text-xs text-gray-400">Nomenclature cards</p>
          </div>
        </button>
        <button onClick={() => router.push('/montree/dashboard/vocabulary-flashcards')}
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-lg flex-shrink-0">
            📇
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-800 text-sm">Vocab Flashcards</p>
            <p className="text-xs text-gray-400">Weekly vocab</p>
          </div>
        </button>
      </div>
    </div>
  );
}
