// lib/onboarding-core/print/PickupSheets.tsx
//
// Two sheets that live on the classroom door:
//
//   (a) Pickup Authorization Sheet — one row per child: the child's face, a
//       red allergy flag if anything is severe or moderate, then every adult
//       the family authorised, each with a FACE. Staff match a face at the
//       door, never a name on a phone screen.
//   (b) Daily Sign In / Sign Out Sheet — the paper the school actually runs
//       on: time in, dropped by, time out, picked up by, signature.
//
// 🚨 Shared with PSS (phase 2): inline styles only, no design-system classes,
// no styled-jsx (plain <style dangerouslySetInnerHTML>), photoUrls arrive
// ALREADY RESOLVED by the adapter. White paper.

'use client';

import React from 'react';
import { EN, type IntakeStrings } from '../strings';

export interface PickupPersonRow {
  name: string;
  relation: string;
  phone: string;
  photoUrl: string | null;
}

export interface PickupSheetChild {
  childName: string;
  photoUrl: string | null;
  /** Display strings — "Li Wei (Mother) · 138 0000 0000". */
  guardians: string[];
  pickupPersons: PickupPersonRow[];
  /** Already filtered to the ones worth a flag (severe / moderate). */
  allergies: string[];
}

export type PickupSheetKind = 'authorization' | 'signinout';

export interface PickupSheetsProps {
  rows: PickupSheetChild[];
  kind: PickupSheetKind;
  className?: string;
  /** Printed in the sheet header — usually the classroom name. */
  headerTitle?: string;
  strings?: IntakeStrings;
}

const PRINT_CSS = `
@page { size: A4; margin: 12mm; }
.oc-pickup-sheet { width: 100%; }
.oc-pickup-row { break-inside: avoid; page-break-inside: avoid; }
.oc-pickup-table { width: 100%; border-collapse: collapse; }
.oc-pickup-table thead { display: table-header-group; }
.oc-pickup-table tr { break-inside: avoid; page-break-inside: avoid; }
@media print {
  html, body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    background: #ffffff !important;
  }
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
    border: '1px solid #cbd5e1',
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  if (!url) {
    return (
      <div style={box}>
        <span style={{ fontSize: `${Math.max(8, sizeMm)}pt`, fontWeight: 700, color: '#64748b' }}>
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

function SheetHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: '6mm', borderBottom: '2px solid #0f172a', paddingBottom: '3mm' }}>
      <div style={{ fontSize: '18pt', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: '10pt', color: '#64748b', marginTop: '1.5mm' }}>{subtitle}</div>}
    </div>
  );
}

function AuthorizationSheet({
  rows,
  headerTitle,
  s,
}: {
  rows: PickupSheetChild[];
  headerTitle?: string;
  s: IntakeStrings;
}) {
  return (
    <>
      <SheetHeader title={s.printPickupAuthTitle} subtitle={headerTitle} />
      {rows.map((child, idx) => (
        <div
          key={`${child.childName}-${idx}`}
          className="oc-pickup-row"
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: '3mm',
            padding: '4mm',
            marginBottom: '4mm',
            background: '#ffffff',
          }}
        >
          {/* Child header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4mm', marginBottom: '3mm' }}>
            <Face url={child.photoUrl} name={child.childName} sizeMm={18} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15pt', fontWeight: 700, color: '#0f172a', lineHeight: 1.15 }}>
                {child.childName}
              </div>
              {child.guardians.length > 0 && (
                <div style={{ fontSize: '9pt', color: '#64748b', marginTop: '1mm' }}>
                  {child.guardians.join('  ·  ')}
                </div>
              )}
            </div>
            {child.allergies.length > 0 && (
              <div
                style={{
                  border: '1.5px solid #dc2626',
                  color: '#dc2626',
                  borderRadius: '2mm',
                  padding: '1.5mm 3mm',
                  fontSize: '9pt',
                  fontWeight: 700,
                  maxWidth: '62mm',
                  textAlign: 'right',
                  lineHeight: 1.25,
                }}
              >
                ⚠ {s.printAllergyFlag}: {child.allergies.join(', ')}
              </div>
            )}
          </div>

          {/* Authorized adults */}
          <div
            style={{
              fontSize: '8pt',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#94a3b8',
              marginBottom: '2mm',
            }}
          >
            {s.printAuthorizedPickup}
          </div>
          {child.pickupPersons.length === 0 ? (
            <div style={{ fontSize: '9pt', color: '#64748b', fontStyle: 'italic' }}>
              {s.printNoPickupPersons}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3mm' }}>
              {child.pickupPersons.map((p, i) => (
                <div
                  key={`${p.name}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2.5mm',
                    border: '1px solid #e2e8f0',
                    borderRadius: '2mm',
                    padding: '2mm 3mm',
                    minWidth: '52mm',
                  }}
                >
                  <Face url={p.photoUrl} name={p.name} sizeMm={14} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '10pt', fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '8pt', color: '#64748b' }}>
                      {[p.relation, p.phone].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

const TH: React.CSSProperties = {
  border: '1px solid #94a3b8',
  padding: '2mm 2.5mm',
  fontSize: '8.5pt',
  fontWeight: 700,
  textAlign: 'left',
  background: '#f1f5f9',
  color: '#0f172a',
};

const TD: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  padding: '2mm 2.5mm',
  fontSize: '10pt',
  color: '#0f172a',
  height: '14mm',
  verticalAlign: 'middle',
};

function SignInOutSheet({
  rows,
  headerTitle,
  s,
}: {
  rows: PickupSheetChild[];
  headerTitle?: string;
  s: IntakeStrings;
}) {
  return (
    <>
      <SheetHeader title={s.printSignInOutTitle} subtitle={headerTitle} />
      <div style={{ marginBottom: '4mm', fontSize: '11pt', color: '#0f172a' }}>
        {s.printDate}: <span style={{ display: 'inline-block', borderBottom: '1px solid #0f172a', width: '60mm' }} />
      </div>
      <table className="oc-pickup-table">
        <thead>
          <tr>
            <th style={{ ...TH, width: '46mm' }}>{s.printChild}</th>
            <th style={{ ...TH, width: '20mm' }}>{s.printTimeIn}</th>
            <th style={TH}>{s.printDroppedBy}</th>
            <th style={{ ...TH, width: '20mm' }}>{s.printTimeOut}</th>
            <th style={TH}>{s.printPickedUpBy}</th>
            <th style={{ ...TH, width: '34mm' }}>{s.printSignature}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((child, idx) => (
            <tr key={`${child.childName}-${idx}`}>
              <td style={TD}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2.5mm' }}>
                  <Face url={child.photoUrl} name={child.childName} sizeMm={11} />
                  <span style={{ fontWeight: 600 }}>{child.childName}</span>
                  {child.allergies.length > 0 && (
                    <span style={{ color: '#dc2626', fontSize: '8pt', fontWeight: 700 }}>⚠</span>
                  )}
                </div>
              </td>
              <td style={TD} />
              <td style={TD} />
              <td style={TD} />
              <td style={TD} />
              <td style={TD} />
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function PickupSheets({
  rows,
  kind,
  className,
  headerTitle,
  strings,
}: PickupSheetsProps) {
  const s = strings || EN;
  const list = Array.isArray(rows) ? rows : [];

  return (
    <div
      className={`oc-pickup-sheet${className ? ` ${className}` : ''}`}
      style={{
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        padding: '6mm',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      {kind === 'authorization' ? (
        <AuthorizationSheet rows={list} headerTitle={headerTitle} s={s} />
      ) : (
        <SignInOutSheet rows={list} headerTitle={headerTitle} s={s} />
      )}
    </div>
  );
}
