// components/montree/InstallBanner.tsx
// PWA install prompt banner

'use client';

import { useState, useEffect } from 'react';
import { usePWA } from '@/lib/montree/usePWA';
import { useI18n } from '@/lib/montree/i18n';

export default function InstallBanner() {
  const { t } = useI18n();
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
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
      style={{
        background: 'rgba(10,26,15,0.92)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        borderTop: '1px solid rgba(52,211,153,0.20)',
        padding: '16px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
      }}
    >
      <div className="max-w-lg mx-auto flex items-center gap-4">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.20)' }}
        >
          <span className="text-2xl">🌳</span>
        </div>
        
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.95)' }}>
            {t('installBanner.title')}
          </p>
          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {t('installBanner.subtitle')}
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex-shrink-0 flex gap-2">
          <button
            onClick={handleDismiss}
            className="text-sm px-2"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            {t('installBanner.later')}
          </button>
          <button
            onClick={handleInstall}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            {t('installBanner.install')}
          </button>
        </div>
      </div>
    </div>
  );
}
