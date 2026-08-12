"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import { buildTracingPdf, buildTracingPdfBatch, type TracingTemplate } from '@/lib/montree/tracing/pdfTemplates';
import { loadDefaultLogo, loadDefaultWatermark, fileToArrayBuffer } from '@/lib/montree/tracing/assets';

// ============================================
// TRACING WORK
// ============================================
// Name-tracing worksheet generator built on the real dark-phonics stroke-font
// engine (lib/montree/tracing/strokeFont.ts — a faithful port of
// scripts/curriculum/satpin-paperwork/stroke_font.py). Renders the dotted,
// stroke-order-arrowed TRACE IT letterforms live in the browser for any name,
// across three template designs, with optional logo/photo drop-in and a
// whole-class batch mode that merges every child into ONE multi-page PDF.
// ============================================

const TEMPLATES: { id: TracingTemplate; name: string; blurb: string; preview: string }[] = [
  { id: 'A', name: 'Classic Montree', blurb: 'Header, picture box, trace-and-write — matches the dark-phonics tracing workbooks.', preview: '/tools/tracing-work/preview-a.jpg' },
  { id: 'B', name: 'Whale Badge', blurb: 'Playful centred badge with soft teal/gold panels.', preview: '/tools/tracing-work/preview-b.jpg' },
  { id: 'C', name: 'Minimalist Line', blurb: 'Quiet, whitespace-forward, thin rules.', preview: '/tools/tracing-work/preview-c.jpg' },
];

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'name';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default function TracingWorkPage() {
  const { t } = useI18n();

  const [template, setTemplate] = useState<TracingTemplate>('A');
  const [childName, setChildName] = useState('');
  const [className, setClassName] = useState('Whale Class');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [batchText, setBatchText] = useState('');
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assetBytes() {
    const [defaultLogoBytes, defaultWatermarkBytes] = await Promise.all([loadDefaultLogo(), loadDefaultWatermark()]);
    const logoBytes = logoFile ? await fileToArrayBuffer(logoFile) : null;
    const pictureBytes = pictureFile ? await fileToArrayBuffer(pictureFile) : null;
    return { defaultLogoBytes, defaultWatermarkBytes, logoBytes, pictureBytes };
  }

  async function handleSingle() {
    if (!childName.trim()) { setError('Please enter a name to trace.'); return; }
    setError(null);
    setBusy(true);
    try {
      const { defaultLogoBytes, defaultWatermarkBytes, logoBytes, pictureBytes } = await assetBytes();
      const blob = await buildTracingPdf({
        template, childName: childName.trim(), className: className.trim() || 'Whale Class',
        logoBytes, pictureBytes, defaultLogoBytes, defaultWatermarkBytes,
      });
      downloadBlob(blob, `tracing-work-${slugify(childName)}-${template}.pdf`);
    } catch (e) {
      console.error(e);
      setError('Something went wrong generating the worksheet. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleBatch() {
    const names = batchText.split('\n').map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) { setError('Paste at least one name (one per line).'); return; }
    setError(null);
    setBusy(true);
    try {
      const { defaultLogoBytes, defaultWatermarkBytes, logoBytes, pictureBytes } = await assetBytes();
      // One merged document — a page per child — so the whole class is a single
      // print job rather than a zip the teacher has to unpack and print one by one.
      const blob = await buildTracingPdfBatch(
        names.map((name) => ({
          template, childName: name, className: className.trim() || 'Whale Class',
          logoBytes, pictureBytes, defaultLogoBytes, defaultWatermarkBytes,
        })),
      );
      downloadBlob(blob, `tracing-work-${slugify(className)}-${template}.pdf`);
    } catch (e) {
      console.error(e);
      setError('Something went wrong generating the batch. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <header className="bg-[#0D3330] text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/montree/library/tools" className="text-emerald-300 text-sm hover:underline">
              ← {t('tools.back_to_library')}
            </Link>
            <LanguageToggle />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">{t('tools.tracing_work')}</h1>
          <p className="text-emerald-200 mt-1">{t('tools.tracing_work_desc')}</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Template picker */}
        <section>
          <h2 className="text-sm font-bold text-[#0D3330] uppercase tracking-wide mb-3">Choose a template</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setTemplate(tpl.id)}
                className={`text-left rounded-2xl overflow-hidden border-2 transition-all bg-white ${
                  template === tpl.id ? 'border-emerald-500 shadow-lg scale-[1.02]' : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tpl.preview} alt={tpl.name} className="w-full h-40 object-cover object-top border-b border-gray-100" />
                <div className="p-3">
                  <div className="font-bold text-[#0D3330] text-sm">{tpl.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{tpl.blurb}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Class + logo/picture */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#0D3330] uppercase tracking-wide">Class details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-600">Class name (shown on the sheet)</span>
              <input
                type="text" value={className} onChange={(e) => setClassName(e.target.value)}
                placeholder="Whale Class"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </label>
            <div />
            <label className="block">
              <span className="text-sm text-gray-600">Your own logo (optional — replaces the whale emblem)</span>
              <input
                type="file" accept="image/png,image/jpeg"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                className="mt-1 w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Picture for the photo box (optional, Template A)</span>
              <input
                type="file" accept="image/png,image/jpeg"
                onChange={(e) => setPictureFile(e.target.files?.[0] ?? null)}
                className="mt-1 w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-sm"
              />
            </label>
          </div>
        </section>

        {/* Single vs batch */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex gap-2">
            <button
              type="button" onClick={() => setMode('single')}
              className={`px-4 py-2 rounded-lg text-sm font-bold ${mode === 'single' ? 'bg-[#0D3330] text-white' : 'bg-gray-100 text-gray-600'}`}
            >One student</button>
            <button
              type="button" onClick={() => setMode('batch')}
              className={`px-4 py-2 rounded-lg text-sm font-bold ${mode === 'batch' ? 'bg-[#0D3330] text-white' : 'bg-gray-100 text-gray-600'}`}
            >Whole class (one PDF)</button>
          </div>

          {mode === 'single' ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-gray-600">Child&apos;s name</span>
                <input
                  type="text" value={childName} onChange={(e) => setChildName(e.target.value)}
                  placeholder="e.g. Joey"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </label>
              <button
                type="button" onClick={handleSingle} disabled={busy}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50"
              >{busy ? 'Generating…' : 'Generate & download .pdf'}</button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-gray-600">One name per line — you get a single PDF with one page per child</span>
                <textarea
                  value={batchText} onChange={(e) => setBatchText(e.target.value)}
                  rows={8} placeholder={'Joey\nHenry\nSegina\nKayla\n...'}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </label>
              <button
                type="button" onClick={handleBatch} disabled={busy}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50"
              >{busy ? 'Generating…' : 'Generate & download one .pdf'}</button>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </section>
      </div>
    </div>
  );
}
