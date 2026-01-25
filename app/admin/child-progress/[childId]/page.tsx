// app/admin/child-progress/[childId]/page.tsx
// Individual child progress dashboard

import ChildProgressDashboard from '@/components/progress/ChildProgressDashboard';

interface Props {
  params: Promise<{ childId: string }>;
}

export default async function ChildProgressPage({ params }: Props) {
  const { childId } = await params;
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <ChildProgressDashboard childId={childId} />
      </div>
    </div>
  );
}


