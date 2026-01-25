import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Whale Class',
  description: 'Platform administration and management tools',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
