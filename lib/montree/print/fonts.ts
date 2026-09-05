// lib/montree/print/fonts.ts
//
// The house literacy face for printed material, in one place.
//
// Andika is what the Writing Shelf's Python builders embed —
// build_flip_cards.py and build_sound_frame_mat.py both register
// public/fonts/Andika-Regular.ttf — and it is the rounded child-reading sans
// with the single-storey a and g that these sheets are set in. Anything
// generated in the browser must declare it too, or a print window falls back
// to whatever the machine has, which is how the backs came out in a serif.
//
// The fallbacks are all SANS on purpose: the older house stack ended in the
// generic `cursive`, which resolves to a serif-ish face on a machine without
// Comic Sans.

/** Font stack for every print document this library builds. */
export const PRINT_FONT_STACK = "'Andika', 'Fredoka', 'Nunito', Arial, sans-serif";

/**
 * @font-face for the bundled Andika TTFs, with ABSOLUTE urls: a print window
 * opened by window.open('') has no base URL of its own, so a relative src
 * silently fails to load. Mirrors the repo's existing print-page declaration in
 * lib/montree/english-curriculum/render/html-shell.ts `fontFaceCss()`.
 *
 * Pass a different string to make a document self-contained — see
 * scripts/curriculum/writing-shelf/generator-samples.mjs, which inlines the
 * same two faces as base64 data-URIs.
 */
export function andikaFontFaceCss(base = '/fonts'): string {
  const b = base.replace(/\/$/, '');
  return (
    `@font-face{font-family:'Andika';src:url('${b}/Andika-Regular.ttf') format('truetype');font-weight:400;font-style:normal;font-display:swap;}\n` +
    `@font-face{font-family:'Andika';src:url('${b}/Andika-Bold.ttf') format('truetype');font-weight:700;font-style:normal;font-display:swap;}`
  );
}
