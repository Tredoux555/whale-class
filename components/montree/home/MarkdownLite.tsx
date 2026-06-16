// components/montree/home/MarkdownLite.tsx
// A tiny, safe markdown renderer for Ivy's chat bubbles — Ivy writes **bold**,
// *italic*, ## headings, lists and --- rules, and we want those to look right
// (not raw asterisks). Builds React elements directly (no dangerouslySetInnerHTML,
// no HTML injection). Handles the subset Ivy actually uses; unknown syntax falls
// through as plain text.
'use client';

import { Fragment, type ReactNode } from 'react';
import { BIO } from '@/lib/montree/bioluminescent-theme';

// Inline: **bold**, *italic*, `code`. No nesting (rare in practice).
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith('**')) nodes.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) nodes.push(<code key={key++} className="px-1 py-0.5 rounded bg-white/10 text-[12px]">{tok.slice(1, -1)}</code>);
    else nodes.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return nodes;
}

type Block =
  | { type: 'h'; level: number; text: string }
  | { type: 'hr' }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'p'; text: string };

function parseBlocks(src: string): Block[] {
  const lines = src.split('\n');
  const blocks: Block[] = [];
  let i = 0;
  const isHeading = (t: string) => /^#{1,6}\s/.test(t);
  const isHr = (t: string) => /^(-{3,}|\*{3,}|_{3,})$/.test(t);
  const isUl = (t: string) => /^[-*+]\s+/.test(t);
  const isOl = (t: string) => /^\d+[.)]\s+/.test(t);
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) { i++; continue; }
    if (isHeading(t)) { const hashes = t.match(/^#+/)![0].length; blocks.push({ type: 'h', level: Math.min(hashes, 6), text: t.replace(/^#+\s+/, '') }); i++; continue; }
    if (isHr(t)) { blocks.push({ type: 'hr' }); i++; continue; }
    if (isUl(t)) { const items: string[] = []; while (i < lines.length && isUl(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*+]\s+/, '')); i++; } blocks.push({ type: 'ul', items }); continue; }
    if (isOl(t)) { const items: string[] = []; while (i < lines.length && isOl(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+[.)]\s+/, '')); i++; } blocks.push({ type: 'ol', items }); continue; }
    const para: string[] = [t]; i++;
    while (i < lines.length) {
      const tt = lines[i].trim();
      if (!tt || isHeading(tt) || isHr(tt) || isUl(tt) || isOl(tt)) break;
      para.push(tt); i++;
    }
    blocks.push({ type: 'p', text: para.join(' ') });
  }
  return blocks;
}

export default function MarkdownLite({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        if (b.type === 'hr') return <hr key={i} className={`my-2 border-t ${BIO.border.subtle}`} />;
        if (b.type === 'h') {
          const size = b.level <= 2 ? 'text-[15px]' : 'text-[14px]';
          return <div key={i} className={`font-semibold ${size} ${BIO.text.primary} mt-1`}>{renderInline(b.text)}</div>;
        }
        if (b.type === 'ul') return (
          <ul key={i} className="space-y-1">{b.items.map((it, j) => <li key={j} className="flex gap-2"><span className="opacity-60 mt-0.5">•</span><span>{renderInline(it)}</span></li>)}</ul>
        );
        if (b.type === 'ol') return (
          <ol key={i} className="space-y-1">{b.items.map((it, j) => <li key={j} className="flex gap-2"><span className={`${BIO.text.mint} font-semibold`}>{j + 1}.</span><span>{renderInline(it)}</span></li>)}</ol>
        );
        return <p key={i} className="whitespace-pre-wrap">{renderInline(b.text)}</p>;
      })}
    </div>
  );
}
