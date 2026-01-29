// components/montree/InstallBanner.tsx
// PWA install prompt banner

'use client';

import { useState, useEffect } from 'react';
import { usePWA } from '@/lib/montree/usePWA';

export default function InstallBanner() {
  const { isInstallable, isInstalled, promptInstall } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed
    const wasDismissed = localStorage.getItem('montree_install_dismissed');
    if (wasDismissed) {
      const dismissedAt = parseInt(wasDismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    // Delay showing banner
    const timer = setTimeout(() => {
      setVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('montree_install_dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (!accepted) {
      handleDismiss();
    }
  };

  // Don't show if already installed, not installable, or dismissed
  if (isInstalled || !isInstallable || dismissed || !visible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-50 animate-slide-up">
      <div className="max-w-lg mx-auto flex items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
          <span className="text-2xl">🌳</span>
        </div>
        
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">
            Install Montree
          </p>
          <p className="text-xs text-gray-500 truncate">
            Add to home screen for quick access
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex-shrink-0 flex gap-2">
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 text-sm px-2"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
