// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const AREA_CONFIG = {
  practical_life: { name: 'Practical Life', icon: 'P', color: '#ec4899' },
  sensorial: { name: 'Sensorial', icon: 'S', color: '#8b5cf6' },
  mathematics: { name: 'Math', icon: 'M', color: '#3b82f6' },
  language: { name: 'Language', icon: 'L', color: '#22c55e' },
  cultural: { name: 'Cultural', icon: 'C', color: '#f97316' },
};

const AGE_LABELS = {
  all: 'All Ages',
  primary_year1: 'Year 1 (2.5-4)',
  primary_year2: 'Year 2 (4-5)',
  primary_year3: 'Year 3 (5-6)',
};

function getMediaUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/montree-media/${path}`;
}

export default function WorkDetailPage() {
  const { workId } = useParams();
  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  // Inject state
  const [showInject, setShowInject] = useState(false);
  const [teacherCode, setTeacherCode] = useState('');
  const [injecting, setInjecting] = useState(false);
  const [injectResult, setInjectResult] = useState(null);

  useEffect(() => {
    if (!workId) return;
    fetch(`/api/montree/community/works/${workId}`)
      .then(r => r.json())
      .then(d => setWork(d.work))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workId]);

  const handleInject = async () => {
    if (!teacherCode.trim()) return;
    setInjecting(true);
    setInjectResult(null);
    try {
      const res = await fetch(`/api/montree/community/works/${workId}/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_code: teacherCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      setInjectResult(res.ok ? { success: true, message: data.message } : { success: false, message: data.error });
    } catch {
      setInjectResult({ success: false, message: 'Something went wrong.' });
    }
    setInjecting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  if (!work) return <div className="min-h-screen flex items-center justify-center text-gray-400">Work not found</div>;

  const cfg = AREA_CONFIG[work.area] || AREA_CONFIG.practical_life;
  const photos = work.photos || [];
  const videos = work.videos || [];
  const pdfs = work.pdfs || [];
  const guide = work.ai_guide;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <header className="bg-[#0D3330] text-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/montree/library" className="text-emerald-300 hover:underline text-sm">
            ← Library
          </Link>
          <span className="text-white/30">|</span>
          <span
            className="px-2.5 py-0.5 rounded-full text-white text-xs font-bold"
            style={{ backgroundColor: cfg.color }}
          >
            {cfg.name}
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Photo Gallery */}
        {photos.length > 0 && (
          <div className="mb-6">
            {/* Main photo */}
            <div
              className="rounded-xl overflow-hidden bg-gray-200 cursor-pointer relative"
              style={{ maxHeight: '400px' }}
              onClick={() => setShowLightbox(true)}
            >
              <img
                src={getMediaUrl(photos[activePhoto].storage_path)}
                alt={work.title}
                className="w-full h-full object-contain"
                style={{ maxHeight: '400px' }}
              />
              {photos[activePhoto].caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-sm px-4 py-2">
                  {photos[activePhoto].caption}
                </div>
              )}
            </div>
            {/* Thumbnails */}
            {photos.length > 1 && (
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {photos.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                      i === activePhoto ? 'border-emerald-500' : 'border-transparent'
                    }`}
                  >
                    <img src={getMediaUrl(p.storage_path)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Title + Meta */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{work.title}</h1>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-3 py-1 rounded-full text-white text-sm font-medium" style={{ backgroundColor: cfg.color }}>
              {cfg.name}
            </span>
            {work.category && (
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">{work.category}</span>
            )}
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">
              {AGE_LABELS[work.age_range] || 'All Ages'}
            </span>
          </div>

          {/* Contributor */}
          <p className="text-sm text-gray-400 mt-3">
            Shared by <strong className="text-gray-600">{work.contributor_name}</strong>
            {work.contributor_school && <> from {work.contributor_school}</>}
            {work.contributor_country && <> · {work.contributor_country}</>}
          </p>

          {/* Stats */}
          <div className="flex gap-4 mt-3 text-sm text-gray-500">
            <span>{work.view_count || 0} views</span>
            <span>{work.download_count || 0} downloads</span>
            <span>{work.inject_count || 0} added to classrooms</span>
          </div>

          {/* Description */}
          <div className="mt-6">
            <h2 className="font-semibold text-gray-900 text-lg">Description</h2>
            <p className="text-gray-700 mt-2 whitespace-pre-wrap">{work.description}</p>
          </div>

          {/* Detailed description */}
          {work.detailed_description && (
            <div className="mt-6">
              <h2 className="font-semibold text-gray-900 text-lg">Detailed Guide</h2>
              <p className="text-gray-700 mt-2 whitespace-pre-wrap">{work.detailed_description}</p>
            </div>
          )}
        </div>

        {/* Materials, Aims, etc. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {work.materials?.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Materials Needed</h3>
              <ul className="space-y-1">
                {work.materials.map((m, i) => (
                  <li key={i} className="text-gray-700 text-sm flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">•</span> {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {work.direct_aims?.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">What Children Learn</h3>
              <ul className="space-y-1">
                {work.direct_aims.map((a, i) => (
                  <li key={i} className="text-gray-700 text-sm flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span> {a}
                  </li>
                ))}
              </ul>
              {work.indirect_aims?.length > 0 && (
                <>
                  <h4 className="font-medium text-gray-600 text-sm mt-3 mb-1">Indirect Benefits</h4>
                  <ul className="space-y-1">
                    {work.indirect_aims.map((a, i) => (
                      <li key={i} className="text-gray-500 text-sm flex items-start gap-2">
                        <span className="text-gray-300 mt-0.5">•</span> {a}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {work.control_of_error && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Control of Error</h3>
              <p className="text-gray-700 text-sm">{work.control_of_error}</p>
            </div>
          )}

          {work.prerequisites?.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Prerequisites</h3>
              <ul className="space-y-1">
                {work.prerequisites.map((p, i) => (
                  <li key={i} className="text-gray-700 text-sm flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Presentation Steps */}
        {work.presentation_steps?.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm mt-4">
            <h2 className="font-semibold text-gray-900 text-lg mb-3">Presentation Steps</h2>
            <ol className="space-y-3">
              {work.presentation_steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: cfg.color }}>
                    {step.step || i + 1}
                  </span>
                  <div>
                    {step.title && <p className="font-medium text-gray-900">{step.title}</p>}
                    <p className="text-gray-700 text-sm">{step.instruction || step}</p>
                    {step.teacher_says && (
                      <p className="text-emerald-700 text-sm mt-1 italic">Say: "{step.teacher_says}"</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* AI Guide */}
        {guide && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 shadow-sm mt-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🧠</span>
              <h2 className="font-semibold text-gray-900 text-lg">AI Presentation Guide</h2>
            </div>

            {guide.presentation_steps?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-800 mb-2">Step-by-Step Presentation</h3>
                <ol className="space-y-2">
                  {guide.presentation_steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {step.step || i + 1}
                      </span>
                      <div>
                        {step.title && <p className="font-medium text-gray-800">{step.title}</p>}
                        <p className="text-gray-700">{step.instruction}</p>
                        {step.teacher_says && (
                          <p className="text-emerald-700 mt-1 italic">"{step.teacher_says}"</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {guide.tips?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-800 mb-2">Tips</h3>
                <ul className="space-y-1">
                  {guide.tips.map((t, i) => (
                    <li key={i} className="text-sm text-gray-700">💡 {t}</li>
                  ))}
                </ul>
              </div>
            )}

            {guide.common_mistakes?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-800 mb-2">Common Mistakes to Avoid</h3>
                <ul className="space-y-1">
                  {guide.common_mistakes.map((m, i) => (
                    <li key={i} className="text-sm text-gray-700">⚠️ {m}</li>
                  ))}
                </ul>
              </div>
            )}

            {guide.materials_sourcing?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-800 mb-2">Where to Find Materials</h3>
                <ul className="space-y-1">
                  {guide.materials_sourcing.map((s, i) => (
                    <li key={i} className="text-sm text-gray-700">🛒 {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {guide.parent_friendly_summary && (
              <div className="mt-4 p-3 bg-white/60 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-1 text-sm">Parent-Friendly Summary</h3>
                <p className="text-sm text-gray-700">{guide.parent_friendly_summary}</p>
              </div>
            )}
          </div>
        )}

        {/* Videos */}
        {videos.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm mt-4">
            <h2 className="font-semibold text-gray-900 text-lg mb-3">Videos</h2>
            <div className="space-y-3">
              {videos.map((v, i) => (
                <video key={i} controls className="w-full rounded-lg" src={getMediaUrl(v.storage_path)}>
                  Your browser does not support the video tag.
                </video>
              ))}
            </div>
          </div>
        )}

        {/* PDFs */}
        {pdfs.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm mt-4">
            <h2 className="font-semibold text-gray-900 text-lg mb-3">Downloadable Files</h2>
            <div className="space-y-2">
              {pdfs.map((p, i) => (
                <a
                  key={i}
                  href={getMediaUrl(p.storage_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{p.filename || 'Download PDF'}</p>
                    {p.description && <p className="text-gray-500 text-xs">{p.description}</p>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Variations & Extensions */}
        {(work.variations?.length > 0 || work.extensions?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {work.variations?.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">Variations</h3>
                <ul className="space-y-1">
                  {work.variations.map((v, i) => (
                    <li key={i} className="text-gray-700 text-sm">🔄 {typeof v === 'string' ? v : v.description || JSON.stringify(v)}</li>
                  ))}
                </ul>
              </div>
            )}
            {work.extensions?.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">Extensions</h3>
                <ul className="space-y-1">
                  {work.extensions.map((e, i) => (
                    <li key={i} className="text-gray-700 text-sm">🚀 {typeof e === 'string' ? e : e.description || JSON.stringify(e)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-6 pb-8">
          <button
            onClick={() => { setShowInject(true); setTeacherCode(''); setInjectResult(null); }}
            className="flex-1 py-3 text-white rounded-xl font-medium text-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: '#0D3330' }}
          >
            Send to My Classroom
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {showLightbox && photos.length > 0 && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center" onClick={() => setShowLightbox(false)}>
          <button className="absolute top-4 right-4 text-white text-3xl z-10" onClick={() => setShowLightbox(false)}>×</button>
          <button
            className="absolute left-4 text-white text-4xl z-10"
            onClick={(e) => { e.stopPropagation(); setActivePhoto(p => p > 0 ? p - 1 : photos.length - 1); }}
          >
            ‹
          </button>
          <img
            src={getMediaUrl(photos[activePhoto].storage_path)}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute right-4 text-white text-4xl z-10"
            onClick={(e) => { e.stopPropagation(); setActivePhoto(p => p < photos.length - 1 ? p + 1 : 0); }}
          >
            ›
          </button>
        </div>
      )}

      {/* Inject Modal */}
      {showInject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowInject(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            {injectResult?.success ? (
              <div className="text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-gray-900">{injectResult.message}</h3>
                <button onClick={() => setShowInject(false)} className="mt-6 w-full py-3 bg-emerald-500 text-white rounded-xl font-medium">
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900">Send to My Classroom</h3>
                <p className="text-gray-500 mt-1">Enter your Montree teacher code:</p>
                <input
                  type="text"
                  value={teacherCode}
                  onChange={(e) => setTeacherCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={10}
                  className="w-full mt-4 px-4 py-3 text-center text-2xl tracking-widest font-mono border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  autoFocus
                />
                {injectResult && !injectResult.success && (
                  <p className="text-red-500 text-sm mt-2 text-center">{injectResult.message}</p>
                )}
                <button
                  onClick={handleInject}
                  disabled={injecting || teacherCode.length < 4}
                  className="w-full mt-4 py-3 bg-[#0D3330] text-white rounded-xl font-medium disabled:opacity-50"
                >
                  {injecting ? 'Adding...' : 'Add to My Curriculum'}
                </button>
                <p className="text-center text-xs text-gray-400 mt-3">
                  Don't have Montree? <Link href="/montree/try" className="text-emerald-600 underline">Try free</Link>
                </p>
                <button onClick={() => setShowInject(false)} className="w-full mt-2 py-2 text-gray-500 text-sm">Cancel</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
