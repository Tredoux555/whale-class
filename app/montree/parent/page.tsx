'use client';

// /montree/parent/page.tsx — Redirects to unified login
// Old parent-specific login page, now unified
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ParentRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  useEffect(() => {
    // Preserve ?code= param for QR code deep links
    const url = code
      ? `/montree/login-select?code=${encodeURIComponent(code)}`
      : '/montree/login-select';
    router.replace(url);
  }, [router, code]);

  return null;
}

export default function ParentPage() {
  return (
    <Suspense>
      <ParentRedirect />
    </Suspense>
  );
}
