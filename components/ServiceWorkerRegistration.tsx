'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Skip service worker in Capacitor - causes infinite reload loops in iOS WebView
    const isCapacitor = typeof window !== 'undefined' && 
      (window as any).Capacitor !== undefined;
    
    if (isCapacitor) {
      return;
    }
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {
          // SW registration failed
        });
    }
  }, []);

  return null;
}
