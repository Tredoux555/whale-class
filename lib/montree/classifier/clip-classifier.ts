/**
 * CLIP/SigLIP classifier — PERMANENTLY DISABLED (Apr 4, 2026)
 *
 * SigLIP-base-patch16-224 was unable to discriminate between 329 Montessori works.
 * All scores were noise-level (0.0004-0.0143) regardless of input image.
 * All photo identification now handled by Haiku two-pass pipeline.
 *
 * This stub preserves exported interfaces for backward compatibility.
 * The actual classifier code has been removed.
 */

/** Visual memory record from montree_visual_memory table */
export interface VisualMemory {
  work_key: string;
  work_name: string;
  area: string;
  visual_description: string;
  is_custom: boolean;
  description_confidence: number;
  times_used: number;
  times_correct: number;
}

/** CLIP classification result (never produced — stub only) */
export interface ClassifyResult {
  work_key: string;
  work_name: string;
  area_key: string;
  confidence: number;
}

// All functions below are no-ops for backward compatibility

export async function initClassifier(): Promise<void> { /* disabled */ }
export async function classifyImage(_imageUrl: string): Promise<ClassifyResult | null> { return null; }
export async function classifyImageWithMemory(
  _imageUrl: string,
  _classroomId: string | null,
  _visualMemories?: VisualMemory[],
): Promise<ClassifyResult | null> { return null; }
export function isClassifierReady(): boolean { return false; }
export function getClassifierStats(): Record<string, unknown> { return { enabled: false }; }
export function resetInitError(): void { /* disabled */ }
export function getConfusionDifferentiation(_workKey: string): string | null { return null; }
export function invalidateClassroomEmbeddings(_classroomId: string): void { /* no-op */ }
