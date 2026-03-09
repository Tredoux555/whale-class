'use client';

// /montree/login/page.tsx — Redirects to unified login
// Old teacher-specific login page, now unified
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  useEffect(() => {
    const url = redirect
      ? `/montree/login-select?redirect=${encodeURIComponent(redirect)}`
      : '/montree/login-select';
    router.replace(url);
  }, [router, redirect]);

  return null;
}

export default function TeacherLoginPage() {
  return (
    <Suspense>
      <LoginRedirect />
    </Suspense>
  );
}
