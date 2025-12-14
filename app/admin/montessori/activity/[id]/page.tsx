'use client';

import React from 'react';
import { ActivityDetailView } from '@/components/ActivityDetailView';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
  params: {
    id: string;
  };
  searchParams: {
    childId?: string;
  };
}

export default function ActivityDetailPage({
  params,
  searchParams,
}: PageProps) {
  const router = useRouter();
  const activityId = params.id;
  const childId = searchParams.childId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={
              childId
                ? `/admin/montessori/children/${childId}`
                : '/admin/montessori'
            }
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {childId ? 'Child Profile' : 'Montessori'}
          </Link>
        </div>

        {/* Main Content */}
        <ActivityDetailView
          activityId={activityId}
          childId={childId}
          onBack={() => router.back()}
        />
      </div>
    </div>
  );
}

