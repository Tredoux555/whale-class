// lib/cms/engine/index.ts
// The engine's public surface — the waist of the hourglass.
//
// Nothing in here imports React, Next, or Supabase. If you find yourself
// wanting to, the code belongs in an API route or a component, not the engine.
//
// Implemented today: types + roster + paste-parser (phase 4) + doc-generator
// (phase 5 — the whole bottom of the hourglass).
// Stubbed with real signatures: assessments, routing, photo-filter,
// report-builder. See CLAUDE.md for the phase each lands in.

export * from './types';
export * from './roster';
export * as pasteParser from './paste-parser';
export * as assessments from './assessments';
export * as routing from './routing';
export * as photoFilter from './photo-filter';
export * as reportBuilder from './report-builder';
export * as docGenerator from './doc-generator';
