/**
 * Montree Milestones — paper pack HTML generator.
 *
 * Emits one self-contained HTML document per (ageBand × form) plus the reprint set:
 *
 *   pack_A3_A.html … pack_A5_B.html     full packs
 *   scoring_sheets_only.html            the sheets that get written on, all six combos
 *
 * Every document is split into "units" (`<section class="unit">`) carrying the running
 * header text and page chrome mode as data attributes. `render.mjs` prints one unit at a
 * time so each section gets its own `N OF M` numbering, then concatenates the result.
 * Inside a unit the layout is ordinary flow — CSS paginates it, nothing is hand-placed.
 *
 * Usage:  node build-paper-packs.mjs [outDir]
 *         MONTREE_ITEM_BANK=/path/to/item-bank.json node build-paper-packs.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  loadBank,
  buildPackView,
  AGE_BANDS,
  FORM_CODES,
  DEFAULT_BANK_PATH,
} from './lib-bank.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAPER_DIR = resolve(HERE, '..');

/* ------------------------------------------------------------------ helpers */

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Attribute-safe, for the running-header data attributes. */
const attr = (s) => esc(s);

const upper = (s) => String(s ?? '').toUpperCase();

/** Space out a short label the way the printed eyebrows do. */
const eyebrow = (text) => `<p class="eyebrow">${esc(text)}</p>`;

const svgArt = (stim, cls = 'art') => {
  if (!stim?.render?.svg) return '<div class="art art--missing"></div>';
  return (
    `<svg class="${cls}" viewBox="${attr(stim.render.viewBox || '0 0 100 100')}" ` +
    `role="img" aria-label="${attr(stim.altText?.en ?? stim.label?.en ?? '')}">` +
    stim.render.svg +
    `</svg>`
  );
};

/* ------------------------------------------------------------------ units */

/**
 * A unit is one run of pages sharing a running header.
 *   kind: 'cover' | 'divider' | 'teacher' | 'child'
 *   hdr : right-hand running-header text (before the ` · N OF M` suffix)
 *   numbered: append ` · N OF M`
 */
function unit({ kind, hdr = '', hdrLeft = '', numbered = false, html }) {
  return (
    `<section class="unit unit--${kind}" data-kind="${attr(kind)}" ` +
    `data-hdr="${attr(hdr)}" data-hdr-left="${attr(hdrLeft)}" ` +
    `data-numbered="${numbered ? '1' : '0'}">${html}</section>`
  );
}

const runningLeft = (v) =>
  `MONTREE MILESTONES · ${upper(v.bandMeta.label)} (${v.ageBand}) · FORM ${v.formCode}`;

/* ------------------------------------------------------------------ cover */

const LOGO = `<div class="logo" aria-label="Montree"><span>M</span></div>`;

function coverUnit(v) {
  const modNames = v.modules.map((m) => m.name).join(', ');
  const stamp =
    `Item bank ${esc(v.bankVersion)} · ${esc(v.bankChecksum)}`;
  const field = (label) => `<div class="field"><span class="flabel">${esc(label)}</span><span class="fline"></span></div>`;
  return unit({
    kind: 'cover',
    html: `
<div class="cover">
  <div class="cover__top">
    ${LOGO}
    <p class="cover__eyebrow">Paper pack · one-to-one check-in</p>
    <h1 class="cover__title">Montree<br>Milestones</h1>
    <p class="cover__lede">A developmental check-in for a Montessori classroom. Three times a
      year, about fifteen minutes, one adult and one child, in a quiet place. For the child it is
      simply Discovery&nbsp;Time: looking at pictures and talking with a grown-up they know.</p>
    <p class="cover__chip">${esc(v.bandMeta.label)} · ${esc(v.ageBand)} · ${esc(v.bandMeta.range)}</p>
    <p class="cover__blurb">Form ${esc(v.formCode)} — the paper pack for ${esc(v.formMeta.window)}.
      Three modules: ${esc(modNames)}. ${v.counts.scoredItems} items in the sitting plus
      ${v.counts.practiceItems} practice items, ${v.counts.observationRecords} observation records
      rated across the whole window, and count-only summary tables.</p>
  </div>
  <div class="cover__fields">
    ${field('Child')}${field('Date of birth · age in months')}
    ${field('Classroom')}${field('Adult sitting with the child')}
    ${field('Check-in window (Autumn / Winter / Spring)')}${field('Date(s) — a profile may be built over several days')}
  </div>
  <div class="cover__foot">
    <p class="stamp">${stamp}</p>
    <p class="attr">${esc(v.attribution.note)} ${esc(v.attribution.eyfs)}; ${esc(v.attribution.elof)}.</p>
  </div>
</div>`,
  });
}

/* ------------------------------------------------------------------ divider */

function dividerUnit(v, { hdr, section, title, lede, extra = '' }) {
  return unit({
    kind: 'divider',
    hdr,
    hdrLeft: runningLeft(v),
    html: `
<div class="divider">
  <p class="divider__num">Section ${esc(section)}</p>
  <h1 class="divider__title">${esc(title)}</h1>
  <p class="divider__lede">${lede}</p>
  ${extra}
</div>`,
  });
}

/* ------------------------------------------------------------------ guide */

function guideUnit(v) {
  const mods = v.modules;
  const modRows = mods
    .map(
      (m) => `<tr>
      <td class="w-mod"><span class="modname">${esc(m.name)}</span><br><span class="mono muted">${esc(m.id)}</span></td>
      <td>${esc(m.strandNames.join(' · '))}</td>
      <td class="num">${m.items.length}</td>
      <td class="num">${m.practice.length}</td>
      <td class="num">≤${m.targetMinutes} min</td>
    </tr>`,
    )
    .join('');

  const colour = v.colourItems.length
    ? `
  ${eyebrow('Printing notice')}
  <h2 class="sec">These items need colour</h2>
  <p>Almost everything here prints perfectly well in black and white. The items below are the
     exception: colour is what is being asked about, so a grey print would change the question.
     Print those child pages on a colour printer, or leave the items blank and mark them
     not yet checked.</p>
  <table class="tbl">
    <thead><tr><th class="w-id">Item</th><th>Strand</th><th>The line you read</th></tr></thead>
    <tbody>${v.colourItems
      .map(
        (c) =>
          `<tr><td class="mono">${esc(c.id)}</td><td>${esc(c.strandName)}</td><td>${esc(c.line)}</td></tr>`,
      )
      .join('')}</tbody>
  </table>
  <p class="small">Every other item is tagged as staying identifiable in greyscale, and no other
     item can be answered by colour alone.</p>`
    : '';

  const greyLine = v.colourItems.length
    ? `Black-and-white printing is fine. Every picture stays readable in grey, apart from the
       ${v.colourItems.length} colour item${v.colourItems.length === 1 ? '' : 's'} listed a page or two on.`
    : 'Black-and-white printing is fine. Every picture stays readable in grey.';

  const stopStrand = mods[0].strandStopN;
  const stopModule = mods[0].moduleStopN;

  return unit({
    kind: 'teacher',
    hdr: 'GUIDE',
    hdrLeft: runningLeft(v),
    numbered: true,
    html: `
${eyebrow('Before you begin')}
<h2 class="sec">How a check-in runs</h2>
<p>Sit beside the child in a quiet space — never on the open work floor. Put the child pages
   where the child can see and reach them. You read; the child points, touches or talks; you
   mark the record sheet. Nothing is timed. Nothing here is a test of the child.</p>

<div class="panel">
  ${eyebrow('What is in this pack')}
  <ol>
    <li><b>This guide</b> — how to run the sitting.</li>
    <li><b>Teacher script</b>, one block per item, for all three modules. Read the lines in
        quotation marks exactly as written — they are word-for-word the lines the tablet speaks,
        which is what keeps the two ways of running a check-in comparable.</li>
    <li><b>Child pages</b> — the pictures the child looks at. No words and no instructions on
        them: everything the child hears comes from you.</li>
    <li><b>Record sheets</b>, one per module, carrying the response key.</li>
    <li><b>Observation booklet</b> — the records for this age, rated from what you have already
        seen in the work cycle, with the neighbouring ages printed for reference.</li>
    <li><b>Summary sheet</b> — count-only lookup tables, then the numbers you type into Montree.</li>
  </ol>
</div>

<h3 class="sub">Printing and preparing</h3>
<ul>
  <li>Print A4, single-sided, at 100% — no “fit to page”, because the pictures are sized for
      small hands.</li>
  <li>${greyLine}</li>
  <li>Separate the child pages from the teacher pages before you sit down — a folder or
      ring-binder, pictures facing the child, works well.</li>
  <li>Keep the record sheet on your side of the table, angled away from the child.</li>
</ul>

<h3 class="sub">The three modules</h3>
<table class="tbl">
  <thead><tr><th class="w-mod">Module</th><th>Strands</th><th class="num">Items</th>
    <th class="num">Practice</th><th class="num">Length</th></tr></thead>
  <tbody>${modRows}</tbody>
</table>
<p class="small">The three modules together make one sitting of about fifteen minutes. You may
   run one module today and another tomorrow: a profile may be built across several days inside
   the same check-in window, and a part-finished sitting is still good information.</p>

${eyebrow('The rules of the sitting')}
<h2 class="sec">Four things that matter more than the items</h2>
<div class="grid2">
  <div class="panel">${eyebrow('Practice first')}<p>Every module opens with two practice items.
    These are the only place you may tell the child how they are doing: a warm “yes, that’s the
    one”, or “let’s look at that one together” and show them. Practice is never recorded.</p></div>
  <div class="panel">${eyebrow('Then: warm, and even')}<p>Once the module proper begins, meet every
    answer the same way — “Thank you.” A nod, a smile, on to the next picture. The child must not
    be able to read from your face how it is going.</p></div>
  <div class="panel">${eyebrow('Repeating')}<p>If the child asks, say the line once more, exactly
    as written. Do not rephrase it, do not point, do not lean towards a picture. Then wait
    again.</p></div>
  <div class="panel">${eyebrow('Waiting')}<p>There is no time limit and no timer anywhere in this
    pack. Three- and four-year-olds often take several seconds before they commit to a choice.
    Let the silence sit.</p></div>
</div>

<h3 class="sub">When to stop</h3>
<ul>
  <li><b>Within a strand</b> — after ${stopStrand} responses in a row that do not match the key,
      move on to the next strand. The remaining items in that strand are left blank and reported
      as not yet checked.</li>
  <li><b>Across the module</b> — after ${stopModule} in a row that do not match, close the module
      warmly and stop. “Thank you for playing with me today.”</li>
  <li><b>Whenever the child has had enough</b> — a child who wants to stop, stops. Note it on the
      record sheet and the profile stands as it is.</li>
</ul>

<h3 class="sub">When a child sails through</h3>
<p>If every item in a strand matches the key, you may carry on in that same strand with up to
   ${mods[0].extensionMax} items from the next age band’s pack, and note them on the record sheet
   under <i>next-band items</i>. This is how “already secure beyond this age” is evidenced — it is
   never assumed from a full sheet on its own.</p>

<h3 class="sub">Closing</h3>
<p>Every child finishes the same way, whatever happened in between: “Thank you for playing with me
   today.” No stickers, no stars, no points to collect. A child should leave the table feeling
   exactly as good as the child who sat there before them.</p>

<div class="panel">
  ${eyebrow('About Form A and Form B')}
  <p>This is <b>Form ${esc(v.formCode)}</b>, the form for ${esc(v.formMeta.window)}. Both forms
     exist on paper, one pack each: Form A for Autumn and Spring, Form B for Winter. They are
     matched strand by strand and carry the same number of items in the same order; only the
     pictures and the words change.</p>
  <p>Use the pack that belongs to the window you are in, and record the form exactly as it is
     printed here — never relabel one form as the other. The whole point of two forms is that a
     child does not meet the same items twice in one year: repeating Form A in Winter would show
     practice, not growth, and the two windows could no longer honestly be read side by side.</p>
</div>

<h3 class="sub">What the words on the record sheet mean</h3>
<table class="tbl tbl--defs">
  <tbody>
    <tr><td class="w-def">Emerging</td><td>The beginnings are there, with an adult alongside.</td></tr>
    <tr><td class="w-def">Developing</td><td>Doing it, most days, sometimes needing a hand.</td></tr>
    <tr><td class="w-def">Secure</td><td>Doing it independently and consistently.</td></tr>
    <tr><td class="w-def">Not yet checked</td><td>Too little evidence this window. Reported openly,
        never hidden, and never counted as a difficulty.</td></tr>
  </tbody>
</table>
${colour}`,
  });
}

/* ------------------------------------------------------------------ teacher script */

function scriptNotes(view) {
  const notes = [];
  if (view.ordered)
    notes.push(
      `<div class="note"><span class="note__t">Order matters</span>Number the boxes in the order the child touches them.</div>`,
    );
  if (view.rubric)
    notes.push(
      `<div class="note"><span class="note__t">0 · 1 · 2</span>The descriptors are on the record sheet.</div>`,
    );
  if (view.requiresColor)
    notes.push(
      `<div class="note"><span class="note__t">Colour needed</span>Print this child page in colour.</div>`,
    );
  return notes.join('');
}

function scriptBlock(view) {
  const isEfl = view.moduleId === 'M-EFL';
  return `
<div class="sblk${view.isPractice ? ' sblk--practice' : ''}">
  <div class="sblk__rail">
    <div class="sblk__code">${esc(view.code)}</div>
    <div class="sblk__strand">${esc(view.strandId)}</div>
    <div class="sblk__id mono">${esc(view.shortId)}</div>
  </div>
  <div class="sblk__main">
    ${view.isPractice ? '<p class="tag">Practice — you may help here</p>' : ''}
    <p class="say"><span class="say__k">Say</span><q>${esc(view.line)}</q>${
      isEfl ? '<span class="say__lang">(in English)</span>' : ''
    }</p>
    <p class="script">${esc(view.script)}</p>
  </div>
  <div class="sblk__aside">
    <div class="note note--mode"><span class="note__t">On paper</span>${esc(view.responseMode)}</div>
    ${scriptNotes(view)}
  </div>
</div>`;
}

function scriptUnit(v, m) {
  const groups = m.strandGroups
    .map(
      (g) => `
<!-- the ENGLISH-MEDIUM caveat, where one applies, is already inside the bank's constructSpec -->
<p class="strandbar"><b>${esc(g.strandId)}</b> — ${esc(g.name)} · ${esc(g.spec)}</p>
${g.views.map(scriptBlock).join('')}`,
    )
    .join('');

  return unit({
    kind: 'teacher',
    hdr: `SCRIPT · ${upper(m.name)}`,
    hdrLeft: runningLeft(v),
    numbered: true,
    html: `
${eyebrow('Teacher script · read aloud')}
<h2 class="sec">${esc(m.name)} <span class="secmeta">${esc(m.id)} · ${esc(v.ageBand)} · Form ${esc(v.formCode)}</span></h2>
<p>Read every line in quotation marks exactly as written — the same words the tablet speaks. The
   child looks at the child page carrying the matching number; you mark the record sheet.
   ${m.practice.length} practice items first, then ${m.items.length} items. Stop after
   ${m.strandStopN} in a row that do not match inside one strand, or ${m.moduleStopN} in a row
   across the module.</p>
${m.practiceViews.map(scriptBlock).join('')}
${groups}`,
  });
}

/* ------------------------------------------------------------------ child pages */

function childPage(view) {
  const ctx = view.context;
  const opts = view.options;
  const code = `${view.moduleId} · ${view.code}`;

  let body;
  if (view.cardsPerRow === 1 || (!opts.length && ctx.length)) {
    const n = ctx.length || 1;
    body = `<div class="cp__solo cp__solo--${n}">${ctx
      .map((s) => `<div class="card card--solo">${svgArt(s)}</div>`)
      .join('')}</div>`;
  } else {
    const head = ctx.length
      ? `<div class="cp__ctx">${ctx.map((s) => `<div class="card card--ctx">${svgArt(s)}</div>`).join('')}</div>`
      : '';
    body = `${head}<div class="cp__grid${ctx.length ? ' cp__grid--short' : ''}">${opts
      .map((o) => `<div class="card card--opt">${svgArt(o.stimulus)}</div>`)
      .join('')}</div>`;
  }

  return `<div class="childpage">${body}<div class="cp__code">${esc(code)}</div></div>`;
}

function childPagesUnit(v) {
  return unit({
    kind: 'child',
    html: v.childPages.map(childPage).join(''),
  });
}

/* ------------------------------------------------------------------ record sheets */

function responseCell(view) {
  if (view.isPractice) return `<span class="muted">not recorded</span>`;
  if (view.rubric)
    return `<div class="score012"><span class="circle">0</span><span class="circle">1</span><span class="circle">2</span><span class="muted">circle one</span></div>`;
  if (!view.options.length) return `<span class="muted">teacher records the response</span>`;
  return `<div class="boxes">${view.options
    .map(
      (o) =>
        `<div class="box">${o.glyph ? `<span class="glyph">${esc(o.glyph)}</span>` : ''}` +
        `<span class="key">${o.keyLabel ? `▲ ${esc(o.keyLabel)}` : ''}</span></div>`,
    )
    .join('')}</div>`;
}

function recordRow(view) {
  const rubric = view.rubric
    ? `<tr class="rs__rubric"><td></td><td colspan="3">${view.rubric
        .map((l) => `<b>${l.score}</b> ${esc(l.text)}`)
        .join(' · ')}</td></tr>`
    : '';
  return `
<tr class="rs__row${view.isPractice ? ' rs__row--practice' : ''}">
  <td class="rs__item"><span class="rs__code">${esc(view.code)}</span><br><span class="rs__strand">${esc(view.strandId)}</span></td>
  <td class="rs__line">${esc(view.line)}${view.isPractice ? '<br><span class="muted">practice — not recorded</span>' : ''}</td>
  <td class="rs__resp">${responseCell(view)}</td>
  <td class="rs__pts">${view.isPractice ? '' : '<span class="ptsbox"></span>'}</td>
</tr>${rubric}`;
}

function recordSheetUnit(v, m) {
  const groups = m.strandGroups
    .map(
      (g) => `
<tr class="rs__band"><td colspan="4"><b>${esc(g.strandId)}</b> — ${esc(g.name)} ·
  stop after ${g.strandStopN} in a row that do not match</td></tr>
${g.views.map(recordRow).join('')}
<tr class="rs__sub"><td colspan="3">${esc(g.strandId)} points (out of ${g.maxPoints})</td><td class="rs__pts"><span class="ptsbox"></span></td></tr>`,
    )
    .join('');

  return unit({
    kind: 'teacher',
    hdr: `RECORD SHEET · ${upper(m.name)}`,
    hdrLeft: runningLeft(v),
    numbered: true,
    html: `
${eyebrow('Record sheet')}
<h2 class="sec">${esc(m.name)} <span class="secmeta">${esc(m.id)} · ${esc(v.ageBand)} · Form ${esc(v.formCode)}</span></h2>
<div class="grid2 fields">
  <div class="field"><span class="flabel">Child</span><span class="fline"></span></div>
  <div class="field"><span class="flabel">Date · adult</span><span class="fline"></span></div>
</div>
<div class="panel panel--tight">
  <p class="small"><b>Stop rules.</b> ${m.strandStopN} responses in a row that do not match the key
  inside a strand → move to the next strand. ${m.moduleStopN} in a row across the module → close
  the module warmly and stop. Leave the rest blank; blank means not yet checked and is reported as
  it stands. Mark what the child actually did — the small ▲ shows the keyed picture, for your
  counting afterwards.</p>
</div>
<table class="rs">
  <thead><tr><th class="rs__item">Item</th><th>The line you read</th><th class="rs__resp">Response</th>
    <th class="rs__pts">Pts</th></tr></thead>
  <tbody>
    ${m.practiceViews.map(recordRow).join('')}
    ${groups}
  </tbody>
</table>
<div class="panel transfer">
  ${eyebrow('Transfer block — the numbers you type into Montree')}
  <div class="grid2">
    <div class="field"><span class="flabel">Module points (out of ${m.maxPoints})</span><span class="fline"></span></div>
    <div class="field"><span class="flabel">Items left blank</span><span class="fline"></span></div>
    <div class="field"><span class="flabel">Next-band items given (up to ${m.extensionMax})</span><span class="fline"></span></div>
    <div class="field"><span class="flabel">of those, matched the key</span><span class="fline"></span></div>
  </div>
  <p class="small choice"><b>Module ended early?</b> &nbsp; no · strand stop · module stop · the child chose to finish</p>
</div>
<p class="small">Then turn to the lookup table for this module: it turns these point counts into
   milestone bands with no arithmetic. Your own judgement outranks the table — you may set any band
   yourself, with a short reason.</p>`,
  });
}

/* ------------------------------------------------------------------ observation */

function obsRecord(r) {
  return `
<div class="obs">
  <p class="obs__h"><span class="mono">${esc(r.id)}</span> ${esc(r.statement)}</p>
  <div class="obs__bands">
    ${r.bands
      .map(
        (b) =>
          `<div class="obs__band"><span class="tick"></span><span class="obs__bl">${esc(b.band)}</span>
           <span class="obs__bt">${esc(b.text)}</span></div>`,
      )
      .join('')}
  </div>
  <p class="obs__note">What you saw (optional) <span class="dots"></span></p>
</div>`;
}

function observationUnit(v) {
  const groups = v.observation
    .map(
      (g) => `
<p class="strandbar"><b>${esc(g.domainName)}</b> · ${g.records.length} records · ${esc(g.strandIds.join(' · '))}</p>
${g.records.map(obsRecord).join('')}`,
    )
    .join('');

  return unit({
    kind: 'teacher',
    hdr: 'OBSERVATION BOOKLET',
    hdrLeft: runningLeft(v),
    numbered: true,
    html: `
${eyebrow('Section 5 · rated across the whole window')}
<h2 class="sec">Observation booklet — ${esc(v.bandMeta.label)}</h2>
<p>${esc(v.observation[0]?.guidance ?? '')}</p>
<p>These ${v.counts.observationRecords} records are not a sitting. They are the things you already
   know about a child from the work cycle — pouring, buttoning, joining a friend, staying with a
   hard job. Nothing here should be staged for the occasion. Tick the one description that fits
   best.</p>
<div class="grid2 fields">
  <div class="field"><span class="flabel">Child</span><span class="fline"></span></div>
  <div class="field"><span class="flabel">Window · dates observed</span><span class="fline"></span></div>
</div>
${groups}`,
  });
}

function referenceUnit(v) {
  const bands = v.referenceBands
    .map(
      (rb) => `
<p class="refchip">${esc(rb.meta.label)} · ${esc(rb.ageBand)} · reference only, not for ticking</p>
${rb.groups
  .map(
    (g) => `<p class="refdomain">${esc(g.domainName)}</p>
${g.records
  .map(
    (r) => `<p class="ref"><span class="mono">${esc(r.id)}</span> ${esc(r.statement)}<br>
      <span class="ref__b">${r.bands.map((b) => `${esc(b.band)} — ${esc(b.text)}`).join(' · ')}</span></p>`,
  )
  .join('')}`,
  )
  .join('')}`,
    )
    .join('');

  return unit({
    kind: 'teacher',
    hdr: 'OBSERVATION · REFERENCE',
    hdrLeft: runningLeft(v),
    numbered: true,
    html: `
<h2 class="sec">The same records at the ages either side</h2>
<p>Best-fit judgement is easier when the whole continuum is in front of you, so the other two ages
   are printed here in full — all ${v.counts.observationRecordsAllBands} observation records across
   the three ages appear in this pack. Do not tick these. A child is rated on their own age pages;
   these are here so you can see where a description sits in the run of things, and for the child
   who is close to a birthday.</p>
${bands}`,
  });
}

/* ------------------------------------------------------------------ lookup + summary */

function lookupUnit(v) {
  const tables = v.lookup
    .map(
      (L) => `
<h3 class="sub">${esc(L.module.name)} <span class="secmeta">${esc(L.module.id)}</span></h3>
<table class="tbl lk">
  <thead><tr>
    <th class="lk__ms">Milestone</th><th>What it says</th><th class="lk__items">Items (Form ${esc(v.formCode)})</th>
    <th class="num">Secure</th><th class="num">Developing</th><th class="num">Emerging</th>
    <th class="num lk__nyc">Not yet checked</th>
  </tr></thead>
  <tbody>${L.rows
    .map(
      (r) => `<tr>
      <td class="mono">${esc(r.id)}</td>
      <td>${esc(r.statement)}<br><span class="muted">${esc(r.expectationLabel)} · out of ${r.maxPoints} point${r.maxPoints === 1 ? '' : 's'}</span></td>
      <td class="mono lk__items">${r.itemIds.map(esc).join('<br>')}</td>
      <td class="num">${esc(r.cutoffs.secure)}</td>
      <td class="num">${esc(r.cutoffs.developing)}</td>
      <td class="num">${esc(r.cutoffs.emerging)}</td>
      <td class="num muted">under ${r.minItems} item${r.minItems === 1 ? '' : 's'}</td>
    </tr>`,
    )
    .join('')}</tbody>
</table>`,
    )
    .join('');

  return unit({
    kind: 'teacher',
    hdr: 'BAND LOOKUP',
    hdrLeft: runningLeft(v),
    numbered: true,
    html: `
${eyebrow('Section 6 · counting only')}
<h2 class="sec">From the sheets to the bands</h2>
<p>Add up the points you marked for each milestone’s items, then read the band straight off the
   row. The cut-offs are already worked out — there is nothing to divide and no percentage to work
   out. If fewer items were given than the last column asks for, the milestone is not yet checked:
   leave it, and it is reported as it stands. A dash means that band cannot arise for a milestone
   carrying that few points.</p>
<div class="panel">
  <p class="small"><b>Your judgement comes last, and it wins.</b> If the band the table gives you
  does not match the child you know, set the band you believe is right and write one line saying
  why. Montree keeps both and reports how often it happened, openly, as a count. This pack supports
  teacher observation; it does not overrule it.</p>
</div>
${tables}`,
  });
}

function summaryUnit(v) {
  const c = v.counts;
  const row = (label) =>
    `<tr><td>${label}</td><td class="tally"></td><td class="tally"></td><td class="tally"></td><td class="tally"></td></tr>`;
  return unit({
    kind: 'teacher',
    hdr: 'SUMMARY',
    hdrLeft: runningLeft(v),
    numbered: true,
    html: `
${eyebrow('Section 6 · summary')}
<h2 class="sec">Check-in summary — ${esc(v.bandMeta.label)}</h2>
<div class="grid2 fields">
  <div class="field"><span class="flabel">Child</span><span class="fline"></span></div>
  <div class="field"><span class="flabel">Window · school year</span><span class="fline"></span></div>
  <div class="field"><span class="flabel">Adult sitting with the child</span><span class="fline"></span></div>
  <div class="field"><span class="flabel">Date(s)</span><span class="fline"></span></div>
</div>

<h3 class="sub">Count the milestones</h3>
<p class="small">One tally mark per milestone, taken from the lookup tables and the observation
   booklet. Counting is the only arithmetic in this pack.</p>
<table class="tbl sum">
  <thead><tr><th>Where the milestones came from</th><th class="num">Secure</th>
    <th class="num">Developing</th><th class="num">Emerging</th><th class="num">Not yet checked</th></tr></thead>
  <tbody>
    ${row(`${esc(v.modules[0].name)} — from the sitting`)}
    ${row(`${esc(v.modules[1].name)} — from the sitting`)}
    ${row('Observation booklet — from the work cycle')}
    ${row('<b>Core total</b> — the three rows above')}
    ${row(`${esc(v.modules[2].name)} — reported on its own, never added to the core total`)}
  </tbody>
</table>

<div class="panel">
  ${eyebrow('What this age is expected to reach')}
  <p class="small">At ${esc(v.bandMeta.label)} this pack carries <b>${c.coreExpected}</b> core
  milestones marked <i>expected</i> and <b>${c.eflExpected}</b> in English. A further
  <b>${c.extension}</b> belong${c.extension === 1 ? 's' : ''} to the next age band — securing
  ${c.extension === 1 ? 'it' : 'them'} is recorded as <i>exceeded</i>. <b>${c.emergingEdge}</b>
  ${c.emergingEdge === 1 ? 'is' : 'are'} informative rather than expected: they appear in some
  children at this age and are never counted against a child. Only expected milestones that were
  actually checked go into the attainment figure; everything left blank is printed as not yet
  checked, never quietly dropped.</p>
</div>

<h3 class="sub">Type these into Montree</h3>
<table class="tbl tbl--defs">
  <tbody>
    <tr><td class="w-def2">Core: secure · developing · emerging · not yet checked</td><td class="fline"></td></tr>
    <tr><td class="w-def2">English: secure · developing · emerging · not yet checked</td><td class="fline"></td></tr>
    <tr><td class="w-def2">Milestones secured from the next age band (exceeded)</td><td class="fline"></td></tr>
    <tr><td class="w-def2">Bands you set yourself, against the table</td><td class="fline"></td></tr>
  </tbody>
</table>

<p class="small">Montree turns these counts into the family’s Growth Story and into the attainment
   figure — the share of the milestones typically expected at this age in mainstream early-years
   settings that this child has securely met, always printed with the number it was counted out of.
   Where fewer than ${v.scoring.mapSuppressionMinN} expected milestones were checked, no percentage
   is shown at all and the milestone list stands on its own. There are no percentiles, no ranking of
   one child against another, and no comparison of one class with another.</p>

<div class="panel">
  ${eyebrow('A note for whoever reads this next')}
  <p class="small">These are criterion-referenced classroom check-ins carried out by the child’s own
  teacher. They are not psychometrically normed instruments; the two forms are matched by design
  rather than by calibration; and one classroom is far too small a group to draw norms from. What
  they carry honestly is this child’s own movement, window to window — which is the evidence worth
  having.</p>
</div>

<div class="grid2 fields">
  <div class="field"><span class="flabel">Teacher</span><span class="fline"></span></div>
  <div class="field"><span class="flabel">Date entered into Montree</span><span class="fline"></span></div>
</div>`,
  });
}

/* ------------------------------------------------------------------ documents */

function documentHtml(title, units) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head><body>${units.join('\n')}</body></html>`;
}

function packUnits(v) {
  const mods = v.modules;
  return [
    coverUnit(v),
    guideUnit(v),
    dividerUnit(v, {
      hdr: 'TEACHER SCRIPT',
      section: 2,
      title: 'Teacher script',
      lede: 'Every line you say, in order, exactly as the tablet would say it. Practice items first. This side of the table stays with you.',
    }),
    ...mods.map((m) => scriptUnit(v, m)),
    dividerUnit(v, {
      hdr: 'CHILD PAGES',
      section: 3,
      title: 'Child pages',
      lede: 'The pages the child sees. There are no words on them on purpose: everything the child hears comes from you, so what is being looked at is listening and thinking, never reading.',
      extra: `<div class="panel"><p class="small">Take these pages out and keep them in a folder
        facing the child. The small code at the foot of each page — module and item number —
        matches the number in the teacher script; it is there for you, not for the child. Some
        pages show one picture on its own at the top with choices underneath: the top picture is
        the one you draw the child’s attention to first, exactly as the script says.</p></div>`,
    }),
    childPagesUnit(v),
    dividerUnit(v, {
      hdr: 'RECORD SHEETS',
      section: 4,
      title: 'Record sheets',
      lede: 'One sheet per module. Mark what the child actually did; the small ▲ marks the keyed response so you can count afterwards. The stop rules are repeated at the top of every sheet.',
    }),
    ...mods.map((m) => recordSheetUnit(v, m)),
    dividerUnit(v, {
      hdr: 'OBSERVATION BOOKLET',
      section: 5,
      title: 'Observation booklet',
      lede: 'The strands a sitting cannot reach: persistence, friendship, pouring, buttoning, care of the room. Rated from the work cycle across the whole window — never staged.',
    }),
    observationUnit(v),
    referenceUnit(v),
    dividerUnit(v, {
      hdr: 'LOOKUP & SUMMARY',
      section: 6,
      title: 'Lookup & summary',
      lede: 'Point counts become bands by reading a row. Then the counts go into Montree, which writes the family’s Growth Story.',
    }),
    lookupUnit(v),
    summaryUnit(v),
  ];
}

function reprintCoverUnit(first) {
  return unit({
    kind: 'cover',
    html: `
<div class="cover">
  <div class="cover__top">
    ${LOGO}
    <p class="cover__eyebrow">Reprint set</p>
    <h1 class="cover__title">Record &amp;<br>summary sheets</h1>
    <p class="cover__lede">The sheets that get written on — all three ages, both forms — pulled out
      of the full packs so a classroom can reprint a handful without printing the pictures again.</p>
    <p class="cover__blurb">Three record sheets per age and form (Word &amp; Sound Play, Number &amp;
      Shape Play, English Time), the band lookup tables, and the check-in summary. Form A is the
      Autumn and Spring pack, Form B the Winter pack; take the sheets that match the window you are
      in, and record the form as printed. The teacher script, the child pages and the observation
      booklet stay in the full pack.</p>
  </div>
  <div class="cover__foot">
    <p class="stamp">Item bank ${esc(first.bankVersion)} · ${esc(first.bankChecksum)}</p>
    <p class="attr">${esc(first.attribution.note)}</p>
  </div>
</div>`,
  });
}

function scoringUnits(views) {
  const out = [reprintCoverUnit(views[0])];
  for (const v of views) {
    out.push(
      dividerUnit(v, {
        hdr: `${upper(v.bandMeta.label)} · ${v.ageBand} · FORM ${v.formCode}`,
        section: 'Age band',
        title: `${v.bandMeta.label} · ${v.ageBand} · Form ${v.formCode}`,
        lede: `Record sheets, band lookup and summary for ${esc(v.bandMeta.range)}, Form ${esc(
          v.formCode,
        )} — ${esc(v.formMeta.window)}. Stop rules and cut-offs are printed on the sheets themselves,
        so this set works on its own.`,
      }),
    );
    for (const m of v.modules) out.push(recordSheetUnit(v, m));
    out.push(lookupUnit(v));
    out.push(summaryUnit(v));
  }
  return out;
}

/* ------------------------------------------------------------------ stylesheet */

const BRAND = {
  green: '#1D6B48', // deep pine — the print-safe end of the Montree CTA gradient
  greenDeep: '#03261D', // logo field green
  gold: '#E8C96A',
};

const CSS = `
:root{
  --ink:#141310; --ink-soft:#4b453d; --ink-faint:#8a827a;
  --rule:#cdc7be; --rule-soft:#e7e2db; --wash:#f7f5f1;
  --green:${BRAND.green}; --green-deep:${BRAND.greenDeep}; --gold:${BRAND.gold};
  --display:"Lora",Georgia,"Times New Roman",serif;
  --ui:"Work Sans","Helvetica Neue",Arial,sans-serif;
  --child:"Andika","Work Sans",sans-serif;
  --mono:"DejaVu Sans Mono","Courier New",monospace;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:var(--ui);font-size:9.4pt;line-height:1.45;color:var(--ink);
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.unit{break-after:page;page-break-after:always}
.unit:last-child{break-after:auto;page-break-after:auto}

/* ---------- typography ---------- */
h1,h2,h3{font-family:var(--display);font-weight:600;margin:0}
h2.sec{font-size:16pt;font-weight:500;margin:0 0 3mm;line-height:1.2}
.unit--teacher>:first-child,.unit--teacher>.strandbar:first-child{margin-top:0}
h3.sub{font-size:11.5pt;font-weight:500;margin:6mm 0 2mm;break-after:avoid;page-break-after:avoid}
.secmeta{font-family:var(--ui);font-size:8pt;font-weight:500;color:var(--ink-faint);
  letter-spacing:.06em;text-transform:uppercase}
p{margin:0 0 2.6mm}
b{font-weight:600}
.eyebrow{font-size:7pt;letter-spacing:.24em;text-transform:uppercase;font-weight:600;
  color:var(--green);margin:0 0 2mm}
.small{font-size:8.3pt;line-height:1.45}
.muted{color:var(--ink-faint)}
.mono{font-family:var(--mono);font-size:7.6pt;letter-spacing:-.01em}
ol,ul{margin:0 0 2.5mm;padding-left:5mm}
li{margin-bottom:1.2mm}
q{quotes:"\\201C" "\\201D"}

/* ---------- shared blocks ---------- */
.panel{border:.3mm solid var(--rule);background:var(--wash);padding:3.5mm 4mm;margin:0 0 3.5mm;
  break-inside:avoid;page-break-inside:avoid}
.panel--tight{padding:2.5mm 3mm}
.panel p:last-child{margin-bottom:0}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:3mm 6mm}
.grid2 .panel{margin:0}
.field{margin-bottom:4mm}
.flabel{display:block;font-size:6.6pt;letter-spacing:.15em;text-transform:uppercase;
  font-weight:600;color:var(--ink-soft)}
.fline{display:block;border-bottom:.3mm solid var(--rule);height:6mm}
.fields{margin-bottom:2mm}

table{width:100%;border-collapse:collapse}
.tbl{font-size:8.4pt;margin:0 0 3.5mm}
.tbl th{text-align:left;font-size:6.6pt;letter-spacing:.13em;text-transform:uppercase;
  color:var(--ink-faint);font-weight:600;border-bottom:.4mm solid var(--rule);
  padding:0 2mm 1.2mm 0;vertical-align:bottom}
.tbl td{padding:1.8mm 2mm 1.8mm 0;border-bottom:.2mm solid var(--rule-soft);vertical-align:top}
.tbl tr{break-inside:avoid;page-break-inside:avoid}
.num{text-align:center}
.tbl .num{text-align:center}
.w-mod{width:26mm}
.w-id{width:32mm}
.w-def{width:34mm;font-weight:600}
.w-def2{width:100mm}
.modname{font-weight:600}
.tbl--defs td{vertical-align:top}
.tbl--defs .fline{height:5mm}

/* ---------- cover ---------- */
.cover{height:297mm;padding:22mm 20mm 16mm;display:flex;flex-direction:column}
.logo{width:17mm;height:17mm;border-radius:3mm;background:var(--green-deep);
  display:flex;align-items:center;justify-content:center;margin-bottom:9mm}
.logo span{font-family:var(--display);font-size:20pt;color:var(--gold);line-height:1;
  font-weight:600;margin-top:-1mm}
.cover__eyebrow{font-size:7.5pt;letter-spacing:.3em;text-transform:uppercase;font-weight:600;
  color:var(--green);margin-bottom:5mm}
.cover__title{font-family:var(--display);font-size:38pt;line-height:1.03;font-weight:500;
  margin:0 0 6mm;letter-spacing:-.01em}
.cover__lede{font-size:10.5pt;line-height:1.5;max-width:115mm;color:var(--ink-soft);margin-bottom:9mm}
.cover__chip{display:inline-block;font-size:10pt;font-weight:600;border:.4mm solid var(--green);
  color:var(--green);padding:1.6mm 4mm;border-radius:1.5mm;margin:0 0 6mm}
.cover__blurb{font-size:9pt;line-height:1.5;max-width:125mm;color:var(--ink-soft)}
.cover__fields{margin-top:12mm;display:grid;grid-template-columns:1fr 1fr;gap:2mm 8mm;padding-bottom:7mm}
.cover__foot{margin-top:auto;border-top:.3mm solid var(--rule);padding-top:3mm}
.stamp{font-family:var(--mono);font-size:7pt;color:var(--ink-soft);margin-bottom:1.5mm;
  word-break:break-all}
.attr{font-size:6.8pt;line-height:1.4;color:var(--ink-faint);margin:0}

/* ---------- section divider ---------- */
.divider{padding-top:52mm}
.divider__num{font-size:7.5pt;letter-spacing:.3em;text-transform:uppercase;font-weight:600;
  color:var(--green);margin-bottom:4mm}
.divider__title{font-family:var(--display);font-size:27pt;font-weight:500;margin:0 0 5mm}
.divider__lede{font-size:11pt;line-height:1.5;max-width:118mm;color:var(--ink-soft);margin-bottom:8mm}

/* ---------- teacher script ---------- */
.strandbar{background:var(--wash);border-left:1mm solid var(--green);padding:1.8mm 3mm;
  font-size:8pt;line-height:1.4;margin:5mm 0 3mm;break-after:avoid;page-break-after:avoid}
.strandbar .em{color:var(--green);font-weight:600;font-size:7.4pt;letter-spacing:.03em}
.sblk{display:grid;grid-template-columns:21mm 1fr 34mm;gap:3mm;padding:2.6mm 0;
  border-bottom:.2mm solid var(--rule-soft);break-inside:avoid;page-break-inside:avoid}
.sblk--practice{background:var(--wash)}
.sblk__code{font-family:var(--display);font-size:14pt;line-height:1;font-weight:600}
.sblk__strand{font-size:7pt;font-weight:600;color:var(--green);letter-spacing:.05em;margin-top:.8mm}
.sblk__id{color:var(--ink-faint);margin-top:.6mm;overflow-wrap:anywhere;font-size:7pt}
.tag{font-size:6.6pt;letter-spacing:.14em;text-transform:uppercase;font-weight:600;
  color:var(--green);margin-bottom:1.2mm}
.say{margin:0 0 1.6mm}
.say__k{font-size:6.4pt;letter-spacing:.16em;text-transform:uppercase;font-weight:600;
  color:var(--ink-faint);display:block;margin-bottom:.6mm}
.say q{font-family:var(--display);font-size:12pt;line-height:1.3;font-weight:500}
.say__lang{font-size:8pt;color:var(--ink-faint);margin-left:1.5mm}
.script{font-size:8.3pt;line-height:1.45;color:var(--ink-soft);margin:0}
.sblk__aside{font-size:7.2pt;line-height:1.35}
.note{margin-bottom:1.8mm}
.note__t{display:block;font-size:6.3pt;letter-spacing:.14em;text-transform:uppercase;
  font-weight:600;color:var(--ink-faint)}
.note--mode .note__t{color:var(--green)}

/* ---------- child pages ---------- */
.childpage{height:273mm;break-after:page;page-break-after:always;
  display:flex;flex-direction:column;justify-content:center;position:relative;padding-bottom:8mm}
.unit--child .childpage:last-child{break-after:auto;page-break-after:auto}
.cp__grid{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
.cp__ctx{display:flex;justify-content:center;margin-bottom:6mm}
.card{border:.5mm solid var(--ink);border-radius:3mm;padding:4mm;display:flex;
  align-items:center;justify-content:center;background:#fff}
.card--opt{height:92mm}
.cp__grid--short .card--opt{height:78mm}
.card--ctx{width:76mm;height:70mm}
.card--solo{width:150mm;height:150mm;margin:0 auto}
.cp__solo{display:flex;gap:5mm;justify-content:center;align-items:center}
.cp__solo--2 .card--solo,.cp__solo--3 .card--solo{width:84mm;height:84mm}
.art{width:100%;height:100%;display:block}
.cp__code{position:absolute;bottom:0;left:0;right:0;text-align:center;
  font-family:var(--mono);font-size:7.5pt;color:var(--ink-faint);letter-spacing:.08em}

/* ---------- record sheets ---------- */
.rs{font-size:8.4pt;margin:2mm 0 4mm}
.rs th{text-align:left;font-size:6.6pt;letter-spacing:.13em;text-transform:uppercase;
  color:var(--ink-faint);font-weight:600;border-bottom:.4mm solid var(--rule);padding:0 2mm 1.2mm 0}
.rs td{padding:2mm 2mm 2mm 0;border-bottom:.2mm solid var(--rule-soft);vertical-align:top}
.rs tr{break-inside:avoid;page-break-inside:avoid}
.rs__item{width:15mm}
.rs__code{font-family:var(--display);font-size:11pt;font-weight:600;line-height:1}
.rs__strand{font-size:6.6pt;font-weight:600;color:var(--green);letter-spacing:.05em}
.rs__line{font-size:9pt}
.rs__resp{width:52mm}
.rs__pts{width:12mm;text-align:center}
.ptsbox{display:inline-block;width:9mm;height:6mm;border:.3mm solid var(--rule)}
.rs__band td{background:var(--wash);border-left:1mm solid var(--green);padding:1.6mm 2mm;
  font-size:7.8pt;border-bottom:none}
.rs__sub td{border-bottom:none;text-align:right;font-size:7.4pt;letter-spacing:.08em;
  text-transform:uppercase;color:var(--ink-faint);font-weight:600;padding-top:1mm}
.rs__row--practice{color:var(--ink-soft)}
.rs__rubric td{font-size:7.4pt;color:var(--ink-soft);border-bottom:.2mm solid var(--rule-soft);
  padding-top:0}
.boxes{display:flex;gap:2mm;margin-bottom:2.2mm}
.box{width:10mm;height:9mm;border:.3mm solid var(--rule);border-radius:1mm;position:relative;
  display:flex;align-items:center;justify-content:center}
.box .glyph{font-family:var(--child);font-size:10pt;line-height:1}
.box .key{position:absolute;top:9.4mm;left:0;right:0;text-align:center;font-size:5.6pt;
  color:var(--ink-faint);white-space:nowrap}
.score012{display:flex;align-items:center;gap:2.5mm;font-size:7.4pt}
.circle{display:inline-flex;align-items:center;justify-content:center;width:6mm;height:6mm;
  border:.3mm solid var(--rule);border-radius:50%;font-size:8pt}
.transfer{margin-top:4mm}
.choice{margin-top:1mm}

/* ---------- observation ---------- */
.obs{break-inside:avoid;page-break-inside:avoid;margin-bottom:3.5mm;
  border-bottom:.2mm solid var(--rule-soft);padding-bottom:2.5mm}
.obs__h{font-size:9pt;margin-bottom:1.6mm}
.obs__h .mono{color:var(--green);font-weight:600;margin-right:1.5mm}
.obs__bands{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3mm}
.obs__band{font-size:7.6pt;line-height:1.35;position:relative;padding-left:5mm}
.tick{position:absolute;left:0;top:.4mm;width:3.2mm;height:3.2mm;border:.3mm solid var(--ink-soft)}
.obs__bl{display:block;font-size:6.4pt;letter-spacing:.14em;text-transform:uppercase;
  font-weight:600;color:var(--ink-faint)}
.obs__note{font-size:7pt;color:var(--ink-faint);margin:1.8mm 0 0;display:flex;gap:2mm;
  align-items:baseline}
.dots{flex:1;border-bottom:.2mm dotted var(--rule)}
.refchip{display:inline-block;font-size:8.5pt;font-weight:600;border:.3mm solid var(--green);
  color:var(--green);padding:1.2mm 3mm;border-radius:1.2mm;margin:5mm 0 3mm}
.refdomain{font-size:7pt;letter-spacing:.18em;text-transform:uppercase;font-weight:600;
  color:var(--ink-soft);margin:3.5mm 0 1.5mm;break-after:avoid;page-break-after:avoid}
.ref{font-size:8pt;line-height:1.4;margin-bottom:2.2mm;break-inside:avoid;page-break-inside:avoid}
.ref .mono{color:var(--green);font-weight:600}
.ref__b{font-size:7.2pt;color:var(--ink-soft)}

/* ---------- lookup + summary ---------- */
.lk{font-size:8pt}
.lk__ms{width:24mm}
.lk__items{width:28mm;line-height:1.35}
.lk__nyc{width:20mm}
.lk td.num{font-weight:600;font-size:9pt}
.sum td{padding:3.2mm 2mm}
.sum .tally{border:.3mm solid var(--rule-soft);width:22mm;height:9mm}
`;

/* ------------------------------------------------------------------ main */

export function buildAll(outDir = resolve(PAPER_DIR, 'build'), bankPath = DEFAULT_BANK_PATH) {
  const bank = loadBank(bankPath);
  mkdirSync(outDir, { recursive: true });
  const written = [];
  const views = [];

  for (const ageBand of AGE_BANDS) {
    for (const formCode of FORM_CODES) {
      const v = buildPackView(bank, ageBand, formCode);
      views.push(v);
      const file = resolve(outDir, `pack_${ageBand}_${formCode}.html`);
      writeFileSync(
        file,
        documentHtml(
          `Montree Milestones — paper pack ${ageBand} Form ${formCode}`,
          packUnits(v),
        ),
      );
      written.push({ file, ageBand, formCode, childPages: v.childPages.length });
    }
  }

  const file = resolve(outDir, 'scoring_sheets_only.html');
  writeFileSync(
    file,
    documentHtml('Montree Milestones — record & summary sheets', scoringUnits(views)),
  );
  written.push({ file, ageBand: 'ALL', formCode: 'ALL', childPages: 0 });

  return { written, bank };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outDir = process.argv[2] ? resolve(process.argv[2]) : resolve(PAPER_DIR, 'build');
  const { written, bank } = buildAll(outDir);
  console.log(`bank ${bank.bankVersion} ${bank.bankChecksum}`);
  for (const w of written) console.log(`  ${w.file}  (child pages: ${w.childPages})`);
}
