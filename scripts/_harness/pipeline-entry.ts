// scripts/_harness/pipeline-entry.ts
// Thin re-export of the REAL production pipeline functions so the cold-start
// harness drives them directly (bundled by scripts/retest-cold-start.mjs via
// esbuild). No logic here — the harness must exercise the exact code path the
// live route uses.
export { loadIdentificationContext } from '@/lib/montree/photo-identification/context-loader';
export { runTwoPassIdentification } from '@/lib/montree/photo-identification/two-pass';
export { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';
