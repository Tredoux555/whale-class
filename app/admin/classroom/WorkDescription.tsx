'use client';

interface WorkLevel {
  level: number;
  name: string;
  description: string;
}

interface WorkDescriptionData {
  id: string;
  name: string;
  description: string;
  chineseName?: string;
  materials: string[];
  directAims: string[];
  indirectAims: string[];
  controlOfError: string;
  levels: WorkLevel[];
  ageRange?: string;
}

interface Props {
  data: WorkDescriptionData | null;
  area?: string;
  category?: string;
  loading?: boolean;
  error?: string;
}

export default function WorkDescription({ data, area, category, loading, error }: Props) {
  if (loading) {
    return (
      <div className="py-3 px-4 bg-blue-50 border-t border-blue-100">
        <div className="flex items-center gap-2 text-blue-600">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-sm">Loading activity guide...</span>
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
        <p className="text-sm text-gray-500">No activity guide available yet</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-blue-50 to-white border-t border-blue-100">
      {/* Header with name and category */}
      <div className="px-4 py-3 border-b border-blue-100">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-blue-900">{data.name}</h4>
            {data.chineseName && (
              <p className="text-xs text-blue-600 mt-0.5">{data.chineseName}</p>
            )}
          </div>
          {category && (
            <span className="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
              {category}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-700 mt-2 leading-relaxed">{data.description}</p>
      </div>

      {/* Quick Stats Row */}
      <div className="px-4 py-2 flex gap-3 text-[10px] border-b border-blue-50 bg-white/50">
        {data.ageRange && (
          <span className="text-gray-500">👶 {data.ageRange.replace('_', ' ')}</span>
        )}
        {data.levels.length > 0 && (
          <span className="text-gray-500">📊 {data.levels.length} levels</span>
        )}
        {data.materials.length > 0 && (
          <span className="text-gray-500">🧰 {data.materials.length} materials</span>
        )}
      </div>

      {/* Main Content */}
      <div className="px-4 py-3 space-y-3">
        {/* Direct & Indirect Aims */}
        {(data.directAims.length > 0 || data.indirectAims.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {data.directAims.length > 0 && (
              <div>
                <h5 className="text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-1">
                  🎯 Direct Aims
                </h5>
                <div className="flex flex-wrap gap-1">
                  {data.directAims.map((aim, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                      {aim}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.indirectAims.length > 0 && (
              <div>
                <h5 className="text-[10px] font-semibold text-purple-700 uppercase tracking-wide mb-1">
                  🌱 Indirect Aims
                </h5>
                <div className="flex flex-wrap gap-1">
                  {data.indirectAims.map((aim, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                      {aim}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Materials */}
        {data.materials.length > 0 && (
          <div>
            <h5 className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
              🧰 Materials Needed
            </h5>
            <p className="text-xs text-gray-700">
              {data.materials.join(' • ')}
            </p>
          </div>
        )}

        {/* Control of Error */}
        {data.controlOfError && (
          <div className="bg-red-50 rounded-lg px-3 py-2">
            <h5 className="text-[10px] font-semibold text-red-700 uppercase tracking-wide mb-1">
              ⚠️ Control of Error
            </h5>
            <p className="text-xs text-red-700">{data.controlOfError}</p>
          </div>
        )}

        {/* Progression Levels */}
        {data.levels.length > 0 && (
          <div>
            <h5 className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-2">
              📈 Progression Levels
            </h5>
            <div className="space-y-2">
              {data.levels.map((level) => (
                <div 
                  key={level.level}
                  className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {level.level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900">{level.name}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{level.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
