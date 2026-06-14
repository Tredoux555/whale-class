// components/story/personal/Markdown.tsx
//
// Tiny, dependency-free Markdown → React renderer for the personal platform
// (diary entries + Coach replies). We deliberately do NOT pull in
// react-markdown — the format is narrow and the project ethos (see
// components/montree/admin/TracyBody.tsx) is to render the small subset we
// actually use. No dangerouslySetInnerHTML → no XSS surface.
//
// Supported: # / ## / ### headings, - / * / 1. lists, > blockquote,
// **bold**, *italic*, `code`, paragraphs, blank-line separation.

import { Fragment, type ReactNode, type CSSProperties } from 'react';
import { T } from '@/lib/story/personal-theme';

// Inline: **bold**, *italic*, `code`. Unmatched markers render literally.
function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<Fragment key={`${keyBase}-t${i++}`}>{text.slice(last, m.index)}</Fragment>);
    if (m[2] !== undefined) {
      out.push(<strong key={`${keyBase}-b${i++}`} style={{ color: T.text, fontWeight: 600 }}>{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      out.push(<em key={`${keyBase}-i${i++}`}>{m[3]}</em>);
    } else if (m[4] !== undefined) {
      out.push(
        <code
          key={`${keyBase}-c${i++}`}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.88em',
            background: 'rgba(255,255,255,0.07)',
            padding: '1px 5px',
            borderRadius: 5,
          }}
        >
          {m[4]}
        </code>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<Fragment key={`${keyBase}-t${i++}`}>{text.slice(last)}</Fragment>);
  return out;
}

export default function Markdown({ text, style }: { text: string; style?: CSSProperties }) {
  const lines = (text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={`p${key++}`} style={{ margin: '0 0 14px', lineHeight: 1.7 }}>
          {renderInline(para.join(' '), `p${key}`)}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list && list.items.length) {
      const items = list.items.map((it, idx) => (
        <li key={`li${idx}`} style={{ margin: '0 0 6px', lineHeight: 1.6 }}>
          {renderInline(it, `li${key}-${idx}`)}
        </li>
      ));
      blocks.push(
        list.ordered ? (
          <ol key={`l${key++}`} style={{ margin: '0 0 14px', paddingLeft: 22 }}>{items}</ol>
        ) : (
          <ul key={`l${key++}`} style={{ margin: '0 0 14px', paddingLeft: 22 }}>{items}</ul>
        ),
      );
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      blocks.push(
        <blockquote
          key={`q${key++}`}
          style={{
            margin: '0 0 14px',
            padding: '4px 0 4px 14px',
            borderLeft: `3px solid ${T.emerald}`,
            color: T.textMid,
            fontStyle: 'italic',
          }}
        >
          {renderInline(quote.join(' '), `q${key}`)}
        </blockquote>,
      );
      quote = [];
    }
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === '') { flushAll(); continue; }

    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flushAll();
      const level = h[1].length;
      const size = level === 1 ? 22 : level === 2 ? 18 : 16;
      blocks.push(
        <div
          key={`h${key++}`}
          style={{
            fontFamily: T.serif,
            fontSize: size,
            fontWeight: 600,
            color: T.text,
            margin: '6px 0 10px',
          }}
        >
          {renderInline(h[2], `h${key}`)}
        </div>,
      );
      continue;
    }

    const ul = /^[-*]\s+(.*)$/.exec(line);
    if (ul) {
      flushPara(); flushQuote();
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(ul[1]);
      continue;
    }
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      flushPara(); flushQuote();
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(ol[1]);
      continue;
    }
    const bq = /^>\s?(.*)$/.exec(line);
    if (bq) {
      flushPara(); flushList();
      quote.push(bq[1]);
      continue;
    }

    flushList(); flushQuote();
    para.push(line);
  }
  flushAll();

  return (
    <div style={{ color: T.textMid, fontSize: 15.5, ...style }}>
      {blocks}
    </div>
  );
}
