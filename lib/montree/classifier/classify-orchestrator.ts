/**
 * Classify Orchestrator — Server-side routing logic for Smart Capture
 *
 * Decides whether to use CLIP (fast/free) or fall through to Haiku two-pass (expensive).
 *
 * Flow:
 * 1. Check kill switch (CLIP_CLASSIFIER_ENABLED env var)
 * 2. Check if classifier is initialized
 * 3. Run CLIP classification against image
 * 4. If confidence >= threshold, return CLIP result + signal "use slim enrichment"
 * 5. If confidence < threshold, return null + signal "use full two-pass"
 *
 * The photo-insight route calls this BEFORE its existing two-pass logic.
 * When CLIP succeeds, the route uses the slim enrichment prompt instead.
 */

import {
  classifyImageWithMemory,
  isClassifierReady,
  initClassifier,
  type ClassifyResult,
  type VisualMemory,
} from './clip-classifier';

// Kill switch: set CLIP_CLASSIFIER_ENABLED=false (or FALSE, 0, no) on Railway to disable
const CLIP_ENABLED_RAW = (process.env.CLIP_CLASSIFIER_ENABLED || 'true').toLowerCase();
const CLIP_ENABLED = CLIP_ENABLED_RAW !== 'false' && CLIP_ENABLED_RAW !== '0' && CLIP_ENABLED_RAW !== 'no';

// Confidence thresholds
const CLIP_CONFIDENT = 0.75;    // Above this: use slim enrichment (skip full two-pass)
const CLIP_VERY_CONFIDENT = 0.90; // Above this: skip enrichment entirely for simple tagging

// Canary rollout: percentage of requests that try CLIP (0-100)
// Start at 100% (CLIP failure is graceful — always falls back to two-pass)
const rawCanary = parseInt(process.env.CLIP_CANARY_PERCENT || '100', 10);
const CANARY_PERCENT = Number.isNaN(rawCanary) ? 100 : Math.max(0, Math.min(100, rawCanary));

// Track initialization attempts to prevent retry storms
let initAttempted = false;
let initFailed = false;
let initPromise: Promise<void> | null = null; // Serializes concurrent init attempts

export interface ClassifyDecision {
  /** Whether CLIP produced a confident result */
  classified: boolean;
  /** CLIP classification result (null if not classified) */
  clipResult: ClassifyResult | null;
  /** Recommended next step */
  action: 'slim_enrich' | 'skip_enrich' | 'full_two_pass';
  /** Why this decision was made */
  reason: string;
}

/**
 * Try CLIP classification on a photo. Returns routing decision.
 *
 * @param imageUrl - Public URL of the photo
 * @param classroomId - Classroom ID (for visual memory lookup)
 * @param visualMemories - Pre-fetched visual memories for this classroom (optional)
 * @returns ClassifyDecision with action and CLIP result
 */
export async function tryClassify(
  imageUrl: string,
  classroomId: string | null,
  visualMemories?: VisualMemory[],
): Promise<ClassifyDecision> {
  // Kill switch
  if (!CLIP_ENABLED) {
    return { classified: false, clipResult: null, action: 'full_two_pass', reason: 'clip_disabled' };
  }

  // Canary rollout: CANARY_PERCENT=10 means try CLIP on ~10% of requests
  // Math.random()*100 > 10 → true ~90% → skip → CLIP tries ~10%
  if (Math.random() * 100 > CANARY_PERCENT) {
    return { classified: false, clipResult: null, action: 'full_two_pass', reason: 'canary_skip' };
  }

  // Try lazy initialization (once, serialized via Promise lock)
  if (!isClassifierReady() && !initFailed) {
    if (!initPromise) {
      initAttempted = true;
      initPromise = initClassifier().catch((err) => {
        initFailed = true;
        initPromise = null; // Allow potential retry if env changes
        console.error('[ClassifyOrchestrator] CLIP initialization failed (will use two-pass):', err);
      });
    }
    try {
      await initPromise;
    } catch {
      // Already handled above
    }
    if (initFailed) {
      return { classified: false, clipResult: null, action: 'full_two_pass', reason: 'init_failed' };
    }
  }

  if (!isClassifierReady()) {
    return {
      classified: false,
      clipResult: null,
      action: 'full_two_pass',
      reason: initFailed ? 'init_failed' : 'not_ready',
    };
  }

  // Run CLIP classification
  try {
    const startMs = Date.now();
    const result = classroomId && visualMemories
      ? await classifyImageWithMemory(imageUrl, classroomId, visualMemories)
      : await classifyImageWithMemory(imageUrl, classroomId || '', visualMemories || []);

    const elapsedMs = Date.now() - startMs;

    if (!result) {
      console.log(`[ClassifyOrchestrator] CLIP returned null (${elapsedMs}ms) — using two-pass`);
      return { classified: false, clipResult: null, action: 'full_two_pass', reason: 'clip_no_result' };
    }

    console.log(
      `[ClassifyOrchestrator] CLIP: "${result.work_name}" (area: ${result.area_key}, ` +
      `conf: ${result.confidence.toFixed(3)}, area_conf: ${result.area_confidence.toFixed(3)}, ${elapsedMs}ms)`
    );

    // Decision logic
    if (result.confidence >= CLIP_VERY_CONFIDENT) {
      // Very high confidence — could skip enrichment entirely
      // But we still want the observation + mastery assessment, so use slim enrich
      return {
        classified: true,
        clipResult: result,
        action: 'slim_enrich',
        reason: `clip_very_confident_${result.confidence.toFixed(3)}`,
      };
    }

    if (result.confidence >= CLIP_CONFIDENT) {
      // Confident enough to skip full two-pass, use slim enrichment
      return {
        classified: true,
        clipResult: result,
        action: 'slim_enrich',
        reason: `clip_confident_${result.confidence.toFixed(3)}`,
      };
    }

    // Below threshold — CLIP not confident enough
    console.log(`[ClassifyOrchestrator] CLIP confidence ${result.confidence.toFixed(3)} < ${CLIP_CONFIDENT} — using two-pass`);
    return {
      classified: false,
      clipResult: result, // Still return for analytics (context_snapshot)
      action: 'full_two_pass',
      reason: `clip_low_confidence_${result.confidence.toFixed(3)}`,
    };
  } catch (err) {
    console.error('[ClassifyOrchestrator] CLIP classification error:', err);
    return { classified: false, clipResult: null, action: 'full_two_pass', reason: 'clip_error' };
  }
}

/** Check if CLIP classifier is available and enabled */
export function isClipAvailable(): boolean {
  return CLIP_ENABLED && isClassifierReady();
}

/** Get diagnostic info */
export function getClipDiagnostics(): Record<string, unknown> {
  return {
    enabled: CLIP_ENABLED,
    canary_percent: CANARY_PERCENT,
    ready: isClassifierReady(),
    init_attempted: initAttempted,
    init_failed: initFailed,
    thresholds: {
      confident: CLIP_CONFIDENT,
      very_confident: CLIP_VERY_CONFIDENT,
    },
  };
}
