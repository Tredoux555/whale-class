// lib/onboarding-core/print/LabelSheets.tsx
//
// The four label sheets a school prints once a child's intake is committed:
// cubby, toothbrush, bed, table place card. Each carries the child's FACE and
// their name — a three-year-old finds their own bed by the photo, not by
// reading.
//
// 🚨 Shared with PSS (phase 2). Therefore:
//   - no design-system classes (no .btn, no tailwind) — inline styles only
//   - NO styled-jsx anywhere. Print CSS goes through a plain <style> tag with
//     dangerouslySetInnerHTML (Turbopack rejects nested styled-jsx, and this
//     component is always rendered inside a conditional branch by its hosts).
//   - photoUrl arrives ALREADY RESOLVED. The core never builds a URL; each
//     system proxies its own bucket.
//
// Paper is white. That is a house rule in both products and is not a theme.

'use client';

import React from 'react';

export type LabelType = 'cubby' | 'toothbrush' | 'bed' | 'table';

export interface LabelItem {
  childName: string;
  photoUrl: string | null;
}

export interface LabelSheetsProps {
  items: LabelItem[];
  labelType: LabelType;
  /** Optional line under the name — usually the school or class name. */
  footerText?: string;
}

interface LayoutSpec {
  columns: number;
  /** Card height in mm. */
  heightMm: number;
  photoMm: number;
  nameFontPt: number;
  gapMm: number;
}

const LAYOUTS: Record<LabelType, LayoutSpec> = {
  // ~2 per A4 page — big enough to read from across the room.
  cubby: { columns: 1, heightMm: 128, photoMm: 62, nameFontPt: 40, gapMm: 8 },
  // ~12 per page — a strip that wraps a toothbrush holder.
  toothbrush: { columns: 3, heightMm: 32, photoMm: 22, nameFontPt: 13, gapMm: 4 },
  // ~6 per page.
  bed: { columns: 2, heightMm: 84, photoMm: 42, nameFontPt: 22, gapMm: 6 },
  // Tent fold — 4 per page, each card folds in half so it stands on the table.
  table: { columns: 1, heightMm: 64, photoMm: 22, nameFontPt: 20, gapMm: 4 },
};

const PRINT_CSS = `
@page { size: A4; margin: 10mm; }
.oc-label-sheet { width: 100%; }
.oc-label-card { break-inside: avoid; page-break-inside: avoid; }
@media print {
  html, body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    background: #ffffff !important;
  }
  .oc-label-sheet { padding: 0 !important; }
}
`;

function initial(name: string): string {
  const trimmed = (name || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

function Face({ url, name, sizeMm }: { url: string | null; name: string; sizeMm: number }) {
  const box: React.CSSProperties = {
    width: `${sizeMm}mm`,
    height: `${sizeMm}mm`,
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    border: '1.5px solid #cbd5e1',
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  if (!url) {
    return (
      <div style={box}>
        <span style={{ fontSize: `${Math.max(10, sizeMm * 1.4)}pt`, fontWeight: 700, color: '#64748b' }}>
          {initial(name)}
        </span>
      </div>
    );
  }
  return (
    <div style={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}

/** Cubby / bed / toothbrush all share one card shape — only the numbers move. */
function PlainCard({
  item,
  spec,
  labelType,
  footerText,
}: {
  item: LabelItem;
  spec: LayoutSpec;
  labelType: LabelType;
  footerText?: string;
}) {
  const horizontal = labelType === 'toothbrush';
  return (
    <div
      className="oc-label-card"
      style={{
        height: `${spec.heightMm}mm`,
        border: '1.5px solid #94a3b8',
        borderRadius: labelType === 'toothbrush' ? '4mm' : '6mm',
        background: '#ffffff',
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: horizontal ? '4mm' : '3mm',
        padding: horizontal ? '3mm 5mm' : '5mm',
        textAlign: horizontal ? 'left' : 'center',
        overflow: 'hidden',
      }}
    >
      <Face url={item.photoUrl} name={item.childName} sizeMm={spec.photoMm} />
      <div style={{ minWidth: 0, flex: horizontal ? 1 : undefined }}>
        <div
          style={{
            fontSize: `${spec.nameFontPt}pt`,
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: 1.1,
            wordBreak: 'break-word',
          }}
        >
          {item.childName}
        </div>
        {footerText && labelType !== 'toothbrush' && (
          <div style={{ fontSize: '9pt', color: '#94a3b8', marginTop: '2mm' }}>{footerText}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Tent-fold place card. The card is printed as one tall rectangle with a fold
 * line across the middle: the TOP half is rotated 180° so that, once folded
 * away from the reader, both faces read the right way up.
 */
function TentCard({ item, spec, footerText }: { item: LabelItem; spec: LayoutSpec; footerText?: string }) {
  const half = (
    <div
      style={{
        height: `${spec.heightMm / 2}mm`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5mm',
        padding: '3mm 8mm',
        boxSizing: 'border-box',
      }}
    >
      <Face url={item.photoUrl} name={item.childName} sizeMm={spec.photoMm} />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: `${spec.nameFontPt}pt`,
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: 1.1,
            wordBreak: 'break-word',
          }}
        >
          {item.childName}
        </div>
        {footerText && (
          <div style={{ fontSize: '8pt', color: '#94a3b8', marginTop: '1.5mm' }}>{footerText}</div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="oc-label-card"
      style={{
        height: `${spec.heightMm}mm`,
        border: '1.5px solid #94a3b8',
        borderRadius: '3mm',
        background: '#ffffff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Upside-down half — reads correctly to the person opposite once folded. */}
      <div style={{ transform: 'rotate(180deg)' }}>{half}</div>
      {/* The fold. */}
      <div style={{ borderTop: '1px dashed #cbd5e1', position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            right: '3mm',
            top: '-3.2mm',
            fontSize: '6pt',
            letterSpacing: '0.06em',
            color: '#cbd5e1',
            background: '#ffffff',
            padding: '0 1.5mm',
          }}
        >
          FOLD
        </span>
      </div>
      {half}
    </div>
  );
}

export default function LabelSheets({ items, labelType, footerText }: LabelSheetsProps) {
  const spec = LAYOUTS[labelType];
  const list = Array.isArray(items) ? items : [];

  return (
    <div
      className="oc-label-sheet"
      style={{
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        padding: '6mm',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${spec.columns}, 1fr)`,
          gap: `${spec.gapMm}mm`,
        }}
      >
        {list.map((item, i) =>
          labelType === 'table' ? (
            <TentCard key={`${item.childName}-${i}`} item={item} spec={spec} footerText={footerText} />
          ) : (
            <PlainCard
              key={`${item.childName}-${i}`}
              item={item}
              spec={spec}
              labelType={labelType}
              footerText={footerText}
            />
          )
        )}
      </div>
    </div>
  );
}
