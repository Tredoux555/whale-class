// lib/montree/paper-scan/sheet-template.ts
//
// Montree Standard Observation Sheet v1 — pure HTML renderer.
//
// One A4 LANDSCAPE sheet per classroom per day: one row per child, five
// area-coloured column groups, each pre-printed with the child's current works
// (practicing, else most recently presented) plus one blank slot, a tally box
// per work, a time-bucket trio (<15 / 15–30 / 30+ min) per area, one
// concentration trio (wd/WC/DC) per child in the Note column, and free-text
// lines per child. (The plan sketched the concentration trio per area; with
// five areas × 40 mm columns that did not fit at ≥8pt, and AMI concentration
// is observed per child per work cycle anyway — so it lives once per row.)
//
// Designed for two readers at once: a teacher with a pencil (big boxes, no
// font under 8pt, bilingual legend) and Sonnet vision (pure black grid, corner
// fiducials, printed template code + QR, tints only in headers so contrast
// normalisation cannot eat a mark).
//
// This file is a pure function of its input — no DB, no network — so it can
// be unit-tested and rendered outside the app. The route that calls it
// (app/api/montree/paper-scan/sheet/print/route.ts) does the reads and the QR.
// The matching machine description of this layout lives in
// lib/montree/paper-scan/layouts/montree-standard-v1.ts; keep the two in sync.

import type { PaperScanArea } from './types';

export const SHEET_TEMPLATE_CODE = 'MT-STD-1';

export const SHEET_AREAS: readonly PaperScanArea[] = [
  'practical_life',
  'sensorial',
  'mathematics',
  'language',
  'cultural',
] as const;

/** Area labels (English + Chinese) and print colours. Colours mirror
 *  AREA_COLORS in lib/montree/types/curriculum.ts (keyed `math` there). */
export const SHEET_AREA_META: Record<PaperScanArea, { en: string; zh: string; abbr: string; color: string; tint: string }> = {
  practical_life: { en: 'Practical Life', zh: '日常生活', abbr: 'PL', color: '#22c55e', tint: '#eefbf2' },
  sensorial:      { en: 'Sensorial',      zh: '感官',     abbr: 'S',  color: '#f97316', tint: '#fff4ec' },
  mathematics:    { en: 'Mathematics',    zh: '数学',     abbr: 'M',  color: '#3b82f6', tint: '#eef4ff' },
  language:       { en: 'Language',       zh: '语言',     abbr: 'L',  color: '#ec4899', tint: '#fdeef5' },
  cultural:       { en: 'Cultural',       zh: '文化',     abbr: 'C',  color: '#8b5cf6', tint: '#f3efff' },
};

export interface SheetWork {
  work_name: string;
  work_key?: string | null;
  status: 'practicing' | 'presented';
}

export interface SheetChildInput {
  id: string;
  name: string;
  /** Current works per area; the template prints the first `works_per_area`. */
  works: Partial<Record<PaperScanArea, SheetWork[]>>;
}

export interface SheetPageInput {
  /** Printed + QR-encoded code for this page, e.g. MT-STD-1|<classroom>|2026-09-05|1/2 */
  code: string;
  /** SVG data URI for the QR of `code`; omitted = text code only. */
  qr_data_uri?: string | null;
  children: SheetChildInput[];
  /** 1-based index of the first child on this page (for the # column). */
  first_index: number;
}

export interface StandardSheetInput {
  school_name: string;
  classroom_name: string;
  teacher_name: string;
  /** YYYY-MM-DD */
  date: string;
  works_per_area: 1 | 2;
  pages: SheetPageInput[];
}

/** Children per page for a given works-per-area setting (row height budget:
 *  3 work lines × 5 mm + one bubble line 4.8 mm ≈ 20 mm at 2 works → 7 rows;
 *  2 × 4.8 mm + 4.2 mm ≈ 13.8 mm at 1 work → 10 rows; ~150 mm usable per page). */
export function rowsPerPage(worksPerArea: 1 | 2): number {
  return worksPerArea === 2 ? 7 : 10;
}

export function sheetPageCode(classroomId: string, date: string, page: number, pages: number): string {
  return `${SHEET_TEMPLATE_CODE}|${classroomId}|${date}|${page}/${pages}`;
}

/** Split a (pre-sorted) roster into pages. Returns [] for an empty roster. */
export function paginateChildren<T>(children: T[], worksPerArea: 1 | 2): T[][] {
  const per = rowsPerPage(worksPerArea);
  const out: T[][] = [];
  for (let i = 0; i < children.length; i += per) out.push(children.slice(i, i + per));
  return out;
}

export function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Weekday + ISO date, e.g. "Fri 2026-09-05". Pure (UTC) so tests are stable. */
export function formatSheetDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
  return `${wd} ${date}`;
}

// ───────────────────────────── CSS ─────────────────────────────

const CSS = `
@page { size: A4 landscape; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; color: #111; font-size: 8pt; line-height: 1.15; }
* { box-sizing: border-box; }
.page { position: relative; width: 297mm; height: 210mm; overflow: hidden; page-break-after: always; break-after: page; background: #fff; }
.page:last-child { page-break-after: auto; break-after: auto; }
.fid { position: absolute; width: 8mm; height: 8mm; background: #000; }
.fid.tl { top: 6mm; left: 6mm; } .fid.tr { top: 6mm; right: 6mm; }
.fid.bl { bottom: 6mm; left: 6mm; } .fid.br { bottom: 6mm; right: 6mm; }
.frame { position: absolute; top: 6mm; left: 16mm; width: 265mm; height: 198mm; display: flex; flex-direction: column; }
.head { flex: 0 0 18mm; display: flex; align-items: stretch; border-bottom: 1.2pt solid #000; padding-bottom: 1.5mm; }
.head .brand { flex: 0 0 58mm; }
.head .wordmark { font-size: 14pt; font-weight: 700; letter-spacing: -0.02em; line-height: 1; }
.head .wordmark span { font-weight: 400; color: #444; }
.head .title { font-size: 8pt; margin-top: 1.4mm; color: #222; }
.head .meta { flex: 1 1 auto; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 2mm 3mm; align-content: center; padding: 0 3mm; }
.head .meta .f { border-bottom: 0.6pt solid #000; padding: 0 0 0.8mm 0; min-height: 8mm; }
.head .meta .f .l { font-size: 8pt; color: #555; display: block; }
.head .meta .f .v { font-size: 11pt; font-weight: 700; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.head .code { flex: 0 0 auto; display: flex; align-items: center; gap: 2mm; }
.head .code .txt { font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace; font-size: 8pt; text-align: right; line-height: 1.3; }
.head .code .txt b { font-size: 10pt; display: block; }
.head .code .qr { width: 16.5mm; height: 16.5mm; display: block; }
.head .code .qr.ph { border: 0.6pt dashed #777; }
table.grid { flex: 0 0 auto; width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 1.5mm; }
table.grid th, table.grid td { border: 0.7pt solid #000; padding: 0; vertical-align: top; }
table.grid th { height: 7.5mm; font-weight: 700; text-align: left; padding: 0.8mm 1.2mm; }
table.grid th .zh { font-weight: 400; color: #333; margin-left: 1mm; }
table.grid th.area { position: relative; }
table.grid th.area .chip { display: inline-block; width: 3.2mm; height: 3.2mm; vertical-align: -0.4mm; margin-right: 1.2mm; border: 0.5pt solid #000; }
table.grid th .ab { float: right; font-size: 9pt; font-weight: 700; }
td.num { text-align: center; font-size: 10pt; font-weight: 700; padding-top: 1.5mm; }
td.name { padding: 1.2mm 1.2mm; font-size: 10.5pt; font-weight: 700; overflow: hidden; word-break: break-word; }
td.cell { padding: 0.6mm 0.8mm 0.4mm 0.8mm; }
.w { display: flex; align-items: center; height: 5mm; gap: 0.9mm; }
.one .w { height: 4.8mm; }
.w .tri { flex: 0 0 4.2mm; width: 4.2mm; height: 4.2mm; }
.w .nm { flex: 1 1 auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 8pt; line-height: 1; }
.w .nm.blank { border-bottom: 0.6pt solid #000; height: 4.4mm; }
.w .tally { flex: 0 0 12mm; height: 4.6mm; border: 0.7pt solid #000; border-radius: 0.5mm; display: flex; align-items: center; justify-content: flex-start; padding-left: 0.6mm; color: #999; font-size: 8pt; letter-spacing: 0.2mm; }
.bub { display: flex; align-items: center; height: 4.8mm; gap: 0.7mm; margin-top: 0.2mm; }
.one .bub { height: 4.2mm; }
.bub .o { display: inline-block; width: 3.6mm; height: 3.6mm; border: 0.75pt solid #000; border-radius: 50%; flex: 0 0 3.6mm; }
.bub .t { font-size: 8pt; line-height: 1; margin-right: 1.6mm; white-space: nowrap; }
td.note { padding: 0.8mm 1.2mm; }
td.note .ln { border-bottom: 0.6pt solid #000; height: 5.6mm; }
td.note .bub { margin-top: 0; }
.notes { flex: 0 0 9mm; margin-top: 1.2mm; border: 0.7pt solid #000; padding: 0.8mm 1.5mm; display: flex; flex-direction: column; }
.notes .l { font-size: 8pt; font-weight: 700; }
.notes .ln { flex: 1 1 auto; border-bottom: 0.6pt solid #000; }
.legend { flex: 0 0 auto; margin-top: 1.2mm; padding-top: 1mm; border-top: 1.2pt solid #000; display: flex; flex-wrap: wrap; gap: 1mm 5mm; font-size: 8pt; align-items: center; }
.legend .k { display: inline-flex; align-items: center; gap: 1mm; white-space: nowrap; }
.legend .k svg { width: 4mm; height: 4mm; }
.legend .k .chip { display: inline-block; width: 3.2mm; height: 3.2mm; border: 0.5pt solid #000; }
.legend .k .o { display: inline-block; width: 3.2mm; height: 3.2mm; border: 0.75pt solid #000; border-radius: 50%; }
.legend .k .box { display: inline-block; width: 9mm; height: 3.6mm; border: 0.7pt solid #000; border-radius: 0.5mm; color: #999; font-size: 7.5pt; line-height: 3.4mm; padding-left: 0.5mm; }
.legend .zh { color: #333; }
.foot { flex: 0 0 auto; margin-top: 0.8mm; display: flex; justify-content: space-between; font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace; font-size: 8pt; color: #222; }
@media screen { body { background: #888; } .page { margin: 8mm auto; box-shadow: 0 2px 12px rgba(0,0,0,.4); } }
`;

// ─────────────────────────── fragments ───────────────────────────

/** Hollow triangle pointing right. Teacher marks 1 side / 2 sides / fills it. */
function triangle(): string {
  return `<svg class="tri" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.2 1 L9 5 L1.2 9 Z" fill="none" stroke="#000" stroke-width="1.1" stroke-linejoin="round"/></svg>`;
}

function tallyBox(): string {
  return `<span class="tally">&nbsp;</span>`;
}

function workLine(work: SheetWork | null): string {
  const name = work ? `<span class="nm" title="${escapeHtml(work.work_name)}">${escapeHtml(work.work_name)}</span>` : `<span class="nm blank"></span>`;
  return `<div class="w">${triangle()}${name}${tallyBox()}</div>`;
}

function bubble(label: string): string {
  return `<span class="o"></span><span class="t">${label}</span>`;
}

/** Time-bucket trio for one area: <15 / 15–30 / 30+ minutes. */
function timeBubbles(): string {
  return `<div class="bub">${bubble('&lt;15')}${bubble('15–30')}${bubble('30+')}</div>`;
}

/** Concentration trio for the child (one per row, in the Note column). */
function focusBubbles(): string {
  return `<div class="bub">${bubble('wd')}${bubble('WC')}${bubble('DC')}</div>`;
}

function areaCell(works: SheetWork[] | undefined, perArea: 1 | 2): string {
  const list = (works ?? []).slice(0, perArea);
  const lines: string[] = [];
  for (let i = 0; i < perArea; i++) lines.push(workLine(list[i] ?? null));
  lines.push(workLine(null)); // blank slot
  return `<td class="cell">${lines.join('')}${timeBubbles()}</td>`;
}

function childRow(child: SheetChildInput, index: number, perArea: 1 | 2): string {
  const cells = SHEET_AREAS.map((a) => areaCell(child.works[a], perArea)).join('');
  return `<tr>
<td class="num">${String(index).padStart(2, '0')}</td>
<td class="name">${escapeHtml(child.name)}</td>
${cells}
<td class="note">${focusBubbles()}<div class="ln"></div>${perArea === 2 ? '<div class="ln"></div>' : ''}</td>
</tr>`;
}

function gridHeader(): string {
  const areas = SHEET_AREAS.map((a) => {
    const m = SHEET_AREA_META[a];
    return `<th class="area" style="background:${m.tint}"><span class="chip" style="background:${m.color}"></span>${m.en}<span class="zh">${m.zh}</span><span class="ab">${m.abbr}</span></th>`;
  }).join('');
  return `<colgroup><col style="width:8mm"><col style="width:24mm"><col style="width:39.8mm"><col style="width:39.8mm"><col style="width:39.8mm"><col style="width:39.8mm"><col style="width:39.8mm"><col style="width:34mm"></colgroup>
<thead><tr><th>#</th><th>Child<span class="zh">孩子</span></th>${areas}<th>Note<span class="zh">备注</span></th></tr></thead>`;
}

function legend(): string {
  const tri = (variant: 'p' | 'pr' | 'm') => {
    const side1 = `<path d="M1.2 1 L9 5" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>`;
    const side2 = `<path d="M1.2 1 L9 5 L1.2 9" fill="none" stroke="#000" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
    const fill = `<path d="M1.2 1 L9 5 L1.2 9 Z" fill="#000"/>`;
    const base = `<path d="M1.2 1 L9 5 L1.2 9 Z" fill="none" stroke="#000" stroke-width="1.1" stroke-linejoin="round"/>`;
    return `<svg viewBox="0 0 10 10" aria-hidden="true">${base}${variant === 'p' ? side1 : variant === 'pr' ? side2 : fill}</svg>`;
  };
  const chips = SHEET_AREAS.map((a) => {
    const m = SHEET_AREA_META[a];
    return `<span class="k"><span class="chip" style="background:${m.color}"></span>${m.abbr} ${m.en} <span class="zh">${m.zh}</span></span>`;
  }).join('');
  return `<div class="legend">
<span class="k"><b>Status 状态:</b></span>
<span class="k">${tri('p')} 1 side = presented <span class="zh">已示范</span></span>
<span class="k">${tri('pr')} 2 sides = practicing <span class="zh">练习中</span></span>
<span class="k">${tri('m')} filled = mastered <span class="zh">已掌握</span></span>
<span class="k"><span class="box">| | |</span> tally: one stroke per time worked today <span class="zh">今日次数，每次一划</span></span>
<span class="k"><b>Time 时长:</b> <span class="o"></span> fill one per area — minutes today &lt;15 / 15–30 / 30+ <span class="zh">每区域涂一个：今日分钟数</span></span>
<span class="k"><b>Focus 专注:</b> <span class="o"></span> wd distracted <span class="zh">分心</span> · WC concentrated <span class="zh">专注</span> · DC deep <span class="zh">深度专注</span></span>
<span class="k"><b>Areas 区域:</b></span>${chips}
<span class="k">Blank line = handwrite an extra work <span class="zh">空行可手写其他工作</span></span>
</div>`;
}

function pageHtml(input: StandardSheetInput, page: SheetPageInput, pageNo: number, pages: number): string {
  const rows = page.children.map((c, i) => childRow(c, page.first_index + i, input.works_per_area)).join('');
  const qr = page.qr_data_uri
    ? `<img class="qr" src="${page.qr_data_uri}" alt="">`
    : `<span class="qr ph"></span>`;
  return `<section class="page ${input.works_per_area === 1 ? 'one' : 'two'}">
<div class="fid tl"></div><div class="fid tr"></div><div class="fid bl"></div><div class="fid br"></div>
<div class="frame">
<div class="head">
  <div class="brand"><div class="wordmark">Montree<span> · Record Sheet</span></div><div class="title">Daily observation sheet <span class="zh">每日观察记录表</span></div></div>
  <div class="meta">
    <div class="f"><span class="l">School 学校</span><span class="v">${escapeHtml(input.school_name)}</span></div>
    <div class="f"><span class="l">Class 班级</span><span class="v">${escapeHtml(input.classroom_name)}</span></div>
    <div class="f"><span class="l">Teacher 教师</span><span class="v">${escapeHtml(input.teacher_name)}</span></div>
    <div class="f"><span class="l">Date 日期</span><span class="v">${escapeHtml(formatSheetDate(input.date))}</span></div>
  </div>
  <div class="code"><div class="txt"><b>${escapeHtml(SHEET_TEMPLATE_CODE)}</b>${escapeHtml(page.code.split('|').slice(2).join(' · '))}<br>page ${pageNo}/${pages}</div>${qr}</div>
</div>
<table class="grid">${gridHeader()}<tbody>${rows}</tbody></table>
<div class="notes"><span class="l">Class notes 班级备注 (absent, events, materials) </span><div class="ln"></div></div>
${legend()}
<div class="foot"><span>${escapeHtml(page.code)}</span><span>${escapeHtml(input.classroom_name)} · ${escapeHtml(input.date)} · page ${pageNo}/${pages}</span></div>
</div>
</section>`;
}

export interface RenderOptions {
  /** Inject `window.print()` on load (default true). Off for tests/previews. */
  autoPrint?: boolean;
}

/** Render the full printable document (all pages). */
export function renderStandardSheetHtml(input: StandardSheetInput, opts: RenderOptions = {}): string {
  const pages = input.pages.length;
  const body = pages === 0
    ? pageHtml(input, { code: sheetPageCode('', input.date, 1, 1), children: [], first_index: 1 }, 1, 1)
    : input.pages.map((p, i) => pageHtml(input, p, i + 1, pages)).join('\n');
  const autoPrint = opts.autoPrint !== false
    ? `<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},250);});</script>`
    : '';
  const title = `Montree Record Sheet – ${input.classroom_name} – ${input.date}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body>
${body}
${autoPrint}
</body>
</html>`;
}
