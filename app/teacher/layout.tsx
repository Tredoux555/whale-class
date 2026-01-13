import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teacher Portal | Whale Class',
  description: 'Progress tracking, curriculum, and classroom tools',
};

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
