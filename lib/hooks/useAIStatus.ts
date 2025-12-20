// lib/hooks/useAIStatus.ts
// Hook for checking AI feature availability

import { useState, useEffect } from 'react';

interface AIStatus {
  enabled: boolean;
  model: string;
  features: string[];
}

export function useAIStatus() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/whale/ai/status');
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        } else {
          setStatus({ enabled: false, model: '', features: [] });
        }
      } catch {
        setStatus({ enabled: false, model: '', features: [] });
      } finally {
        setLoading(false);
      }
    }
    checkStatus();
  }, []);

  return { status, loading, isEnabled: status?.enabled ?? false };
}


