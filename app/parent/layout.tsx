// app/parent/layout.tsx
// Layout for parent pages (optional - for consistent styling)

import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function ParentLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}


