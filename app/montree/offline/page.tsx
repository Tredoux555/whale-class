'use client';

// app/montree/offline/page.tsx
// Offline fallback page for PWA

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
        {/* Icon */}
        <div className="text-6xl mb-4">📴</div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          You're Offline
        </h1>
        
        {/* Message */}
        <p className="text-gray-600 mb-6">
          It looks like you've lost your internet connection. 
          Some features may not be available until you're back online.
        </p>
        
        {/* Tips */}
        <div className="bg-emerald-50 rounded-xl p-4 text-left mb-6">
          <h2 className="font-semibold text-emerald-800 mb-2">While offline, you can:</h2>
          <ul className="text-sm text-emerald-700 space-y-1">
            <li>• View previously loaded reports</li>
            <li>• Browse cached child data</li>
            <li>• Review saved progress</li>
          </ul>
        </div>
        
        {/* Retry Button */}
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition"
        >
          Try Again
        </button>
        
        {/* Footer */}
        <p className="text-xs text-gray-400 mt-6">
          🌳 Montree - Montessori Progress Tracking
        </p>
      </div>
    </div>
  );
}
