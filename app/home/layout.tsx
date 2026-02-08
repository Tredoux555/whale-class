// /home/layout.tsx — Session 158
// Server component layout for /home/* pages (enables metadata export)
// Client nav logic extracted to components/home/HomeNav.tsx

import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import HomeNav from '@/components/home/HomeNav';

export const metadata: Metadata = {
  title: {
    default: 'Montree Home — Montessori at Home',
    template: '%s | Montree Home',
  },
  description:
    'Track your child\'s Montessori learning journey at home with 66 curated activities. Free progress tracking for homeschool families.',
  openGraph: {
    title: 'Montree Home — Montessori at Home',
    description:
      'Track your child\'s Montessori learning journey at home with 66 curated activities. Free progress tracking for homeschool families.',
    url: 'https://montree.xyz/home',
    siteName: 'Montree',
    images: [
      {
        url: 'https://montree.xyz/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Montree Home — Montessori at Home',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Montree Home — Montessori at Home',
    description:
      'Track your child\'s Montessori learning journey at home with 66 curated activities.',
    images: ['https://montree.xyz/og-image.png'],
  },
  alternates: {
    canonical: 'https://montree.xyz/home',
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster position="top-center" />
      <HomeNav />
      {children}
    </>
  );
}
