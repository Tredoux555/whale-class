// lib/montree/writing-shelf/generator/index.ts
//
// The Writing Shelf ADD-ON generator: pure layout functions that take a config
// and return the complete print-window HTML string. No React, no DOM.
//
// The shipped static sheets in public/dark-phonics-shelf/v2/ and their Python
// builders in scripts/curriculum/writing-shelf/ are the canonical set and are
// NOT touched by anything here. This exists for when the owner wants the same
// works with different words or different pictures.

export * from './cut-guides';
export * from './page-shell';
export * from './sound-frame-mat';
export * from './flip-cards';
export * from './defaults';
