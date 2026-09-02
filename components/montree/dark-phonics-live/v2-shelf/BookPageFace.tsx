'use client';

/**
 * One printed face of the reader.
 *
 * 🚨 THIS IS THE A5 BOOKLET, NOT A THEME OF IT (2026-09-02).
 *
 * The class holds the printed reader while the child holds the tablet, so the
 * two must be the same object. Every measurement below is read off
 * scripts/curriculum/flashcards/build_booklets.py — the file that actually
 * prints the paper — and expressed as a fraction of the page so it survives
 * any page size the flip book lands on:
 *
 *   paper        white, 14mm margin (M/PW ≈ 9.4% of the width)
 *   ink          pure black; RED #c62828 is the only second colour
 *   masthead     Work Sans 8.5pt tracked 0.28em, at PH-M-8pt
 *   band         Work Sans 7.5pt tracked 0.22em, at PH-M-22pt
 *   cover title  Young Serif, last line in RED, broken as authored
 *   bookplate    56×25mm ex-libris, bottom-LEFT, on the margin, with the red
 *                ownership dot re-centred on it at M+12.5mm
 *   lead-in      Lora italic 34pt, baseline at PH*0.68
 *   reveal word  Outfit Bold, one shared size band (REVEAL_MAX 92 × 1.25),
 *                baseline at PH*0.52 — a chant page sets it RED
 *   art page     picture only, 8mm side margins, 14mm top/bottom, nudged 4mm up
 *   folio        Work Sans 6.5pt at 8mm, OUTSIDE edge (left on even pages)
 *
 * Type is sized in `em` of a page-width font size the caller sets on the leaf
 * (`--dpb-u`, one unit = 1% of the page width), which is how a point size on a
 * 148.5mm page becomes the same optical size on a 300px one.
 *
 * 🚨 TEXT LEFT, PICTURE RIGHT. That pairing is pagination's job, not this
 * component's — see books.ts. This file only ever paints ONE page.
 */

import type { CSSProperties, ReactNode } from 'react';

import type { ShelfPage } from '@/lib/montree/dark-phonics/v2-shelf/books';
import {
  BACK_FOOTER,
  BACK_STRAPLINE,
  MASTHEAD,
} from '@/lib/montree/dark-phonics/v2-shelf/books';

/* -------------------------------------------------------------------------- */
/* The press                                                                   */
/* -------------------------------------------------------------------------- */

const PAPER = '#ffffff';
const INK = '#000000';
const RED = '#c62828';
const RULE_GREY = '#595959';
const SOFT_GREY = '#6b6b6b';
const HAIR_GREY = '#b8b8b8';

/** Young Serif on paper — the closest face this app already loads. */
const SERIF = "var(--font-newsreader), 'Newsreader', Georgia, serif";
/** Lora italic on paper, and Lora italic here: the same typeface. */
const NAR = "var(--font-lora), 'Lora', Georgia, serif";
/** Outfit Bold on paper — a geometric sans with the single-storey 'a'. */
const WORD = "'Space Grotesk', var(--dpl-font-display), system-ui, sans-serif";
/** Work Sans on paper. */
const LABEL = "var(--font-hanken), 'Hanken Grotesk', system-ui, sans-serif";

/** A5 is 148.5mm wide with a 14mm margin — 9.43% a side. */
const MARGIN = '9.43%';

/**
 * A point on the printed A5 page, in `cqw` — 1% of the leaf's own width.
 *
 * 🚨 THE TYPE SCALE IS THE PAPER'S, RESOLVED AGAINST THE LEAF. A5 is 420.9pt
 * wide, so an 8.5pt masthead is 8.5/420.9 of the page width and stays that
 * whatever size the flip book lands on — a 300px phone leaf and a 480px tablet
 * leaf are the same page, photographed at two distances. `cqw` is used rather
 * than a percentage because percentages on `font-size` resolve against the
 * PARENT'S FONT SIZE, not its width, which silently gives nonsense.
 */
function pt(size: number): string {
  return `${((size / 420.9) * 100).toFixed(4)}cqw`;
}

/** The leaf: white paper, and the container the type scale is measured from. */
function Page({
  children,
  className = '',
  style,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{
        background: PAPER,
        color: INK,
        containerType: 'inline-size',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Letter-spaced small caps — `draw_tracked()`. */
function Tracked({
  text,
  size,
  tracking,
  color,
  weight = 400,
}: {
  text: string;
  size: number;
  tracking: number;
  color: string;
  weight?: number;
}) {
  return (
    <span
      className="block text-center"
      style={{
        fontFamily: LABEL,
        fontSize: pt(size),
        fontWeight: weight,
        letterSpacing: `${tracking}em`,
        // The masthead's word gap is three spaces on paper; HTML would collapse
        // them and print "MONTREEPHONICS".
        whiteSpace: 'pre',
        // Tracking pushes the last glyph's space to the right; the printed
        // line is centred on the whole run, so give the indent back.
        textIndent: `${tracking}em`,
        color,
        lineHeight: 1.1,
      }}
    >
      {text}
    </span>
  );
}

/** The folio, on the OUTSIDE edge — left on an even page, right on an odd. */
function Folio({ n }: { n: number }) {
  const left = n % 2 === 0;
  return (
    <span
      className="absolute"
      style={{
        bottom: '3.8%',
        left: left ? MARGIN : undefined,
        right: left ? undefined : MARGIN,
        fontFamily: LABEL,
        fontSize: pt(6.5),
        color: INK,
      }}
    >
      {n}
    </span>
  );
}

/** The red dot the cover, the half-title and every filler page close on. */
function Dot({ bottom, size = 1.1 }: { bottom: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="absolute left-1/2 block rounded-full"
      style={{
        bottom,
        transform: 'translateX(-50%)',
        width: pt(size * 2 * 2.835),
        height: pt(size * 2 * 2.835),
        background: RED,
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* The cover                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The ex-libris plate, `draw_bookplate()`: 56×25mm sitting ON the 14mm margin
 * in the bottom-LEFT corner, an 0.6pt grey frame over an 0.35pt hairline, the
 * label tucked under the top edge and the name rule 3mm above the inner line.
 */
function Bookplate() {
  return (
    <div
      className="absolute"
      style={{
        left: MARGIN,
        bottom: '6.67%', // M / PH
        width: '37.71%', // 56mm / 148.5mm
        height: '11.9%', // 25mm / 210mm
        border: `${pt(0.6)} solid ${RULE_GREY}`,
        borderRadius: pt(4.25),
      }}
    >
      <div
        className="absolute"
        style={{
          inset: pt(4.25),
          border: `${pt(0.35)} solid ${HAIR_GREY}`,
          borderRadius: pt(2.8),
        }}
      />
      <span
        className="absolute left-0 right-0 text-center"
        style={{
          top: '16%',
          fontFamily: NAR,
          fontStyle: 'italic',
          fontSize: pt(8.5),
          color: SOFT_GREY,
        }}
      >
        This book belongs to
      </span>
      <span
        className="absolute block"
        style={{
          left: '8%',
          right: '8%',
          bottom: '18%',
          borderTop: `${pt(0.6)} solid ${INK}`,
        }}
      />
    </div>
  );
}

/**
 * The cover title's point size — `fit()` against the usable width, from the
 * printed ceiling. 0.5 is the serif's average advance as a fraction of its
 * size, so a long title comes down rather than running off the trim.
 */
function titlePt(lines: string[]): number {
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const usable = 421 - 2 * 39.7;
  return Math.min(59, usable / (longest * 0.5));
}

function Cover({ page }: { page: Extract<ShelfPage, { kind: 'cover' }> }) {
  const size = titlePt(page.titleLines);
  return (
    <Page>
      <div
        className="absolute inset-x-0"
        style={{ top: '5.2%', paddingLeft: MARGIN, paddingRight: MARGIN }}
      >
        <Tracked
          text={MASTHEAD.split('').join(' ')}
          size={8.5}
          tracking={0.28}
          color={INK}
        />
        <div style={{ height: pt(13.5) }} />
        <Tracked text={page.band} size={7.5} tracking={0.22} color={INK} />
      </div>

      <div
        className="absolute inset-x-0 text-center"
        style={{ top: '13.5%', paddingLeft: MARGIN, paddingRight: MARGIN }}
      >
        {page.titleLines.map((line, i) => (
          <span
            key={i}
            className="block"
            style={{
              fontFamily: SERIF,
              fontWeight: 500,
              fontSize: pt(size),
              lineHeight: 1.18,
              color: line === page.accent ? RED : INK,
              whiteSpace: 'nowrap',
            }}
          >
            {line}
          </span>
        ))}
      </div>

      {/* The art box: floor raised to M+28mm to clear the bookplate. */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: MARGIN,
          right: MARGIN,
          top: '32%',
          bottom: '20%',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static public art, no known intrinsic size */}
        <img src={page.art} alt="" className="h-full w-full object-contain" />
      </div>

      <Bookplate />
      <Dot bottom="12.62%" size={1.6} />
    </Page>
  );
}

/* -------------------------------------------------------------------------- */
/* The story                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The reveal word's point size — `reveal_size()`: one shared ceiling of
 * 92 × 1.25 = 115pt for every book, shrunk only as far as the usable width
 * demands. 0.58 is Outfit Bold's average advance as a fraction of its size.
 */
function revealPt(lines: string[]): number {
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const usable = 421 - 2 * 39.7; // PW - 2M, in points
  return Math.min(115, usable / (longest * 0.58));
}

function TextPage({ page }: { page: Extract<ShelfPage, { kind: 'text' }> }) {
  // The chant page prints its whole line, red, hand-broken onto two lines;
  // every other page prints a quiet lead-in over one big reveal word.
  const lines = page.chant
    ? chantLines(page.sentence)
    : [page.shout];
  const size = revealPt(lines);

  return (
    <Page>
      {page.lead ? (
        <p
          className="absolute inset-x-0 text-center"
          style={{
            top: '27.5%', // baseline PH*0.68
            paddingLeft: MARGIN,
            paddingRight: MARGIN,
            fontFamily: NAR,
            fontStyle: 'italic',
            fontSize: pt(34),
            lineHeight: 1.2,
            color: INK,
          }}
        >
          {page.lead}
        </p>
      ) : null}

      <p
        className="absolute inset-x-0 text-center"
        style={{
          top: page.lead ? '38%' : '34%',
          paddingLeft: MARGIN,
          paddingRight: MARGIN,
          fontFamily: WORD,
          fontWeight: 700,
          fontSize: pt(size),
          lineHeight: 1.24,
          letterSpacing: '-0.01em',
          color: page.chant ? RED : INK,
        }}
      >
        {lines.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </p>

      <Folio n={page.number} />
    </Page>
  );
}

/**
 * A chant line, broken the way the printed page breaks it: "Sat! Sat! Sat!"
 * prints as "Sat! Sat!" over "Sat!". Three repeats or fewer stay on one line
 * only when they fit, which the size band already decides — so the break is
 * simply "all but the last, then the last".
 */
function chantLines(sentence: string): string[] {
  const parts = sentence.trim().split(/\s+/u);
  if (parts.length < 3) return [sentence.trim()];
  return [parts.slice(0, -1).join(' '), parts[parts.length - 1]];
}

function ArtPage({ page }: { page: Extract<ShelfPage, { kind: 'art' }> }) {
  return (
    <Page>
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: '5.39%', // 8mm
          right: '5.39%',
          top: '6.67%', // 14mm
          bottom: '8.57%', // 14mm, less the 4mm the picture is nudged up
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static public art, no known intrinsic size */}
        <img src={page.art} alt="" className="h-full w-full object-contain" />
      </div>
      <Folio n={page.number} />
    </Page>
  );
}

/* -------------------------------------------------------------------------- */
/* Front and back matter                                                       */
/* -------------------------------------------------------------------------- */

function HalfTitle({ title }: { title: string }) {
  return (
    <Page>
      <span
        className="absolute inset-x-0 text-center"
        style={{
          top: '35%',
          paddingLeft: MARGIN,
          paddingRight: MARGIN,
          fontFamily: SERIF,
          fontWeight: 500,
          fontSize: pt(17),
          color: INK,
        }}
      >
        {title}
      </span>
      <Dot bottom="57%" />
    </Page>
  );
}

/** The section head every word/filler page hangs off: `filler_head()`. */
function Head({ label, note }: { label: string; note?: string }) {
  return (
    <div
      className="absolute inset-x-0 text-center"
      style={{ top: '14.29%', paddingLeft: MARGIN, paddingRight: MARGIN }}
    >
      <Tracked
        text={label.split('').join(' ')}
        size={8}
        tracking={0.3}
        color={INK}
      />
      {note ? (
        <p
          style={{
            marginTop: pt(11),
            fontFamily: NAR,
            fontStyle: 'italic',
            fontSize: pt(9.5),
            color: SOFT_GREY,
          }}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The word list capitalises only the FIRST word ("Sat · at"), exactly as
 * books_def.py authors it: the child is being shown the word as the book
 * prints it, and only the book's own opening word wears a capital.
 */
function joinWords(words: string[]): string {
  return words
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join('  ·  ');
}

function WordsPage({ page }: { page: Extract<ShelfPage, { kind: 'words' }> }) {
  return (
    <Page>
      <Head label="WORDS IN THIS BOOK" />
      <div
        className="absolute inset-x-0 text-center"
        style={{ top: '26%', paddingLeft: MARGIN, paddingRight: MARGIN }}
      >
        {page.newWords.length ? (
          <>
            <span
              className="block"
              style={{
                fontFamily: LABEL,
                fontWeight: 700,
                fontSize: pt(8),
                color: RED,
              }}
            >
              NEW
            </span>
            <span
              className="block"
              style={{
                marginTop: pt(12),
                fontFamily: WORD,
                fontWeight: 700,
                fontSize: pt(27),
                color: INK,
              }}
            >
              {joinWords(page.newWords)}
            </span>
          </>
        ) : null}
        {page.reviewWords.length ? (
          <>
            <span
              className="block"
              style={{
                marginTop: pt(34),
                fontFamily: LABEL,
                fontWeight: 700,
                fontSize: pt(8),
                color: INK,
              }}
            >
              REVIEW
            </span>
            <span
              className="block"
              style={{
                marginTop: pt(10),
                fontFamily: WORD,
                fontSize: pt(19),
                color: INK,
              }}
            >
              {page.reviewWords.join('  ·  ')}
            </span>
          </>
        ) : null}
      </div>
      <p
        className="absolute inset-x-0 text-center"
        style={{
          bottom: '7.6%',
          paddingLeft: MARGIN,
          paddingRight: MARGIN,
          fontFamily: LABEL,
          fontSize: pt(7.5),
          color: INK,
        }}
      >
        {page.note}
      </p>
    </Page>
  );
}

/** The three-rule writing row of the MY WORDS page. */
function WritingRow() {
  return (
    <span className="relative block" style={{ height: pt(30) }}>
      <span
        className="absolute inset-x-0 top-0 block"
        style={{ borderTop: `${pt(0.5)} dotted ${HAIR_GREY}` }}
      />
      <span
        className="absolute inset-x-0 block"
        style={{ top: '50%', borderTop: `${pt(0.5)} dotted ${HAIR_GREY}` }}
      />
      <span
        className="absolute inset-x-0 bottom-0 block"
        style={{ borderTop: `${pt(0.6)} solid ${RULE_GREY}` }}
      />
    </span>
  );
}

function MyWordsPage({ page }: { page: Extract<ShelfPage, { kind: 'my-words' }> }) {
  return (
    <Page>
      <Head label="MY WORDS" note="Say the word. Then write it on the line." />
      <div
        className="absolute"
        style={{ left: MARGIN, right: MARGIN, top: '26%' }}
      >
        {page.words.slice(0, 6).map((word, i) => (
          <span
            key={i}
            className="mb-[6%] flex items-end gap-[4%]"
            style={{ width: '100%' }}
          >
            <span
              style={{
                fontFamily: WORD,
                fontSize: pt(19),
                color: SOFT_GREY,
                minWidth: '18%',
              }}
            >
              {i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word}
            </span>
            <span className="flex-1">
              <WritingRow />
            </span>
          </span>
        ))}
      </div>
      <Dot bottom="4.29%" />
    </Page>
  );
}

function MyPicturePage({
  page,
}: {
  page: Extract<ShelfPage, { kind: 'my-picture' }>;
}) {
  return (
    <Page>
      <Head label="MY PICTURE" note={page.instruction} />
      <span
        className="absolute block"
        style={{
          left: MARGIN,
          right: MARGIN,
          top: '26%',
          bottom: '12%',
          border: `${pt(0.6)} solid ${RULE_GREY}`,
        }}
      />
      <Dot bottom="4.29%" />
    </Page>
  );
}

function ICanReadPage({
  page,
}: {
  page: Extract<ShelfPage, { kind: 'i-can-read' }>;
}) {
  return (
    <Page>
      <Head label="I CAN READ" note="Tick each line you can read on your own." />
      <div
        className="absolute"
        style={{ left: '14%', right: MARGIN, top: '26%' }}
      >
        {page.lines.map((line, i) => (
          <span key={i} className="mb-[4.4%] flex items-center gap-[4%]">
            <span
              className="block flex-none rounded-full"
              style={{
                width: pt(9),
                height: pt(9),
                border: `${pt(0.6)} solid ${RULE_GREY}`,
              }}
            />
            <span style={{ lineHeight: 1.1 }}>
              {line.lead ? (
                <span
                  style={{
                    fontFamily: NAR,
                    fontStyle: 'italic',
                    fontSize: pt(12),
                    color: INK,
                  }}
                >
                  {line.lead}{' '}
                </span>
              ) : null}
              <span
                style={{
                  fontFamily: WORD,
                  fontWeight: 700,
                  fontSize: pt(12),
                  color: INK,
                }}
              >
                {line.shout}
              </span>
            </span>
          </span>
        ))}
      </div>
      <Dot bottom="4.29%" />
    </Page>
  );
}

function BackCover({ page }: { page: Extract<ShelfPage, { kind: 'back' }> }) {
  return (
    <Page>
      <div
        className="absolute inset-x-0 text-center"
        style={{ top: '40%', paddingLeft: MARGIN, paddingRight: MARGIN }}
      >
        <Tracked
          text={MASTHEAD.split('').join(' ')}
          size={9}
          tracking={0.3}
          color={INK}
        />
        <p
          style={{
            marginTop: pt(14),
            fontFamily: NAR,
            fontStyle: 'italic',
            fontSize: pt(11),
            color: INK,
          }}
        >
          decodable readers
        </p>
        <p
          style={{
            marginTop: pt(12),
            fontFamily: LABEL,
            fontSize: pt(8),
            color: INK,
          }}
        >
          {page.booknum}
        </p>
      </div>
      <p
        className="absolute inset-x-0 text-center"
        style={{
          bottom: '8.57%',
          paddingLeft: MARGIN,
          paddingRight: MARGIN,
          fontFamily: NAR,
          fontStyle: 'italic',
          fontSize: pt(9.5),
          color: INK,
        }}
      >
        {BACK_STRAPLINE}
      </p>
      <p
        className="absolute inset-x-0 text-center"
        style={{
          bottom: '5.24%',
          fontFamily: LABEL,
          fontSize: pt(7.5),
          color: INK,
        }}
      >
        {BACK_FOOTER}
      </p>
    </Page>
  );
}

/* -------------------------------------------------------------------------- */

export default function BookPageFace({ page }: { page: ShelfPage }) {
  switch (page.kind) {
    case 'cover':
      return <Cover page={page} />;
    case 'blank':
      return <Page />;
    case 'half-title':
      return <HalfTitle title={page.title} />;
    case 'text':
      return <TextPage page={page} />;
    case 'art':
      return <ArtPage page={page} />;
    case 'words':
      return <WordsPage page={page} />;
    case 'my-words':
      return <MyWordsPage page={page} />;
    case 'my-picture':
      return <MyPicturePage page={page} />;
    case 'i-can-read':
      return <ICanReadPage page={page} />;
    case 'back':
      return <BackCover page={page} />;
  }
}
