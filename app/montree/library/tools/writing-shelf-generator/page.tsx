// app/montree/library/tools/writing-shelf-generator/page.tsx
//
// WRITING SHELF GENERATOR — an ADD-ON to the Dark Phonics Writing Shelf.
//
// The eleven shipped sheets in public/dark-phonics-shelf/v2/ and their Python
// builders in scripts/curriculum/writing-shelf/ are the canonical set and stay
// exactly as they are. This page is for the day the owner wants the SAME works
// with different words or different pictures: it re-lays them from the pure
// layout library in lib/montree/writing-shelf/generator/, on the same locked
// print rules (Rule A "cut once", printed = finished − 20 mm, short-edge
// duplex) — see CLAUDE.md, "WRITING SHELF PRINT RULES — LOCKED".
//
// 🌐 LANGUAGE: this page is HARDCODED ENGLISH, the sanctioned exception
// already used by SATPIN / Dark Phonics. It deliberately does not go near
// lib/montree/i18n/* — the strict pre-commit i18n check treats a new key
// without every translation as drift, and these are printer's instructions for
// one English phonics shelf, not classroom UI.

'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import ErrorBoundary from '@/components/ErrorBoundary';
import LanguageToggle from '@/components/montree/LanguageToggle';
import MontreeLogo from '@/components/montree/MonteeLogo';
import PhotoBankPicker from '@/components/montree/PhotoBankPicker';
import DuplexCalibration from '@/components/montree/print/DuplexCalibration';
import { useDuplexCalibration } from '@/lib/montree/print/duplex-calibration';
import { printHtmlDocument } from '@/lib/montree/print/print-window';
import { resolvePhotoBankImages } from '@/lib/montree/phonics/photo-bank-resolver';
import {
  buildFlipCardsHtml,
  type FlipCard,
  type FlipCardsConfig,
} from '@/lib/montree/writing-shelf/generator/flip-cards';
import {
  buildSoundFrameMatHtml,
  matGeometry,
  type MatConfig,
} from '@/lib/montree/writing-shelf/generator/sound-frame-mat';
import {
  CHAIN_CARD_WORDS,
  DICTATION_CARD_WORDS,
  defaultMatConfig,
} from '@/lib/montree/writing-shelf/generator/defaults';

type TabId = 'mat' | 'chain' | 'dictation';
type Sides = 'both' | 'front' | 'back';

const TABS: Array<{ id: TabId; label: string; hint: string }> = [
  {
    id: 'mat',
    label: 'Sound-frame mat',
    hint: 'The letter sorting mat — the first work. One sheet of card. Print on SHORT-edge flip.',
  },
  {
    id: 'chain',
    label: 'Chain cards',
    hint: 'Picture on the front, the five-line word chain on the back. Print on SHORT-edge flip.',
  },
  {
    id: 'dictation',
    label: 'Dictation photo cards',
    hint: 'Picture on the front, the single word on the back. Print on SHORT-edge flip.',
  },
];

interface EditableCard {
  word: string;
  /** One word per line. */
  chain: string;
  /** Explicitly chosen picture; when empty the photo bank match is used. */
  photoUrl: string;
  /** True once the owner has cleared the picture on purpose. */
  noPhoto: boolean;
}

function chainDefaults(): EditableCard[] {
  return CHAIN_CARD_WORDS.map(({ word, chain }) => ({
    word,
    chain: chain.join('\n'),
    photoUrl: '',
    noPhoto: false,
  }));
}

function dictationDefaults(): EditableCard[] {
  return DICTATION_CARD_WORDS.map((word) => ({
    word,
    chain: word,
    photoUrl: '',
    noPhoto: false,
  }));
}

/** mm -> CSS px at 96 dpi, for scaling the on-screen preview. */
const MM_PX = 96 / 25.4;

function Preview({ html, widthMm, heightMm, label }: {
  html: string;
  widthMm: number;
  heightMm: number;
  label: string;
}) {
  const boxW = 300;
  const scale = boxW / (widthMm * MM_PX);
  return (
    <div>
      <div className="text-xs font-semibold text-gray-600 mb-1">{label}</div>
      <div
        className="border border-gray-300 bg-white overflow-hidden"
        style={{ width: boxW, height: heightMm * MM_PX * scale }}
      >
        <iframe
          title={label}
          srcDoc={html}
          scrolling="no"
          style={{
            width: widthMm * MM_PX,
            height: heightMm * MM_PX,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        />
      </div>
    </div>
  );
}

function WritingShelfGenerator() {
  const [tab, setTab] = useState<TabId>('mat');
  const calibration = useDuplexCalibration();

  // ── Photo bank ────────────────────────────────────────────────────────────
  const [photoMap, setPhotoMap] = useState<Map<string, string>>(new Map());
  const [photosLoading, setPhotosLoading] = useState(true);
  const [pickerFor, setPickerFor] = useState<{ tab: TabId; index: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    resolvePhotoBankImages(controller.signal)
      .then((map) => {
        if (!controller.signal.aborted) {
          setPhotoMap(map);
          setPhotosLoading(false);
        }
      })
      .catch(() => setPhotosLoading(false));
    return () => controller.abort();
  }, []);

  // ── Sound-frame mat ───────────────────────────────────────────────────────
  const [matPaper, setMatPaper] = useState<'A4' | 'A3'>('A4');
  const [matFrontCount, setMatFrontCount] = useState(3);
  const [matBackCount, setMatBackCount] = useState(4);
  const [matBorder, setMatBorder] = useState(15);
  const [matFrontLabels, setMatFrontLabels] = useState('');
  const [matBackLabels, setMatBackLabels] = useState('');

  const resetMat = useCallback((paper: 'A4' | 'A3') => {
    const d = defaultMatConfig(paper);
    setMatPaper(paper);
    setMatFrontCount(d.front.count);
    setMatBackCount(d.back.count);
    setMatBorder(d.uniformBorder ?? 15);
    setMatFrontLabels('');
    setMatBackLabels('');
  }, []);

  const matConfig: MatConfig = useMemo(() => {
    const base = defaultMatConfig(matPaper);
    const front = matFrontLabels.split(',').map((s) => s.trim());
    const back = matBackLabels.split(',').map((s) => s.trim());
    return {
      ...base,
      uniformBorder: matPaper === 'A3' ? matBorder : base.uniformBorder,
      front: {
        ...base.front,
        count: matFrontCount,
        labels: matFrontLabels.trim() ? front : undefined,
      },
      back: {
        ...base.back,
        count: matBackCount,
        spareIndex: matBackCount - 1,
        labels: matBackLabels.trim() ? back : undefined,
      },
      backPageStyle: calibration.backPageStyle('horizontal'),
    };
  }, [matPaper, matBorder, matFrontCount, matBackCount, matFrontLabels, matBackLabels, calibration]);

  const matGeo = useMemo(() => matGeometry(matConfig), [matConfig]);

  // ── Flip cards (02 and 03) ────────────────────────────────────────────────
  const [chainCards, setChainCards] = useState<EditableCard[]>(chainDefaults);
  const [dictationCards, setDictationCards] = useState<EditableCard[]>(dictationDefaults);

  const cards = tab === 'chain' ? chainCards : dictationCards;
  const setCards = tab === 'chain' ? setChainCards : setDictationCards;

  const resolvePhoto = useCallback(
    (card: EditableCard): string | undefined => {
      if (card.noPhoto) return undefined;
      if (card.photoUrl) return card.photoUrl;
      return photoMap.get(card.word.toLowerCase().trim());
    },
    [photoMap]
  );

  const toFlipCards = useCallback(
    (list: EditableCard[], isChain: boolean): FlipCard[] =>
      list.map((card) => ({
        word: card.word.trim(),
        photoUrl: resolvePhoto(card),
        backLines: isChain
          ? card.chain.split('\n').map((s) => s.trim()).filter(Boolean)
          : [card.word.trim()],
      })),
    [resolvePhoto]
  );

  const flipConfig: FlipCardsConfig = useMemo(() => {
    const isChain = tab === 'chain';
    return {
      cards: toFlipCards(isChain ? chainCards : dictationCards, isChain),
      paper: 'A4',
      highlightChanges: isChain,
      title: isChain ? 'Chain cards' : 'Dictation photo cards',
      backPageStyle: calibration.backPageStyle('vertical'),
    };
  }, [tab, chainCards, dictationCards, toFlipCards, calibration]);

  // ── Print / preview ───────────────────────────────────────────────────────
  const buildHtml = useCallback(
    (sides: Sides): string =>
      tab === 'mat'
        ? buildSoundFrameMatHtml(matConfig, { sides })
        : buildFlipCardsHtml(flipConfig, { sides }),
    [tab, matConfig, flipConfig]
  );

  const frontHtml = useMemo(() => buildHtml('front'), [buildHtml]);
  const backHtml = useMemo(() => buildHtml('back'), [buildHtml]);

  const print = (sides: Sides) => {
    if (!printHtmlDocument(buildHtml(sides))) {
      window.alert('Your browser blocked the print window. Allow pop-ups for this site and try again.');
    }
  };

  const pageW = tab === 'mat' ? matGeo.pageWidth : 210;
  const pageH = tab === 'mat' ? matGeo.pageHeight : 297;
  const activeTab = TABS.find((t) => t.id === tab)!;
  const missingPhotos =
    tab === 'mat' ? [] : cards.filter((c) => !resolvePhoto(c)).map((c) => c.word);

  const updateCard = (index: number, patch: Partial<EditableCard>) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[#0D3330]">Writing Shelf generator</h1>
        <p className="text-gray-600 mt-1 text-sm max-w-3xl">
          Make your own version of the Writing Shelf works with different words or different
          pictures. The printed sheets already on the shelf are not changed by anything you do
          here — this is a second copy, made your way.
        </p>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mt-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-[#0D3330] text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-2">💡 {activeTab.hint}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
          {/* ── Editor ─────────────────────────────────────────────────── */}
          <div className="space-y-4">
            {tab === 'mat' ? (
              <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">Paper size</div>
                  <div className="flex gap-2">
                    {(['A4', 'A3'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => resetMat(p)}
                        className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
                          matPaper === p ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {p} landscape
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    A4 is the mat as it ships. A3 gives the same work bigger, with one neat border
                    of the same width everywhere.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm text-gray-700">
                    Frames on the front
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={matFrontCount}
                      onChange={(e) => setMatFrontCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Frames on the back
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={matBackCount}
                      onChange={(e) => setMatBackCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </label>
                </div>

                {matPaper === 'A3' && (
                  <label className="text-sm text-gray-700 block">
                    Border, in millimetres — the same gap round the outside and between the frames
                    <input
                      type="number"
                      min={5}
                      max={40}
                      step={1}
                      value={matBorder}
                      onChange={(e) => setMatBorder(Math.max(5, parseInt(e.target.value, 10) || 15))}
                      className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </label>
                )}

                <div className="grid grid-cols-1 gap-3">
                  <label className="text-sm text-gray-700">
                    Letters in the FRONT frames (optional, separated by commas — leave empty for a
                    bare mat)
                    <input
                      type="text"
                      value={matFrontLabels}
                      onChange={(e) => setMatFrontLabels(e.target.value)}
                      placeholder="e.g. c, a, t"
                      className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Letters in the BACK frames (optional)
                    <input
                      type="text"
                      value={matBackLabels}
                      onChange={(e) => setMatBackLabels(e.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </label>
                </div>

                <div className="text-xs text-gray-600 bg-gray-50 rounded p-3 leading-relaxed">
                  <div className="font-semibold text-gray-700 mb-1">This mat comes out as</div>
                  Cut rectangle {matGeo.trimWidth} × {matGeo.trimHeight} mm, the same on both sides.<br />
                  Front: {matGeo.front.count} frames of{' '}
                  <b>
                    {matGeo.front.frameWidth.toFixed(2)} × {matGeo.front.frameHeight.toFixed(2)} mm
                  </b>
                  , gaps {matGeo.front.gutter.toFixed(2)} mm.<br />
                  Back: {matGeo.back.count} frames of{' '}
                  <b>
                    {matGeo.back.frameWidth.toFixed(2)} × {matGeo.back.frameHeight.toFixed(2)} mm
                  </b>
                  , gaps {matGeo.back.gutter.toFixed(2)} mm.
                  {matGeo.warnings.length > 0 && (
                    <ul className="mt-2 text-amber-700 list-disc pl-4">
                      {matGeo.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => resetMat(matPaper)}
                  className="text-xs text-gray-500 underline hover:text-gray-700"
                >
                  Reset to shelf defaults
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-700">
                    {cards.length} card{cards.length === 1 ? '' : 's'} · 4 to a sheet
                  </div>
                  <button
                    type="button"
                    onClick={() => setCards(tab === 'chain' ? chainDefaults() : dictationDefaults())}
                    className="text-xs text-gray-500 underline hover:text-gray-700"
                  >
                    Reset to shelf defaults
                  </button>
                </div>

                {photosLoading && (
                  <div className="text-xs text-gray-500">Looking up pictures in the photo bank…</div>
                )}
                {!photosLoading && missingPhotos.length > 0 && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    No picture yet for: {missingPhotos.join(', ')}. Those cards will print the word
                    only — choose a picture below, or leave them and print them as they are.
                  </div>
                )}

                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {cards.map((card, i) => {
                    const url = resolvePhoto(card);
                    return (
                      <div key={i} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex gap-3">
                          <div className="w-16 h-16 shrink-0 rounded border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                            {url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={url} alt={card.word} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-[10px] text-amber-600 text-center px-1">no photo</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <input
                              type="text"
                              value={card.word}
                              onChange={(e) => {
                                const word = e.target.value;
                                updateCard(i, tab === 'chain' ? { word } : { word, chain: word });
                              }}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              placeholder="word"
                            />
                            {tab === 'chain' && (
                              <textarea
                                value={card.chain}
                                onChange={(e) => updateCard(i, { chain: e.target.value })}
                                rows={5}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-mono"
                                placeholder={'one word per line'}
                              />
                            )}
                            <div className="flex flex-wrap gap-3 text-xs">
                              <button
                                type="button"
                                onClick={() => setPickerFor({ tab, index: i })}
                                className="text-teal-700 underline"
                              >
                                Choose a picture
                              </button>
                              <button
                                type="button"
                                onClick={() => updateCard(i, { photoUrl: '', noPhoto: false })}
                                className="text-gray-500 underline"
                              >
                                Use the usual picture
                              </button>
                              <button
                                type="button"
                                onClick={() => updateCard(i, { photoUrl: '', noPhoto: true })}
                                className="text-gray-500 underline"
                              >
                                No picture
                              </button>
                              <button
                                type="button"
                                onClick={() => setCards((prev) => prev.filter((_, k) => k !== i))}
                                className="text-rose-600 underline ml-auto"
                              >
                                Remove card
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCards((prev) => [...prev, { word: '', chain: '', photoUrl: '', noPhoto: false }])
                  }
                  className="text-sm font-semibold text-teal-700"
                >
                  + Add a card
                </button>
              </div>
            )}

            <DuplexCalibration
              calibration={calibration}
              hint={
                tab === 'mat'
                  ? 'On the mat, the back is the four-frame side.'
                  : 'Here, the back is the word side.'
              }
            />
          </div>

          {/* ── Preview + print ────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm font-semibold text-gray-700 mb-3">
                What will print — sheet 1
              </div>
              <div className="flex flex-wrap gap-4">
                <Preview html={frontHtml} widthMm={pageW} heightMm={pageH} label="Front" />
                <Preview html={backHtml} widthMm={pageW} heightMm={pageH} label="Back" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 space-y-2">
              <button
                type="button"
                onClick={() => print('both')}
                className="w-full px-4 py-3 rounded-lg bg-[#0D3330] text-white font-semibold"
              >
                🖨️ Print front and back (one duplex job)
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => print('front')}
                  className="flex-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold"
                >
                  Front only
                </button>
                <button
                  type="button"
                  onClick={() => print('back')}
                  className="flex-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold"
                >
                  Back only
                </button>
              </div>
              <p className="text-xs text-gray-500">
                In the print dialog choose <b>double-sided</b>, <b>flip on SHORT edge</b>, and
                <b> 100% / actual size</b> — never “fit to page”. Then cut along every grey line,
                edge to edge, between the black triangles.
              </p>
            </div>
          </div>
        </div>

        {/* Picture picker */}
        {pickerFor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-gray-800">Choose a picture</div>
                <button
                  type="button"
                  onClick={() => setPickerFor(null)}
                  className="text-gray-500 text-sm underline"
                >
                  Close
                </button>
              </div>
              <PhotoBankPicker
                onSelectPhoto={(dataUrl) => {
                  const target = pickerFor;
                  const setter = target.tab === 'chain' ? setChainCards : setDictationCards;
                  setter((prev) =>
                    prev.map((c, i) =>
                      i === target.index ? { ...c, photoUrl: dataUrl, noPhoto: false } : c
                    )
                  );
                  setPickerFor(null);
                }}
                maxHeight={420}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WritingShelfGeneratorPage() {
  return (
    <ErrorBoundary>
      <div className="bg-[#0D3330] px-4 py-2.5 flex items-center justify-between">
        <Link href="/montree/library" className="flex items-center gap-2 group">
          <MontreeLogo size={26} />
          <span className="text-white font-semibold text-sm group-hover:text-emerald-300 transition-colors">
            Library
          </span>
        </Link>
        <LanguageToggle />
      </div>
      <WritingShelfGenerator />
    </ErrorBoundary>
  );
}
