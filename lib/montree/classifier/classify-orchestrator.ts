/**
 * Classify Orchestrator — CLIP/SigLIP DISABLED (Apr 4, 2026)
 *
 * SigLIP-base-patch16-224 was unable to discriminate between 329 Montessori works.
 * All scores were noise-level (0.0004-0.0143) regardless of input image.
 * Decision: route all photo identification to Haiku two-pass pipeline.
 * Sonnet reserved for "Teach the AI" (classroom-setup describe) only.
 *
 * This file preserves the ClassifyDecision interface for backward compatibility
 * but always returns full_two_pass immediately (zero latency, zero model loading).
 */

export type { VisualMemory } from './clip-classifier';

export interface ClassifyDecision {
  /** Whether CLIP produced a confident result */
  classified: boolean;
  /** CLIP classification result (always null — CLIP disabled) */
  clipResult: null;
  /** Recommended next step (always full_two_pass) */
  action: 'full_two_pass';
  /** Why this decision was made */
  reason: string;
}

/**
 * Always returns full_two_pass — CLIP classification disabled.
 * Haiku two-pass pipeline handles all photo identification.
 */
export async function tryClassify(
  _imageUrl: string,
  _classroomId: string | null,
  _visualMemories?: unknown[],
): Promise<ClassifyDecision> {
  return {
    classified: false,
    clipResult: null,
    action: 'full_two_pass',
    reason: 'clip_disabled_permanently',
  };
}

/** CLIP is permanently disabled */
export function isClipAvailable(): boolean {
  return false;
}

/** Diagnostic info — CLIP disabled */
export function getClipDiagnostics(): Record<string, unknown> {
  return {
    enabled: false,
    reason: 'SigLIP-base unable to discriminate 329 Montessori works. Haiku two-pass used for all identification.',
    disabled_date: '2026-04-04',
  };
}
