// app/montree/dashboard/[childId]/language-presentation/page.tsx
// Per-child Language semester presentation.
// Curate mode: list slides with toggle include / reorder / edit captions.
// Present mode (?mode=present): full-screen slideshow, keyboard + tap navigation.
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';
import UpgradeCard, { extractUpgradeFromResponse } from '@/components/montree/UpgradeCard';

interface PresentationSlide {
  id: string;
  kind: 'intro' | 'chapter' | 'photo' | 'closing';
  photo_id?: string;
  photo_url?: string;
  work_name?: string;
  chapter?: string;
  caption: string;
  captured_at?: string;
  order: number;
  included: boolean;
}

interface PresentationPlan {
  child_id: string;
  child_name: string;
  date_from: string;
  date_to: string;
  photo_count: number;
  slides: PresentationSlide[];
  generated_at: string;
  model: string;
}

export default function LanguagePresentationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const childId = params?.childId as string;
  const mode = searchParams?.get('mode') || 'curate';
  const { locale } = useI18n();

  const [plan, setPlan] = useState<PresentationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftCaption, setDraftCaption] = useState('');
  const [presentIdx, setPresentIdx] = useState(0);
  // 402 + requires_upgrade → render UpgradeCard above the slides view.
  const [upgrade, setUpgrade] = useState<{ feature: string; upgradeUrl: string } | null>(null);

  const t = useCallback(
    (en: string, zh: string, es?: string) => {
      const L: Record<string, string> = { en, zh };
      if (es) L.es = es;
      return L[locale || 'en'] || en;
    },
    [locale]
  );

  // --- load plan ---
  const loadPlan = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/montree/reports/language-presentation/${childId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('load failed');
      const data = await res.json();
      setPlan(data.exists ? (data.plan as PresentationPlan) : null);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // --- generate ---
  const handleGenerate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    setUpgrade(null);
    try {
      const res = await fetch(`/api/montree/reports/language-presentation/${childId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.status === 402) {
        const u = await extractUpgradeFromResponse(res);
        if (u) {
          setUpgrade({ feature: u.feature, upgradeUrl: u.upgradeUrl });
          return;
        }
      }
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Generation failed');
        return;
      }
      setPlan(data.plan as PresentationPlan);
      toast.success(t('Presentation ready', '演示已生成'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [childId, generating, t]);

  // --- save edits ---
  const saveSlides = useCallback(
    async (slides: PresentationSlide[]) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/montree/reports/language-presentation/${childId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slides }),
        });
        if (!res.ok) throw new Error('save failed');
        const data = await res.json();
        setPlan(data.plan as PresentationPlan);
      } catch {
        toast.error(t('Save failed', '保存失败'));
      } finally {
        setSaving(false);
      }
    },
    [childId, t]
  );

  // --- slide mutation helpers ---
  const toggleInclude = useCallback(
    (id: string) => {
      if (!plan) return;
      const slides = plan.slides.map((s) => (s.id === id ? { ...s, included: !s.included } : s));
      setPlan({ ...plan, slides });
      saveSlides(slides);
    },
    [plan, saveSlides]
  );

  const moveSlide = useCallback(
    (id: string, dir: -1 | 1) => {
      if (!plan) return;
      const idx = plan.slides.findIndex((s) => s.id === id);
      if (idx < 0) return;
      const target = idx + dir;
      if (target < 0 || target >= plan.slides.length) return;
      const slides = [...plan.slides];
      [slides[idx], slides[target]] = [slides[target], slides[idx]];
      const renumbered = slides.map((s, i) => ({ ...s, order: i }));
      setPlan({ ...plan, slides: renumbered });
      saveSlides(renumbered);
    },
    [plan, saveSlides]
  );

  const commitCaption = useCallback(() => {
    if (!plan || !editingId) return;
    const slides = plan.slides.map((s) =>
      s.id === editingId ? { ...s, caption: draftCaption } : s
    );
    setPlan({ ...plan, slides });
    setEditingId(null);
    saveSlides(slides);
  }, [plan, editingId, draftCaption, saveSlides]);

  // --- presentation helpers ---
  const includedSlides = useMemo(
    () => (plan ? plan.slides.filter((s) => s.included).sort((a, b) => a.order - b.order) : []),
    [plan]
  );

  // Present-mode keyboard nav
  useEffect(() => {
    if (mode !== 'present') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setPresentIdx((i) => Math.min(i + 1, includedSlides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setPresentIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Escape') {
        router.push(`/montree/dashboard/${childId}/language-presentation`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, includedSlides.length, router, childId]);

  // --- PRESENT MODE ---
  if (mode === 'present') {
    if (!includedSlides.length) {
      return (
        <div className="fixed inset-0 bg-black text-white flex items-center justify-center z-50">
          <button
            onClick={() => router.push(`/montree/dashboard/${childId}/language-presentation`)}
            className="text-emerald-400"
          >
            {t('No slides — go back', '暂无幻灯片 — 返回')}
          </button>
        </div>
      );
    }
    const slide = includedSlides[presentIdx];
    return (
      <div className="fixed inset-0 bg-black text-white flex flex-col">
        {/* tap zones */}
        <div className="absolute inset-y-0 left-0 w-1/3 z-20"
          onClick={() => setPresentIdx((i) => Math.max(i - 1, 0))} />
        <div className="absolute inset-y-0 right-0 w-1/3 z-20"
          onClick={() => setPresentIdx((i) => Math.min(i + 1, includedSlides.length - 1))} />

        {/* exit */}
        <button
          onClick={() => router.push(`/montree/dashboard/${childId}/language-presentation`)}
          className="absolute top-4 right-4 z-30 text-white/60 hover:text-white text-sm px-3 py-1 rounded bg-white/10"
        >
          ✕ {t('Exit', '退出')}
        </button>

        {/* slide */}
        <div className="flex-1 flex items-center justify-center p-8 z-10">
          {slide.kind === 'photo' && slide.photo_url ? (
            <div className="max-w-6xl w-full flex flex-col items-center gap-6">
              <img
                src={slide.photo_url}
                alt=""
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
              />
              <p className="text-xl md:text-2xl text-center leading-relaxed max-w-3xl font-serif">
                {slide.caption}
              </p>
              {slide.chapter && (
                <p className="text-sm text-white/50 uppercase tracking-wider">{slide.chapter}</p>
              )}
            </div>
          ) : slide.kind === 'chapter' ? (
            <div className="text-center max-w-3xl">
              <h2 className="text-5xl md:text-7xl font-serif mb-8">{slide.chapter}</h2>
              <p className="text-xl md:text-2xl text-white/80 leading-relaxed">{slide.caption}</p>
            </div>
          ) : (
            // intro / closing
            <div className="text-center max-w-3xl">
              {slide.kind === 'intro' && (
                <h1 className="text-4xl md:text-6xl font-serif mb-8">
                  {plan?.child_name} · {t('Language', '语言')}
                </h1>
              )}
              <p className="text-2xl md:text-3xl leading-relaxed font-serif">{slide.caption}</p>
            </div>
          )}
        </div>

        {/* progress */}
        <div className="h-1 bg-white/10 z-10">
          <div
            className="h-full bg-emerald-400 transition-all"
            style={{ width: `${((presentIdx + 1) / includedSlides.length) * 100}%` }}
          />
        </div>
        <div className="text-center text-white/40 text-xs py-2 z-10">
          {presentIdx + 1} / {includedSlides.length}
        </div>
      </div>
    );
  }

  // --- CURATE MODE ---
  return (
    <div>
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-2xl mb-4">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/montree/dashboard/${childId}`}
            className="text-white/50 hover:text-[#34d399] text-sm"
          >
            ← {t('Back', '返回')}
          </Link>
          <div className="flex-1">
            <h1 className="text-lg text-white/95" style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 500 }}>
              {t('Language Presentation', '语言演示')}
              {plan && <span className="text-white/40 font-sans"> · {plan.child_name}</span>}
            </h1>
          </div>
          {plan && includedSlides.length > 0 && (
            <button
              onClick={() =>
                router.push(`/montree/dashboard/${childId}/language-presentation?mode=present`)
              }
              className="px-4 py-2 bg-[#1D6B48] hover:bg-[#236B4C] text-white rounded-lg text-sm font-medium"
            >
              🎬 {t('Present', '演示')}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {upgrade && (
          <div style={{ marginBottom: 16 }}>
            <UpgradeCard feature={upgrade.feature} upgradeUrl={upgrade.upgradeUrl} />
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-white/50">{t('Loading…', '加载中…')}</div>
        ) : !plan ? (
          <div className="bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-xl p-10 text-center">
            <div className="text-5xl mb-4">📖</div>
            <h2 className="text-xl text-white/95 mb-2" style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 500 }}>
              {t("No presentation yet", '尚未生成演示')}
            </h2>
            <p className="text-white/60 text-sm mb-6 max-w-md mx-auto leading-relaxed">
              {t(
                "Sonnet will curate this child's Language photos from February 1 to today into a presentation plan. You can then toggle, reorder, and edit before showing parents.",
                'Sonnet 将把此孩子 2 月 1 日至今的语言区照片整理为一份演示方案，您可在展示给家长前调整幻灯片顺序与文字。'
              )}
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-3 bg-[#1D6B48] hover:bg-[#236B4C] disabled:opacity-50 text-white rounded-lg font-medium"
            >
              {generating
                ? t('Curating… (30-60s)', '整理中…（30-60 秒）')
                : t('Generate Presentation', '生成演示')}
            </button>
          </div>
        ) : (
          <>
            {/* Stats + regen */}
            <div className="bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-xl p-4 mb-4 flex items-center gap-4 flex-wrap">
              <div className="text-sm text-white/70">
                <span className="font-medium">{includedSlides.length}</span>
                <span className="text-white/50">
                  {' '}
                  / {plan.slides.length} {t('slides included', '张幻灯片已选')}
                </span>
                <span className="mx-2 text-white/30">·</span>
                <span>
                  {plan.photo_count} {t('photos', '张照片')}
                </span>
              </div>
              {saving && <span className="text-xs text-white/40">{t('Saving…', '保存中…')}</span>}
              <div className="flex-1" />
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-3 py-1.5 text-sm text-[#34d399] hover:bg-[#34d399]/10 rounded-lg disabled:opacity-50"
              >
                {generating ? t('Regenerating…', '重新生成中…') : t('↻ Regenerate', '↻ 重新生成')}
              </button>
            </div>

            {/* Slides list */}
            <div className="space-y-2">
              {plan.slides.map((slide) => (
                <SlideRow
                  key={slide.id}
                  slide={slide}
                  isEditing={editingId === slide.id}
                  draftCaption={draftCaption}
                  onToggle={() => toggleInclude(slide.id)}
                  onUp={() => moveSlide(slide.id, -1)}
                  onDown={() => moveSlide(slide.id, 1)}
                  onStartEdit={() => {
                    setEditingId(slide.id);
                    setDraftCaption(slide.caption);
                  }}
                  onCancelEdit={() => setEditingId(null)}
                  onChangeDraft={setDraftCaption}
                  onCommit={commitCaption}
                  t={t}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- slide row ---
function SlideRow({
  slide,
  isEditing,
  draftCaption,
  onToggle,
  onUp,
  onDown,
  onStartEdit,
  onCancelEdit,
  onChangeDraft,
  onCommit,
  t,
}: {
  slide: PresentationSlide;
  isEditing: boolean;
  draftCaption: string;
  onToggle: () => void;
  onUp: () => void;
  onDown: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onChangeDraft: (s: string) => void;
  onCommit: () => void;
  t: (en: string, zh: string) => string;
}) {
  const kindLabel = {
    intro: t('Intro', '开场'),
    chapter: t('Chapter', '章节'),
    photo: t('Photo', '照片'),
    closing: t('Closing', '结尾'),
  }[slide.kind];

  const kindColor = {
    intro: 'bg-amber-500/15 text-amber-200',
    chapter: 'bg-violet-500/15 text-violet-200',
    photo: 'bg-emerald-500/15 text-emerald-200',
    closing: 'bg-rose-500/15 text-rose-200',
  }[slide.kind];

  return (
    <div
      className={`bg-white/[0.06] border rounded-xl p-3 flex gap-3 transition-opacity ${
        slide.included ? 'border-[rgba(52,211,153,0.15)]' : 'border-[rgba(52,211,153,0.15)] opacity-50'
      }`}
    >
      {/* Include toggle */}
      <label className="flex items-start pt-1 cursor-pointer">
        <input
          type="checkbox"
          checked={slide.included}
          onChange={onToggle}
          className="w-5 h-5 accent-emerald-500"
        />
      </label>

      {/* Thumbnail */}
      {slide.kind === 'photo' && slide.photo_url ? (
        <img
          src={slide.photo_url}
          alt=""
          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
        />
      ) : (
        <div
          className={`w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0 ${
            slide.kind === 'intro'
              ? 'bg-amber-500/10'
              : slide.kind === 'chapter'
              ? 'bg-violet-500/10'
              : slide.kind === 'closing'
              ? 'bg-rose-500/10'
              : 'bg-white/[0.04]'
          }`}
        >
          <span className="text-2xl">
            {slide.kind === 'intro' ? '👋' : slide.kind === 'chapter' ? '📖' : '🌱'}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${kindColor}`}>
            {kindLabel}
          </span>
          {slide.chapter && slide.kind === 'photo' && (
            <span className="text-xs text-white/50 truncate">{slide.chapter}</span>
          )}
          {slide.work_name && (
            <span className="text-xs text-white/40 truncate">· {slide.work_name}</span>
          )}
        </div>
        {slide.kind === 'chapter' && (
          <h3 className="text-base text-white/95 mb-1" style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 500 }}>{slide.chapter}</h3>
        )}
        {isEditing ? (
          <div>
            <textarea
              value={draftCaption}
              onChange={(e) => onChangeDraft(e.target.value)}
              className="w-full text-sm p-2 bg-black/30 text-white/90 border border-[rgba(52,211,153,0.3)] rounded focus:outline-none focus:border-[#34d399]"
              rows={3}
            />
            <div className="flex gap-2 mt-1">
              <button
                onClick={onCommit}
                className="text-xs px-2 py-1 bg-[#1D6B48] text-white rounded hover:bg-[#236B4C]"
              >
                {t('Save', '保存')}
              </button>
              <button onClick={onCancelEdit} className="text-xs px-2 py-1 text-white/50 hover:text-white/70">
                {t('Cancel', '取消')}
              </button>
            </div>
          </div>
        ) : (
          <p
            onClick={onStartEdit}
            className="text-sm text-white/75 leading-snug cursor-text hover:bg-white/[0.04] p-1 -m-1 rounded"
          >
            {slide.caption || (
              <span className="text-white/40 italic">{t('(click to add caption)', '（点击添加文字）')}</span>
            )}
          </p>
        )}
      </div>

      {/* Reorder */}
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button
          onClick={onUp}
          className="text-white/40 hover:text-[#34d399] text-sm w-6 h-6 rounded hover:bg-[#34d399]/10"
          title={t('Move up', '上移')}
        >
          ▲
        </button>
        <button
          onClick={onDown}
          className="text-white/40 hover:text-[#34d399] text-sm w-6 h-6 rounded hover:bg-[#34d399]/10"
          title={t('Move down', '下移')}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
