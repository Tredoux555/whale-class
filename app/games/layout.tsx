// app/games/layout.tsx
// Layout wrapper for games section

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learning Games | Whale Montessori',
  description: 'Fun English learning games for children ages 2-6',
};

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}

