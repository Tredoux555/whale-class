// components/montree/dossier/DossierRenderer.tsx
//
// Renders a dossier payload inline on the principal's screen. The dossier
// is markdown (the API's default output_format) — we render it via the
// same dossier_renderer used for HTML output so styling is consistent
// across "view in app" and "print to PDF".
//
// PROPS
//   markdown       — the dossier body text
//   childName      — header title
//   subtitle       — e.g. "Whale Class · prepared by Tracy"
//   meta           — { generated_at, source_counts, cache_active }
//   onClose        — optional close callback (used inside a modal)
//   showPrintLink  — when true, surfaces a "Open print view" link that
//                    opens the GET version of the dossier route in a new tab
//   printLinkHref  — the URL to open for print view (route-specific)
//
// VISUAL STYLE
//   Matches lib/montree/dossier_renderer.ts — Lora display, emerald +
//   forest palette, blockquotes for recommended language.

'use client';

import { useMemo } from 'react';
import { renderDossierMarkdownToHtml } from '@/lib/montree/dossier_renderer';
import { useI18n } from '@/lib/montree/i18n';
import { getIntlLocale } from '@/lib/montree/i18n/locales';

export interface DossierRendererProps {
  markdown: string;
  childName: string;
  subtitle?: string;
  meta?: {
    generated_at?: string;
    source_counts?: {
      observations?: number;
      guru_analyses?: number;
      pattern_events?: number;
      developmental_insights?: number;
    };
    cache_active?: boolean;
    from_cache?: boolean;
  };
  onClose?: () => void;
  showPrintLink?: boolean;
  printLinkHref?: string;
}

export function DossierRenderer({
  markdown,
  childName,
  subtitle,
  meta,
  onClose,
  showPrintLink = false,
  printLinkHref,
}: DossierRendererProps) {
  const { t, locale } = useI18n();
  const bodyHtml = useMemo(
    () => renderDossierMarkdownToHtml(markdown),
    [markdown]
  );

  const sourceSummary = meta?.source_counts
    ? [
        meta.source_counts.observations != null
          ? t(
              meta.source_counts.observations === 1
                ? 'dossier.renderer.sourceObservation'
                : 'dossier.renderer.sourceObservations',
              { count: String(meta.source_counts.observations) }
            )
          : null,
        meta.source_counts.guru_analyses != null
          ? t(
              meta.source_counts.guru_analyses === 1
                ? 'dossier.renderer.sourceGuruSession'
                : 'dossier.renderer.sourceGuruSessions',
              { count: String(meta.source_counts.guru_analyses) }
            )
          : null,
        meta.source_counts.pattern_events != null
          ? t(
              meta.source_counts.pattern_events === 1
                ? 'dossier.renderer.sourcePatternEvent'
                : 'dossier.renderer.sourcePatternEvents',
              { count: String(meta.source_counts.pattern_events) }
            )
          : null,
        meta.source_counts.developmental_insights != null &&
        meta.source_counts.developmental_insights > 0
          ? t(
              meta.source_counts.developmental_insights === 1
                ? 'dossier.renderer.sourceDevInsight'
                : 'dossier.renderer.sourceDevInsights',
              { count: String(meta.source_counts.developmental_insights) }
            )
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <div className="dossier-wrapper">
      <style jsx>{`
        .dossier-wrapper {
          max-width: 780px;
          margin: 0 auto;
          padding: 24px 28px 48px;
          background: #fafdfb;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(13, 40, 24, 0.08);
        }
        .dossier-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
          padding-bottom: 14px;
          border-bottom: 2px solid #34d399;
        }
        .dossier-title {
          font-family: 'Lora', Georgia, serif;
          font-size: 26px;
          color: #0d2818;
          margin: 0 0 4px;
          line-height: 1.2;
        }
        .dossier-subtitle {
          font-size: 14px;
          color: #4a5b51;
          margin: 0;
        }
        .dossier-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .dossier-btn {
          font-size: 13px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #34d399;
          background: #ecfdf5;
          color: #0d2818;
          cursor: pointer;
        }
        .dossier-btn:hover {
          background: #d1fae5;
        }
        .dossier-close {
          font-size: 18px;
          padding: 4px 10px;
          background: transparent;
          color: #4a5b51;
          border: none;
          cursor: pointer;
        }
        .dossier-close:hover {
          color: #0d2818;
        }
        .dossier-meta {
          font-size: 12px;
          color: #4a5b51;
          margin-bottom: 24px;
          padding: 10px 14px;
          background: #f0f4f1;
          border-radius: 6px;
          line-height: 1.5;
        }
        .dossier-meta strong {
          color: #0d2818;
        }
        .dossier-body {
          font-family: 'Lora', Georgia, serif;
          color: #0d2818;
          line-height: 1.55;
          font-size: 16px;
        }
        .dossier-body :global(h1),
        .dossier-body :global(h2),
        .dossier-body :global(h3) {
          font-family: 'Lora', Georgia, serif;
          color: #1d6b48;
        }
        .dossier-body :global(h2) {
          font-size: 21px;
          margin-top: 28px;
          margin-bottom: 8px;
        }
        .dossier-body :global(h3) {
          font-size: 16px;
          margin-top: 18px;
          margin-bottom: 4px;
        }
        .dossier-body :global(p) {
          margin: 0 0 12px;
        }
        .dossier-body :global(ul) {
          margin: 0 0 14px 22px;
          padding: 0;
        }
        .dossier-body :global(li) {
          margin-bottom: 5px;
        }
        .dossier-body :global(blockquote) {
          border-left: 3px solid #34d399;
          background: #ecfdf5;
          margin: 12px 0 16px;
          padding: 10px 16px;
          color: #0d2818;
          border-radius: 0 6px 6px 0;
        }
        .dossier-body :global(blockquote p:last-child) {
          margin-bottom: 0;
        }
        .dossier-body :global(strong) {
          color: #0d2818;
        }
        .cache-warning {
          margin-top: 12px;
          padding: 8px 12px;
          background: #fef3c7;
          border-left: 3px solid #f59e0b;
          color: #78350f;
          font-size: 12px;
          border-radius: 0 4px 4px 0;
        }
      `}</style>

      <header className="dossier-head">
        <div>
          <h1 className="dossier-title">
            {t('dossier.renderer.title', { childName })}
          </h1>
          {subtitle ? <p className="dossier-subtitle">{subtitle}</p> : null}
        </div>
        <div className="dossier-actions">
          {showPrintLink && printLinkHref ? (
            <a
              href={printLinkHref}
              target="_blank"
              rel="noopener noreferrer"
              className="dossier-btn"
              style={{ textDecoration: 'none' }}
            >
              {t('dossier.renderer.openPrintView')}
            </a>
          ) : null}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="dossier-close"
              aria-label={t('dossier.renderer.closeAriaLabel')}
            >
              ×
            </button>
          ) : null}
        </div>
      </header>

      {(meta?.generated_at || sourceSummary) && (
        <div className="dossier-meta">
          {meta?.generated_at && (
            <>
              <strong>{t('dossier.renderer.prepared')}</strong>{' '}
              {new Date(meta.generated_at).toLocaleString(
                getIntlLocale(locale),
                {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                }
              )}
              {meta.from_cache ? ` ${t('dossier.renderer.cached')}` : ''}
            </>
          )}
          {meta?.generated_at && sourceSummary && ' · '}
          {sourceSummary && (
            <>
              <strong>{t('dossier.renderer.sources')}</strong> {sourceSummary}
            </>
          )}
        </div>
      )}

      {meta?.cache_active === false && (
        <div className="cache-warning">{t('dossier.renderer.cacheWarning')}</div>
      )}

      <div
        className="dossier-body"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </div>
  );
}
