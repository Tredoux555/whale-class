'use client';

// /montree/principal/login/page.tsx — Redirects to unified login
// Old principal-specific login page, now unified
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PrincipalLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/montree/login-select');
  }, [router]);

  return null;
}
