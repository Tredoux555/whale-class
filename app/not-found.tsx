import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-lg mb-6">
          <span className="text-6xl">🌳</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Page Not Found</h1>
        <p className="text-gray-600 mb-8 max-w-md">
          Oops! This whale swam to the wrong place. Let&apos;s get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <span>🏠</span>
            <span>Go Home</span>
          </Link>
          <Link
            href="/teacher"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm border border-gray-200"
          >
            <span>👩‍🏫</span>
            <span>Teacher Login</span>
          </Link>
          <Link
            href="/games"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm border border-gray-200"
          >
            <span>🎮</span>
            <span>Games</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
