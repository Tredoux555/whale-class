'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Skip service worker in Capacitor - causes infinite reload loops in iOS WebView
    const isCapacitor = typeof window !== 'undefined' && 
      (window as any).Capacitor !== undefined;
    
    if (isCapacitor) {
      console.log('Skipping SW registration in Capacitor');
      return;
    }
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    }
  }, []);

  return null;
}
