import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Principal Dashboard | Whale Class',
  description: 'School overview - manage teachers, classes, and students',
};

export default function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
