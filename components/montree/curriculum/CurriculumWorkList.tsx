'use client';

import { Work, AREA_COLORS, AREA_ICONS } from './types';

interface CurriculumWorkListProps {
  selectedArea: string;
  works: Work[];
  expandedWork: string | null;
  setExpandedWork: (id: string | null) => void;
  onEditWork: (work: Work) => void;
  onDeleteWork: (work: Work) => void;
  reordering: boolean;
  onDragStart: (e: React.DragEvent, work: Work) => void;
  onDragOver: (e: React.DragEvent, workId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, work: Work) => void;
  onDragEnd: () => void;
  draggedWork: Work | null;
  dragOverId: string | null;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  startAutoScroll: (direction: 'up' | 'down', speed: number) => void;
  stopAutoScroll: () => void;
}

export default function CurriculumWorkList({
  selectedArea,
  works,
  expandedWork,
  setExpandedWork,
  onEditWork,
  onDeleteWork,
  reordering,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  draggedWork,
  dragOverId,
  scrollContainerRef,
  startAutoScroll,
  stopAutoScroll,
}: CurriculumWorkListProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 capitalize flex items-center gap-2">
          {AREA_ICONS[selectedArea]} {selectedArea.replace('_', ' ')}
        </h3>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          {reordering && <span className="animate-spin">⏳</span>}
          ↕️ Drag to reorder
        </span>
      </div>
      <div
        ref={scrollContainerRef}
        className="space-y-2 max-h-[60vh] overflow-y-auto scroll-smooth"
        onDragOver={(e) => {
          e.preventDefault();
          if (scrollContainerRef.current && draggedWork) {
            const rect = scrollContainerRef.current.getBoundingClientRect();
            const mouseY = e.clientY;
            const edgeThreshold = 60;
            const scrollSpeed = 8;

            if (mouseY < rect.top + edgeThreshold) {
              const proximity = 1 - (mouseY - rect.top) / edgeThreshold;
              startAutoScroll('up', scrollSpeed * Math.max(0.5, proximity));
            } else if (mouseY > rect.bottom - edgeThreshold) {
              const proximity = 1 - (rect.bottom - mouseY) / edgeThreshold;
              startAutoScroll('down', scrollSpeed * Math.max(0.5, proximity));
            } else {
              stopAutoScroll();
            }
          }
        }}
        onDragLeave={() => stopAutoScroll()}
      >
        {works.map(work => {
          const isExpanded = expandedWork === work.id;
          const isDragging = draggedWork?.id === work.id;
          const isDragOver = dragOverId === work.id;
          return (
            <div
              key={work.id}
              draggable
              onDragStart={(e) => onDragStart(e, work)}
              onDragOver={(e) => onDragOver(e, work.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, work)}
              onDragEnd={onDragEnd}
              className={`bg-gray-50 rounded-xl overflow-hidden transition-all
                ${isDragging ? 'opacity-50 scale-95' : ''}
                ${isDragOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
            >
              {/* Work Header */}
              <div className="flex items-center gap-2 p-3">
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 px-1">
                  ⋮⋮
                </div>
                <button
                  onClick={() => setExpandedWork(isExpanded ? null : work.id)}
                  className="flex-1 flex items-center gap-3 text-left hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${AREA_COLORS[selectedArea]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{work.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {work.is_gateway && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Gateway</span>}
                    <span className="text-xs text-gray-400">{work.age_range || '3-6'}</span>
                    <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </button>
                {/* Edit button */}
                <button onClick={() => onEditWork(work)}
                  className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-200">
                  ✏️
                </button>
                {/* Delete button */}
                <button onClick={() => onDeleteWork(work)}
                  className="w-8 h-8 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center hover:bg-red-100 hover:text-red-600"
                  title="Delete work">
                  🗑️
                </button>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-200 space-y-3">
                  {/* QUICK GUIDE - Most important for teachers */}
                  {work.quick_guide && (
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-amber-800 flex items-center gap-2">
                          ⚡ Quick Guide
                        </p>
                        {work.video_search_term && (
                          <a
                            href={`https://youtube.com/results?search_query=${encodeURIComponent(work.video_search_term)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
                          >
                            🎬 Watch Video
                          </a>
                        )}
                      </div>
                      <div className="text-sm text-amber-900 space-y-1">
                        {work.quick_guide.split('\n').map((line, i) => (
                          <p key={i} className="leading-relaxed">{line}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Video button if no quick guide but has video */}
                  {!work.quick_guide && work.video_search_term && (
                    <a
                      href={`https://youtube.com/results?search_query=${encodeURIComponent(work.video_search_term)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                    >
                      🎬 Watch Presentation Video
                    </a>
                  )}

                  {/* Teacher Notes (if any) */}
                  {work.teacher_notes && (
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <p className="font-semibold text-yellow-700 text-xs mb-1">📝 Teacher Notes</p>
                      <p className="text-sm text-yellow-800">{work.teacher_notes}</p>
                    </div>
                  )}

                  {/* Parent Explanation */}
                  {work.parent_explanation && (
                    <div className="bg-emerald-50 p-3 rounded-lg">
                      <p className="text-sm text-emerald-800">{work.parent_explanation}</p>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {work.direct_aims?.length > 0 && (
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">🎯 Direct Aims</p>
                        <ul className="text-gray-600 space-y-0.5">
                          {work.direct_aims.map((aim: string, i: number) => (
                            <li key={i} className="text-xs">• {aim}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {work.indirect_aims?.length > 0 && (
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">🌱 Indirect Aims</p>
                        <ul className="text-gray-600 space-y-0.5">
                          {work.indirect_aims.map((aim: string, i: number) => (
                            <li key={i} className="text-xs">• {aim}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {work.readiness_indicators?.length > 0 && (
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">✅ Readiness Signs</p>
                        <ul className="text-gray-600 space-y-0.5">
                          {work.readiness_indicators.map((item: string, i: number) => (
                            <li key={i} className="text-xs">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {work.materials_needed?.length > 0 && (
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">🧰 Materials</p>
                        <ul className="text-gray-600 space-y-0.5">
                          {work.materials_needed.map((item: string, i: number) => (
                            <li key={i} className="text-xs">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {work.why_it_matters && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="font-semibold text-blue-700 text-xs mb-1">💡 Why It Matters</p>
                      <p className="text-sm text-blue-800">{work.why_it_matters}</p>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {work.difficulty_level && (
                      <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full capitalize">
                        {work.difficulty_level}
                      </span>
                    )}
                    {work.sub_area && (
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full capitalize">
                        {work.sub_area.replace('_', ' ')}
                      </span>
                    )}
                    {work.primary_skills?.slice(0, 3).map((skill: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                        {skill.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
