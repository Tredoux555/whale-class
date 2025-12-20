// app/teacher/layout.tsx
// Layout for teacher pages

import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function TeacherLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}


