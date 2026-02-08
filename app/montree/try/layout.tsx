import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Try Montree Free — Montessori Classroom Demo',
  description:
    'Try Montree free with no sign-up. Explore the Montessori classroom management platform — track progress, manage students, and generate reports.',
  openGraph: {
    title: 'Try Montree Free — Montessori Classroom Demo',
    description:
      'Try Montree free with no sign-up. Explore the Montessori classroom management platform.',
    url: 'https://montree.xyz/montree/try',
    siteName: 'Montree',
    images: [
      {
        url: 'https://montree.xyz/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Montree — Try Free Demo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Try Montree Free — Montessori Classroom Demo',
    description:
      'Try Montree free with no sign-up. Explore the Montessori classroom management platform.',
    images: ['https://montree.xyz/og-image.png'],
  },
  alternates: {
    canonical: 'https://montree.xyz/montree/try',
  },
};

export default function TryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
