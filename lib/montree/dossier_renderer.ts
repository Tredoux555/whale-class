// lib/montree/dossier_renderer.ts
//
// Markdown → styled HTML renderer for parent-meeting + principal-pitch
// dossiers. v1 ships HTML with print-friendly CSS; the user prints to PDF
// via the browser's native dialog (Cmd+P → "Save as PDF"). Server-side
// PDF rendering via headless Chrome is deferred to Phase E — it would add
// a ~500MB Playwright + Chromium dependency, and v1 doesn't need it.
//
// The HTML output is self-contained:
//   - inline styles only (no external stylesheets)
//   - the brand emerald + Lora display font used by the rest of Montree
//   - @media print rules so the printed PDF reads as a real document
//
// Markdown features supported (this is a deliberately tiny parser tuned
// for the dossier prompt's output shape):
//   - `# `, `## `, `### ` headers
//   - `**bold**`, `_italic_`
//   - `> ` blockquotes (used heavily for recommended language in scripts)
//   - `- ` bulleted lists
//   - blank lines = paragraph breaks
//   - inline `code` (rare in dossiers, but harmless)
//
// We deliberately do NOT support tables, fenced code blocks, or images.
// If a future dossier section needs them, extend.

import { getTranslator, getIntlLocale } from './i18n/server';
import { isValidLocale, type Locale } from './i18n/locales';

const ESCAPE_HTML: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ESCAPE_HTML[ch]);
}

function applyInlineMarkdown(s: string): string {
  // Order matters — code first so its content isn't re-formatted, then
  // bold, then italic. Escape-aware via the html-escape we did already
  // outside this function.
  return s
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
}

/**
 * Convert a dossier markdown body to HTML body content (no <html> wrap).
 * Used by renderDossierHtml below + by tests.
 */
export function renderDossierMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  let inList = false;
  let inBlockquote = false;

  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  const closeBlockquote = () => {
    if (inBlockquote) {
      out.push('</blockquote>');
      inBlockquote = false;
    }
  };

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();

    // Blank line — close any open blocks; preserve the gap as a small spacer.
    if (line.trim() === '') {
      closeList();
      closeBlockquote();
      i++;
      continue;
    }

    // Headers.
    const headerMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headerMatch) {
      closeList();
      closeBlockquote();
      const level = headerMatch[1].length;
      const content = applyInlineMarkdown(escapeHtml(headerMatch[2]));
      out.push(`<h${level}>${content}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote.
    if (line.startsWith('> ')) {
      closeList();
      if (!inBlockquote) {
        out.push('<blockquote>');
        inBlockquote = true;
      }
      const content = applyInlineMarkdown(escapeHtml(line.slice(2)));
      out.push(`<p>${content}</p>`);
      i++;
      continue;
    }
    if (line === '>') {
      // Empty blockquote line — keeps the quote block open but inserts a
      // visual gap between paragraphs.
      if (inBlockquote) {
        out.push('<p>&nbsp;</p>');
      }
      i++;
      continue;
    }

    // Bulleted list.
    if (line.startsWith('- ')) {
      closeBlockquote();
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      const content = applyInlineMarkdown(escapeHtml(line.slice(2)));
      out.push(`<li>${content}</li>`);
      i++;
      continue;
    }

    // Plain paragraph — collect contiguous non-empty / non-special lines.
    closeList();
    closeBlockquote();
    const para: string[] = [line];
    let j = i + 1;
    while (
      j < lines.length &&
      lines[j].trim() !== '' &&
      !lines[j].match(/^#{1,3}\s/) &&
      !lines[j].startsWith('> ') &&
      !lines[j].startsWith('- ')
    ) {
      para.push(lines[j].trimEnd());
      j++;
    }
    const content = applyInlineMarkdown(escapeHtml(para.join(' ')));
    out.push(`<p>${content}</p>`);
    i = j;
  }

  closeList();
  closeBlockquote();
  return out.join('\n');
}

const DOSSIER_STYLES = `
  body {
    font-family: 'Lora', 'Georgia', serif;
    color: #0d2818;
    background: #fafdfb;
    max-width: 760px;
    margin: 0 auto;
    padding: 48px 32px 64px;
    line-height: 1.55;
    font-size: 17px;
  }
  h1 {
    font-family: 'Lora', 'Georgia', serif;
    font-size: 28px;
    color: #0d2818;
    border-bottom: 2px solid #34d399;
    padding-bottom: 6px;
    margin-top: 0;
    margin-bottom: 28px;
  }
  h2 {
    font-family: 'Lora', 'Georgia', serif;
    font-size: 21px;
    color: #1d6b48;
    margin-top: 36px;
    margin-bottom: 10px;
  }
  h3 {
    font-family: 'Lora', 'Georgia', serif;
    font-size: 17px;
    color: #1d6b48;
    margin-top: 20px;
    margin-bottom: 6px;
  }
  p {
    margin: 0 0 14px;
  }
  ul {
    margin: 0 0 16px 22px;
    padding: 0;
  }
  li {
    margin-bottom: 6px;
  }
  blockquote {
    border-left: 3px solid #34d399;
    background: #ecfdf5;
    margin: 14px 0 18px;
    padding: 12px 18px;
    color: #0d2818;
    border-radius: 0 6px 6px 0;
  }
  blockquote p:last-child { margin-bottom: 0; }
  strong { color: #0d2818; }
  em { color: #4a5b51; }
  code {
    background: #f0f4f1;
    padding: 1px 5px;
    border-radius: 3px;
    font-family: 'SF Mono', 'Courier New', monospace;
    font-size: 14px;
  }
  .dossier-meta {
    font-size: 13px;
    color: #4a5b51;
    margin-bottom: 32px;
    padding: 12px 16px;
    background: #f0f4f1;
    border-radius: 6px;
  }
  .dossier-meta strong { color: #0d2818; }
  @media print {
    body {
      background: #ffffff;
      padding: 24mm 18mm;
      max-width: none;
    }
    h2 { page-break-after: avoid; }
    h3 { page-break-after: avoid; }
    blockquote { page-break-inside: avoid; }
    .dossier-meta { background: #ffffff; border: 1px solid #d1dbd5; }
    .no-print { display: none !important; }
  }
`;

export interface DossierHtmlOpts {
  title: string;
  subtitle?: string;
  meta?: {
    generated_at?: string;
    cache_age_seconds?: number;
    source_counts?: string;
  };
  /** Show a print button at the top of the page. Default true. */
  showPrintButton?: boolean;
  /**
   * Locale for the surrounding chrome ({@code <html lang>}, date formatting,
   * "Generated:" / "Sources:" / "Print to PDF" labels). The dossier BODY is
   * written in the requested locale by Sonnet upstream — this just makes the
   * wrapper match. Defaults to 'en'.
   */
  locale?: Locale | string;
}

/**
 * Wrap a markdown dossier in a fully self-contained HTML document with
 * print CSS. The result is what the API route returns when
 * output_format='html', and what the browser print dialog turns into a PDF.
 */
export function renderDossierHtml(
  markdownBody: string,
  opts: DossierHtmlOpts
): string {
  const localeRaw = opts.locale ?? 'en';
  const locale: Locale = isValidLocale(localeRaw) ? localeRaw : 'en';
  const t = getTranslator(locale);
  const intlLocale = getIntlLocale(locale);

  const body = renderDossierMarkdownToHtml(markdownBody);
  const titleHtml = escapeHtml(opts.title);
  const subtitleHtml = opts.subtitle ? escapeHtml(opts.subtitle) : '';
  const generatedAt = opts.meta?.generated_at
    ? new Date(opts.meta.generated_at).toLocaleString(intlLocale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;
  const showPrint = opts.showPrintButton !== false;

  // Strip the trailing colon from the React-side i18n keys; the chrome here
  // re-adds it directly inside `<strong>...</strong>` and we want one source
  // of truth in en.ts ("Prepared:" / "Sources:") that BOTH the inline
  // DossierRenderer and this printable view can share.
  const preparedLabel = t('dossier.renderer.prepared').replace(/:\s*$/, '');
  const sourcesLabel = t('dossier.renderer.sources').replace(/:\s*$/, '');
  const printLabel = t('dossier.printButton');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${titleHtml}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />
<style>${DOSSIER_STYLES}</style>
</head>
<body>
<h1>${titleHtml}</h1>
${subtitleHtml ? `<p class="dossier-meta"><strong>${subtitleHtml}</strong></p>` : ''}
${
  generatedAt || opts.meta?.source_counts
    ? `<div class="dossier-meta">${[
        generatedAt ? `<strong>${escapeHtml(preparedLabel)}:</strong> ${generatedAt}` : '',
        opts.meta?.source_counts ? `<strong>${escapeHtml(sourcesLabel)}:</strong> ${escapeHtml(opts.meta.source_counts)}` : '',
      ]
        .filter(Boolean)
        .join(' &middot; ')}</div>`
    : ''
}
${
  showPrint
    ? `<div class="no-print" style="margin-bottom:24px;">
  <button onclick="window.print()" style="background:#34d399;color:#0d2818;border:none;padding:8px 16px;border-radius:6px;font-family:inherit;font-weight:600;cursor:pointer;font-size:14px;">
    ${escapeHtml(printLabel)}
  </button>
</div>`
    : ''
}
${body}
</body>
</html>`;
}
