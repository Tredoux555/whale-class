'use client';

interface WorkDescriptionData {
  name: string;
  line1: string;
  line2: string;
}

interface Props {
  data: WorkDescriptionData | null;
  loading?: boolean;
  error?: string;
}

export default function WorkDescription({ data, loading, error }: Props) {
  if (loading) {
    return (
      <div className="py-3 px-4 bg-blue-50 border-t border-blue-100">
        <div className="flex items-center gap-2 text-blue-600">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-3 px-4 bg-amber-50 border-t border-amber-100">
        <p className="text-sm text-amber-700">📋 {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-3 px-4 bg-gray-50 border-t border-gray-100">
        <p className="text-sm text-gray-500">No guide available yet</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-blue-50 to-white border-t border-blue-100 px-4 py-4">
      <div className="space-y-2">
        <p className="text-sm text-gray-700 font-medium">{data.line1}</p>
        <p className="text-sm text-blue-700">{data.line2}</p>
      </div>
    </div>
  );
}
