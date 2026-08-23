// lib/montree/paper-scan/layouts/montree-standard-v1.ts
//
// Built-in layout profile for the Montree Standard Observation Sheet v1
// (template code MT-STD-1), the sheet rendered by ../sheet-template.ts.
// Hand-written, not learned: this is the ground truth the extractor is told
// about when a scanned page carries the MT-STD-1 code (or when the classroom
// has no learned profile and the page matches). Keep it in sync with the
// template — every column, mark and legend line below exists on the paper.

import type { SheetLayoutProfile } from '../layout-types';
import { SHEET_TEMPLATE_CODE } from '../sheet-template';

export const MONTREE_STANDARD_V1_NAME = 'Montree Standard v1';

export const MONTREE_STANDARD_V1: SheetLayoutProfile = {
  schema_version: 1,
  sheet_name: MONTREE_STANDARD_V1_NAME,
  orientation: 'landscape',
  language: ['en', 'zh'],
  unit: 'class_per_day',
  header: {
    fields: [
      { label: 'School 学校', meaning: 'other', position: 'top header row, first underlined field after the Montree wordmark' },
      { label: 'Class 班级', meaning: 'class', position: 'top header row, second underlined field' },
      { label: 'Teacher 教师', meaning: 'teacher', position: 'top header row, third underlined field' },
      { label: 'Date 日期', meaning: 'date', position: 'top header row, fourth underlined field; printed as "Fri 2026-09-05" (weekday + ISO date)' },
      { label: 'MT-STD-1 … page n/N', meaning: 'other', position: 'top-right beside the QR code: template code, then "<date> · <page>/<pages>", then "page n/N"' },
    ],
  },
  structure: {
    kind: 'grid',
    child_locator:
      'One row per child. The child number (01, 02, …) is pre-printed in the first column "#" and the child name is pre-printed in bold in the second column "Child 孩子". Children are in classroom order and continue across pages (page 2 starts where page 1 ended).',
    columns: [
      { header_verbatim: '#', meaning: 'other' },
      { header_verbatim: 'Child 孩子', meaning: 'other' },
      { header_verbatim: 'Practical Life 日常生活 PL', meaning: 'area', area_key: 'practical_life' },
      { header_verbatim: 'Sensorial 感官 S', meaning: 'area', area_key: 'sensorial' },
      { header_verbatim: 'Mathematics 数学 M', meaning: 'area', area_key: 'mathematics' },
      { header_verbatim: 'Language 语言 L', meaning: 'area', area_key: 'language' },
      { header_verbatim: 'Cultural 文化 C', meaning: 'area', area_key: 'cultural' },
      { header_verbatim: 'Note 备注', meaning: 'note' },
    ],
    rows_per_child: 1,
    work_locator:
      'Inside each of the five area cells there are 2 or 3 work lines (the printed sheet uses 1 or 2 pre-printed works plus always one blank line). Each work line reads left to right: a hollow right-pointing triangle ▷, the work name (pre-printed text, or a blank underline the teacher handwrites on), and a rectangular tally box at the right edge of the cell. Below the work lines is one row of three circles labelled "<15", "15–30", "30+" — the time bucket for that area for that child today. The area of a work is the column it sits in; never infer area from the work name.',
  },
  legend: {
    status_marks: [
      { mark: '▷ with ONE side drawn over (a single pencil stroke along one edge of the triangle)', status: 'presented' },
      { mark: '▷ with TWO sides drawn over (two edges thickened, forming a V or an L)', status: 'practicing' },
      { mark: '▷ filled in solid', status: 'mastered' },
    ],
    time_marks: [
      { mark: 'filled circle beside "<15" under the area cell', time_bucket: 'short', minutes: 10 },
      { mark: 'filled circle beside "15–30" under the area cell', time_bucket: 'medium', minutes: 22 },
      { mark: 'filled circle beside "30+" under the area cell', time_bucket: 'long', minutes: 40 },
    ],
    tally_convention:
      'Each pencil stroke inside the rectangular tally box to the right of a work name = one time the child chose that work today. Count strokes (a crossed group of five = 5). An empty box with a marked triangle means the work was marked but not tallied: frequency = null, not 0.',
    concentration_codes: [
      { code: 'filled circle beside "wd" in the Note column', value: 'wd' },
      { code: 'filled circle beside "WC" in the Note column', value: 'wc' },
      { code: 'filled circle beside "DC" in the Note column', value: 'dc' },
    ],
    area_abbreviations: {
      PL: 'practical_life',
      S: 'sensorial',
      M: 'mathematics',
      L: 'language',
      C: 'cultural',
    },
    other_symbols: [
      { mark: 'Solid black 8 mm squares in the four page corners', meaning: 'fiducials for alignment — ignore' },
      { mark: 'QR code top-right + printed text "MT-STD-1|<classroom_id>|<date>|<page>/<pages>"', meaning: 'template code; report it as detected_template_code' },
      { mark: 'Coloured square chips in the column headers (green, orange, blue, pink, purple)', meaning: 'area colour for the teacher — carry no data' },
      { mark: 'Boxed "Class notes 班级备注" strip under the grid', meaning: 'free text about the whole class (absences, events) → general_note, NOT a child entry' },
    ],
  },
  machine_marks: { fiducials: true, qr: true, template_code: SHEET_TEMPLATE_CODE },
  reading_instructions: [
    'Read the header first and report the printed template code, date and page n/N.',
    'Walk the grid row by row; the child for every mark in a row is the pre-printed name in the second column of that same row — never a name written elsewhere.',
    'Within a row, walk the five area cells left to right; the area of every work is fixed by the column header.',
    'For each work line, record an entry only if the triangle is marked, the tally box has strokes, or the blank underline has handwriting. An untouched pre-printed line is not an entry.',
    'Decode the triangle into status: one side = presented, two sides = practicing, filled = mastered. If the triangle is untouched but the tally box has strokes, status is null and proposed_status should be the child\'s current status.',
    'Count tally strokes into frequency; null if the box is empty.',
    'Map the filled time circle under the area cell to time_bucket for every entry in that cell; null if none is filled. Do not write minutes unless the teacher wrote a number.',
    'Map the filled wd / WC / DC circle in the Note column to concentration for every entry in that row.',
    'Handwriting on a blank underline is a work name: transcribe it verbatim, then match it to the classroom curriculum within the same area.',
    'Text on the lines in the Note column is a child note; text in the Class notes strip is a general note.',
    'Ignore the corner squares, the QR code and the colour chips.',
  ].join(' '),
  pitfalls: [
    'Pre-printed work names are NOT evidence the child did the work — only marks are.',
    'A ▷ with one heavy stroke can look filled in a low-resolution photo; zoom before deciding mastered vs presented.',
    'The "15–30" label contains digits; do not read the printed bucket labels as tally counts.',
    'Chinese characters in the headers and legend are translations, not handwriting.',
    'Rows continue on the next page with the same numbering; a child missing from page 1 is usually on page 2, not absent.',
    'Names may be English or Chinese; match on the pre-printed text exactly, do not transliterate.',
  ],
};
