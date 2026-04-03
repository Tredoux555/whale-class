/**
 * CLIP/SigLIP-based image classifier for Montessori works
 * Runs on Node.js via @xenova/transformers (ONNX Runtime)
 *
 * Uses the zero-shot-image-classification pipeline which handles all
 * SigLIP-specific quirks automatically:
 * - Loads the FULL combined model (with text_projection + image_projection + logit_scale + logit_bias)
 * - Uses sigmoid scoring (NOT softmax) for SigLIP
 * - Properly pads text to max_length (SigLIP requirement)
 * - Returns calibrated [0,1] scores via logits_per_image
 *
 * Previous approach loaded SiglipTextModel + SiglipVisionModel (raw encoders WITHOUT
 * projection heads), producing ~0.05 cosine similarity (random noise). The pipeline
 * loads the full combined model and produces meaningful [0,1] sigmoid scores.
 *
 * Two-stage classification:
 * 1. Area classification (5 classes: practical_life, sensorial, mathematics, language, cultural)
 * 2. Work classification within the identified area (50-80 classes)
 *    + cross-area fallback if within-area confidence is low
 */

import { loadCurriculumAreas, loadAllCurriculumWorks, type CurriculumWork } from '@/lib/montree/curriculum-loader';
import { getSignatureByKey, getConfusionPairsForWork, getNegativeDescriptions, AREA_SIGNATURES } from '@/lib/montree/classifier/work-signatures';
import type { ConfusionPair } from '@/lib/montree/classifier/work-signatures';

const CLIP_MODEL = 'Xenova/siglip-base-patch16-224';

// SigLIP pipeline returns sigmoid scores in [0, 1] range.
// Scores above ~0.15 are meaningful matches; below ~0.05 is noise.
const CLIP_CONFIDENCE_THRESHOLD = 0.10; // Below this, fall back to Haiku vision
const VISUAL_MEMORY_BOOST = 0.05; // Confidence boost for works with visual memory
const VISUAL_MEMORY_BOOST_CAP = 0.60; // Cap boosted confidence (sigmoid scale — 0.60 is very high)
const CLASSIFICATION_TIMEOUT_MS = 30_000; // 30s max for entire classification

export interface ClassifyResult {
  work_key: string;
  work_name: string;
  area_key: string;
  confidence: number; // 0-1 sigmoid score (after negative penalty)
  raw_confidence: number; // Pre-penalty sigmoid score
  area_confidence: number; // Area-level confidence
  negative_penalty_applied: boolean; // Whether negative embedding penalty was applied
  confusion_pair_matched: string | null; // work_key of matched confusion pair, or null
  runner_up?: {
    work_key: string;
    work_name: string;
    confidence: number;
  };
  classification_ms: number;
  model_used: 'clip';
}

export interface VisualMemory {
  work_name: string;
  work_key: string;
  visual_description: string;
  confidence: number;
}

// ============================================================
// Lazy-loaded singleton state
// Uses the zero-shot-image-classification pipeline which loads
// the FULL combined SigLIP model with projection heads.
// ============================================================

let classifier: any = null; // ZeroShotImageClassificationPipeline instance

// Label strings (NOT embeddings) — the pipeline handles embedding internally
let workLabels: Map<string, string> = new Map(); // work_key -> label string
let areaLabels: Map<string, string> = new Map(); // area_key -> label string
let worksByArea: Map<string, CurriculumWork[]> = new Map(); // area_key -> works
let confusionPairMap: Map<string, ConfusionPair[]> = new Map(); // work_key -> confusion pairs (cached)
let negativeLabels: Map<string, string[]> = new Map(); // work_key -> array of negative label strings

let initialized = false;
let initializationError: Error | null = null;
let initInProgress: Promise<void> | null = null; // Re-entrance guard for initClassifier

// Pipeline mutex: serializes concurrent classify calls to prevent ONNX state corruption
let pipelineQueue: Promise<unknown> = Promise.resolve(null);

// Per-classroom label overrides: classroomId -> (work_key -> label string)
// When a classroom has visual memories with descriptions, we use THOSE
// descriptions as labels instead of the generic work-signatures.
const classroomLabelCache = new Map<string, {
  labels: Map<string, string>;
  createdAt: number;
  workCount: number;
}>();
const CLASSROOM_CACHE_MAX = 50;
const CLASSROOM_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ============================================================
// Helper: Build per-classroom label overrides
// ============================================================

function ensureClassroomLabels(
  classroomId: string,
  visualMemories: VisualMemory[],
): Map<string, string> {
  // Filter to memories with actual descriptions worth using
  const memoriesWithDescriptions = visualMemories.filter(
    vm => vm.visual_description && vm.visual_description.length >= 20 && vm.work_key
  );

  // Fast path: return cached if fresh AND covers all current visual memories
  const cached = classroomLabelCache.get(classroomId);
  if (cached && (Date.now() - cached.createdAt) < CLASSROOM_CACHE_TTL_MS
      && cached.workCount >= memoriesWithDescriptions.length) {
    return cached.labels;
  }

  if (memoriesWithDescriptions.length === 0) {
    return new Map();
  }

  console.log(`[CLIP] Building per-classroom labels for ${classroomId} (${memoriesWithDescriptions.length} works)`);
  const labelMap = new Map<string, string>();

  for (const vm of memoriesWithDescriptions) {
    // Use the teacher's visual description as the label
    const label = `${vm.work_name}. ${vm.visual_description}`.slice(0, 200);
    labelMap.set(vm.work_key, label);
  }

  // LRU eviction: remove oldest if over limit
  if (classroomLabelCache.size >= CLASSROOM_CACHE_MAX) {
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [key, entry] of classroomLabelCache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      classroomLabelCache.delete(oldestKey);
      console.log(`[CLIP] LRU evicted classroom ${oldestKey} from label cache`);
    }
  }

  classroomLabelCache.set(classroomId, {
    labels: labelMap,
    createdAt: Date.now(),
    workCount: labelMap.size,
  });

  console.log(`[CLIP] Built ${labelMap.size} per-classroom label overrides`);
  return labelMap;
}

// ============================================================
// Helper: Load dynamic module
// ============================================================

async function getTransformersModule(): Promise<any> {
  try {
    const moduleName = '@xenova/transformers';
    const module = await import(/* webpackIgnore: true */ moduleName);
    return module;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Cannot find module') || msg.includes('MODULE_NOT_FOUND')) {
      throw new Error(
        `@xenova/transformers not installed. Run: npm install @xenova/transformers\n` +
        `CLIP classifier requires this optional dependency. Original error: ${msg}`
      );
    }
    throw new Error(`Failed to load @xenova/transformers: ${msg}`);
  }
}

// ============================================================
// Helper: Run pipeline classification with candidate labels
// Returns array of { label, score } sorted by score descending
// ============================================================

async function runPipelineClassification(
  imageUrl: string,
  candidateLabels: string[],
): Promise<{ label: string; score: number }[]> {
  if (!classifier || candidateLabels.length === 0) return [];

  try {
    // The zero-shot-image-classification pipeline:
    // - Downloads the image via RawImage internally
    // - Computes text embeddings for all candidate labels
    // - Computes image embedding
    // - Returns sigmoid scores (SigLIP) in [0,1] range
    //
    // hypothesis_template='{}' because our labels are already rich descriptions,
    // not bare nouns that need "This is a photo of {}" wrapping.
    const results = await classifier(imageUrl, candidateLabels, {
      hypothesis_template: '{}',
    });

    // Pipeline returns array of { label, score } sorted by score descending
    // Handle both single-image (array) and batch (array of arrays) return formats
    const resultArray = Array.isArray(results[0]) ? results[0] : results;
    return resultArray.map((r: any) => ({ label: String(r.label), score: Number(r.score) }));
  } catch (err) {
    console.error('[CLIP] Pipeline classification error:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ============================================================
// Public API: Initialize classifier
// ============================================================

export async function initClassifier(): Promise<void> {
  if (initialized) {
    console.log('[CLIP] Classifier already initialized');
    return;
  }

  if (initializationError) {
    throw initializationError;
  }

  // Re-entrance guard
  if (initInProgress) {
    console.log('[CLIP] Init already in progress — waiting...');
    return initInProgress;
  }

  const INIT_TIMEOUT_MS = 120_000; // 120s — pipeline loads full combined model (larger than separate encoders)

  const doInit = async () => {
    const startTime = Date.now();
    console.log('[CLIP] Initializing SigLIP classifier via zero-shot-image-classification pipeline...');

    let initTimeoutHandle: ReturnType<typeof setTimeout>;
    const initTimeoutPromise = new Promise<never>((_, reject) => {
      initTimeoutHandle = setTimeout(() => reject(new Error(`CLIP initialization timed out after ${INIT_TIMEOUT_MS}ms`)), INIT_TIMEOUT_MS);
    });

    const initWork = async () => {
      // Load curriculum data
      const areas = loadCurriculumAreas();
      const allWorks = loadAllCurriculumWorks();

      if (!areas.length || !allWorks.length) {
        throw new Error(`No curriculum data loaded (${areas.length} areas, ${allWorks.length} works)`);
      }

      // Group works by area for stage 2 classification
      for (const area of areas) {
        const areaWorks = allWorks.filter(w => w.area_key === area.area_key);
        worksByArea.set(area.area_key, areaWorks);
      }

      console.log(`[CLIP] Loaded ${allWorks.length} works across ${areas.length} areas`);

      // Load the zero-shot-image-classification pipeline
      // This loads the FULL combined SigLIP model with:
      // - text_projection (maps text encoder output to shared space)
      // - image_projection (maps vision encoder output to shared space)
      // - logit_scale + logit_bias (SigLIP temperature parameters)
      const transformers = await getTransformersModule();
      const { pipeline: createPipeline } = transformers;

      console.log(`[CLIP] Loading zero-shot-image-classification pipeline: ${CLIP_MODEL}`);
      classifier = await createPipeline('zero-shot-image-classification', CLIP_MODEL);
      console.log('[CLIP] Pipeline loaded successfully');

      // Build label strings for areas using rich AREA_SIGNATURES descriptions
      console.log('[CLIP] Building area labels...');
      for (const area of areas) {
        const richDescription = AREA_SIGNATURES[area.area_key] || `A Montessori ${area.name} work or material`;
        areaLabels.set(area.area_key, richDescription);
      }
      console.log(`[CLIP] Built ${areaLabels.size} area labels`);

      // Build label strings for works
      // Prefer rich visual descriptions from work-signatures, fall back to curriculum descriptions
      console.log('[CLIP] Building work labels...');
      let richCount = 0;
      for (const work of allWorks) {
        const signature = getSignatureByKey(work.work_key);
        let label: string;
        if (signature) {
          // Rich visual description — describes what's VISIBLE in a photo
          // Keep under 200 chars for pipeline efficiency (pipeline tokenizes internally)
          label = `${signature.name}. ${signature.visual_description}`.slice(0, 200);
          richCount++;
        } else {
          // Fallback to curriculum description
          label = `${work.name}. ${work.description || work.materials?.join(', ') || ''}`.slice(0, 200);
        }
        workLabels.set(work.work_key, label);
      }
      console.log(`[CLIP] Built ${workLabels.size} work labels (${richCount} with rich visual descriptions)`);

      // Build negative labels for disambiguation
      console.log('[CLIP] Building negative labels...');
      let negativeCount = 0;
      for (const work of allWorks) {
        const negDescs = getNegativeDescriptions(work.work_key);
        if (negDescs.length === 0) continue;
        negativeLabels.set(work.work_key, negDescs);
        negativeCount += negDescs.length;

        // Cache confusion pairs
        const pairs = getConfusionPairsForWork(work.work_key);
        if (pairs.length > 0) {
          confusionPairMap.set(work.work_key, pairs);
        }
      }
      console.log(`[CLIP] Built ${negativeCount} negative labels across ${negativeLabels.size} works`);

      // CRITICAL GUARD: If we have zero labels, init is broken
      if (areaLabels.size === 0) {
        throw new Error(`CLIP init produced 0 area labels (expected 5).`);
      }
      if (workLabels.size === 0) {
        throw new Error(`CLIP init produced 0 work labels (expected ~270).`);
      }
      if (workLabels.size < 100) {
        console.warn(`[CLIP] WARNING: Only ${workLabels.size} work labels built (expected ~270) — some works will be unrecognizable`);
      }

      // Quick smoke test: classify a blank with 2 area labels to verify pipeline works
      try {
        const testLabels = Array.from(areaLabels.values()).slice(0, 2);
        // We don't actually run classification here — just verify the pipeline object is callable
        if (typeof classifier !== 'function') {
          throw new Error(`Pipeline is not callable — got type: ${typeof classifier}`);
        }
        console.log('[CLIP] Pipeline smoke test passed (callable function)');
      } catch (err) {
        throw new Error(`Pipeline smoke test failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      initialized = true;
      const elapsed = Date.now() - startTime;
      console.log(`[CLIP] Initialization complete (${elapsed}ms) — ${areaLabels.size} areas, ${workLabels.size} works, ${negativeLabels.size} negative sets`);
    };

    try {
      await Promise.race([initWork(), initTimeoutPromise]);
    } catch (error) {
      // Cleanup partial state
      classifier = null;
      workLabels.clear();
      negativeLabels.clear();
      confusionPairMap.clear();
      areaLabels.clear();
      worksByArea.clear();
      initialized = false;
      initializationError = error instanceof Error ? error : new Error(String(error));
      console.error('[CLIP] Initialization failed:', initializationError.message);
      throw initializationError;
    } finally {
      clearTimeout(initTimeoutHandle!);
    }
  };

  initInProgress = doInit().finally(() => {
    initInProgress = null;
  });

  return initInProgress;
}

// ============================================================
// Public API: Classify image
// ============================================================

export async function classifyImage(
  imageUrl: string,
  classroomLabelOverrides?: Map<string, string>,
): Promise<ClassifyResult | null> {
  if (!initialized || !classifier) {
    console.warn('[CLIP] Classifier not initialized, skipping classification');
    return null;
  }

  // Pipeline mutex: serialize concurrent calls to prevent ONNX state corruption
  const result = new Promise<ClassifyResult | null>((resolve) => {
    pipelineQueue = pipelineQueue.then(async () => {
      const startTime = Date.now();
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

      const timeoutPromise = new Promise<null>((res) => {
        timeoutHandle = setTimeout(() => {
          console.warn(`[CLIP] Classification timed out after ${CLASSIFICATION_TIMEOUT_MS}ms`);
          res(null);
        }, CLASSIFICATION_TIMEOUT_MS);
      });

      try {
        const classificationResult = await Promise.race([
          classifyImageInternal(imageUrl, startTime, classroomLabelOverrides),
          timeoutPromise,
        ]);
        resolve(classificationResult);
        return classificationResult;
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }
    }).catch((err) => {
      console.error('[CLIP] Pipeline queue error:', err);
      resolve(null);
      return null;
    });
  });

  return result;
}

async function classifyImageInternal(
  imageUrl: string,
  startTime: number,
  classroomLabelOverrides?: Map<string, string>,
): Promise<ClassifyResult | null> {
  try {
    console.log(`[CLIP] classifyImageInternal — labels available: ${workLabels.size} works, ${areaLabels.size} areas`);
    console.log(`[CLIP] Classifying image: ${imageUrl.slice(0, 100)}...`);

    // Stage 1: Classify area
    // Send all 5 area labels to the pipeline in one call
    console.log('[CLIP] Stage 1: Classifying area...');
    const areaLabelEntries = Array.from(areaLabels.entries()); // [[area_key, label], ...]
    const areaCandidates = areaLabelEntries.map(([, label]) => label);

    const areaResults = await runPipelineClassification(imageUrl, areaCandidates);
    if (areaResults.length === 0) {
      console.warn('[CLIP] Stage 1 returned no results — pipeline failed');
      return null;
    }

    // Map results back to area keys using a Map for O(1) lookup
    // (labels are unique per area, but using Map avoids .find() collision risk)
    const labelToAreaKey = new Map<string, string>();
    for (const [areaKey, label] of areaLabelEntries) {
      labelToAreaKey.set(label, areaKey);
    }
    const areaScores: { areaKey: string; score: number }[] = [];
    for (const result of areaResults) {
      const areaKey = labelToAreaKey.get(result.label);
      if (areaKey) {
        areaScores.push({ areaKey, score: result.score });
      }
    }
    areaScores.sort((a, b) => b.score - a.score);

    const bestArea = areaScores[0];
    if (!bestArea || bestArea.score <= 0) {
      console.log('[CLIP] Area confidence is zero/negative — no area matched');
      return null;
    }

    let bestAreaKey = bestArea.areaKey;
    let bestAreaConfidence = bestArea.score;

    console.log(`[CLIP] Stage 1 result: ${bestAreaKey} (confidence: ${bestAreaConfidence.toFixed(4)})`);
    const areaTop3 = areaScores.slice(0, 3).map(s => `${s.areaKey}:${s.score.toFixed(4)}`).join(', ');
    console.log(`[CLIP] Stage 1 top-3 areas: ${areaTop3}`);

    // Stage 2: Classify work within area
    const areaWorks = worksByArea.get(bestAreaKey) || [];
    console.log(`[CLIP] Stage 2: Classifying work within ${bestAreaKey} (${areaWorks.length} works)...`);

    // Build candidate labels for works in this area
    // Use Map<label, [work_key, work]> for O(1) result lookup (avoids .find() collision)
    const labelToWork = new Map<string, [string, CurriculumWork]>();
    const workCandidates: string[] = [];
    for (const work of areaWorks) {
      // Use classroom override if available, otherwise generic label
      const label = classroomLabelOverrides?.get(work.work_key) || workLabels.get(work.work_key);
      if (label) {
        labelToWork.set(label, [work.work_key, work]);
        workCandidates.push(label);
      }
    }

    const workResults = await runPipelineClassification(imageUrl, workCandidates);

    // Map results back to work keys using Map for O(1) lookup
    let bestWork: CurriculumWork | null = null;
    let bestWorkConfidence = 0;
    let runnerUpWork: CurriculumWork | null = null;
    let runnerUpConfidence = 0;
    const workScores: { name: string; workKey: string; score: number }[] = [];

    for (const result of workResults) {
      const match = labelToWork.get(result.label);
      if (!match) continue;
      const [workKey, work] = match;
      workScores.push({ name: work.name, workKey, score: result.score });

      if (result.score > bestWorkConfidence) {
        if (bestWork) {
          runnerUpWork = bestWork;
          runnerUpConfidence = bestWorkConfidence;
        }
        bestWork = work;
        bestWorkConfidence = result.score;
      } else if (result.score > runnerUpConfidence) {
        runnerUpWork = work;
        runnerUpConfidence = result.score;
      }
    }

    // Log top-5 for calibration data
    workScores.sort((a, b) => b.score - a.score);
    const top5 = workScores.slice(0, 5).map(s => `${s.name}:${s.score.toFixed(4)}`).join(', ');
    console.log(`[CLIP] Stage 2 top-5 in ${bestAreaKey}: ${top5}`);

    // Cross-area fallback: if within-area confidence is weak, search ALL works
    // SigLIP sigmoid: 0.10-0.12 means "not confident in area-restricted result"
    const CROSS_AREA_FALLBACK_THRESHOLD = 0.12;
    if (bestWorkConfidence < CROSS_AREA_FALLBACK_THRESHOLD) {
      console.log(`[CLIP] Within-area confidence ${bestWorkConfidence.toFixed(4)} < ${CROSS_AREA_FALLBACK_THRESHOLD} — searching ALL works`);

      // Build all 270 work candidates using Map for O(1) result lookup
      const globalLabelToWork = new Map<string, [CurriculumWork, string]>(); // label -> [work, area_key]
      const allCandidates: string[] = [];
      for (const [areaKey, areaWorksForSearch] of worksByArea) {
        for (const work of areaWorksForSearch) {
          const label = classroomLabelOverrides?.get(work.work_key) || workLabels.get(work.work_key);
          if (label) {
            globalLabelToWork.set(label, [work, areaKey]);
            allCandidates.push(label);
          }
        }
      }

      const globalResults = await runPipelineClassification(imageUrl, allCandidates);

      let globalBestWork: CurriculumWork | null = null;
      let globalBestConfidence = 0;
      let globalRunnerUp: CurriculumWork | null = null;
      let globalRunnerUpConfidence = 0;
      let globalBestAreaKey = bestAreaKey;

      for (const result of globalResults) {
        const match = globalLabelToWork.get(result.label);
        if (!match) continue;
        const [work, areaKey] = match;

        if (result.score > globalBestConfidence) {
          if (globalBestWork) {
            globalRunnerUp = globalBestWork;
            globalRunnerUpConfidence = globalBestConfidence;
          }
          globalBestWork = work;
          globalBestConfidence = result.score;
          globalBestAreaKey = areaKey;
        } else if (result.score > globalRunnerUpConfidence) {
          globalRunnerUp = work;
          globalRunnerUpConfidence = result.score;
        }
      }

      // Use global result if better
      if (globalBestWork && globalBestConfidence > bestWorkConfidence) {
        console.log(`[CLIP] Cross-area fallback: "${globalBestWork.name}" (${globalBestAreaKey}) at ${globalBestConfidence.toFixed(4)} vs area-restricted "${bestWork?.name}" at ${bestWorkConfidence.toFixed(4)}`);
        bestWork = globalBestWork;
        bestWorkConfidence = globalBestConfidence;
        bestAreaKey = globalBestAreaKey;
        // Re-score the winning area
        const winningAreaLabel = areaLabels.get(globalBestAreaKey);
        if (winningAreaLabel) {
          const areaEntry = areaScores.find(a => a.areaKey === globalBestAreaKey);
          bestAreaConfidence = areaEntry?.score ?? bestAreaConfidence;
        }
        runnerUpWork = globalRunnerUp;
        runnerUpConfidence = globalRunnerUpConfidence;
      }
    }

    // ================================================================
    // NEGATIVE LABEL PENALTY
    // For the top match, run pipeline with the work's negative labels.
    // If the image scores HIGH on "NOT this" descriptions, penalize.
    // ================================================================
    const rawConfidence = bestWorkConfidence;
    let negativePenaltyApplied = false;
    let confusionPairMatched: string | null = null;

    if (bestWork) {
      const negLabelsForWork = negativeLabels.get(bestWork.work_key);
      if (negLabelsForWork && negLabelsForWork.length > 0) {
        // Run pipeline with negative labels
        const negResults = await runPipelineClassification(imageUrl, negLabelsForWork);
        const maxNegScore = negResults.length > 0 ? Math.max(...negResults.map(r => r.score)) : 0;

        if (maxNegScore > 0.10) { // Non-trivial negative match (sigmoid scale)
          const confidenceGap = bestWorkConfidence - maxNegScore;
          const NEGATIVE_MARGIN = 0.20; // Minimum gap between positive and negative (sigmoid scale)
          const NEGATIVE_WEIGHT = 0.3; // Penalty weight for margin deficit

          if (confidenceGap < NEGATIVE_MARGIN) {
            const marginDeficit = NEGATIVE_MARGIN - confidenceGap;
            const penalty = marginDeficit * NEGATIVE_WEIGHT;
            bestWorkConfidence = Math.max(0, bestWorkConfidence - penalty);
            negativePenaltyApplied = true;
            console.log(`[CLIP] Negative penalty: gap=${confidenceGap.toFixed(4)}, deficit=${marginDeficit.toFixed(4)}, penalty=${penalty.toFixed(4)}, ${rawConfidence.toFixed(4)} -> ${bestWorkConfidence.toFixed(4)} for ${bestWork.work_key}`);
          } else {
            console.log(`[CLIP] Negative match found but gap sufficient: gap=${confidenceGap.toFixed(4)} >= margin=${NEGATIVE_MARGIN} for ${bestWork.work_key}`);
          }
        }
      }

      // Check if runner-up is a known confusion pair
      const pairs = confusionPairMap.get(bestWork.work_key);
      if (pairs && runnerUpWork) {
        const matchedPair = pairs.find(p => p.work_key === runnerUpWork!.work_key);
        if (matchedPair) {
          confusionPairMatched = runnerUpWork.work_key;
          console.log(`[CLIP] Confusion pair detected: ${bestWork.work_key} vs ${runnerUpWork.work_key}`);
        }
      }
    }

    if (!bestWork || bestWorkConfidence < CLIP_CONFIDENCE_THRESHOLD) {
      console.log(`[CLIP] Work confidence below threshold: ${bestWorkConfidence.toFixed(4)} < ${CLIP_CONFIDENCE_THRESHOLD}`);
      return null;
    }

    const classificationMs = Date.now() - startTime;
    console.log(
      `[CLIP] Classification complete: ${bestWork.work_key} (raw: ${rawConfidence.toFixed(4)}, final: ${bestWorkConfidence.toFixed(4)}) in ${classificationMs}ms`
    );

    const classifyResult: ClassifyResult = {
      work_key: bestWork.work_key,
      work_name: bestWork.name,
      area_key: bestAreaKey,
      confidence: bestWorkConfidence,
      raw_confidence: rawConfidence,
      area_confidence: bestAreaConfidence,
      negative_penalty_applied: negativePenaltyApplied,
      confusion_pair_matched: confusionPairMatched,
      classification_ms: classificationMs,
      model_used: 'clip',
    };

    if (runnerUpWork) {
      classifyResult.runner_up = {
        work_key: runnerUpWork.work_key,
        work_name: runnerUpWork.name,
        confidence: runnerUpConfidence,
      };
    }

    return classifyResult;
  } catch (error) {
    console.error('[CLIP] Classification error:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// ============================================================
// Public API: Classify with visual memory boost
// ============================================================

export async function classifyImageWithMemory(
  imageUrl: string,
  classroomId: string,
  visualMemories?: VisualMemory[]
): Promise<ClassifyResult | null> {
  // Build per-classroom label overrides if visual memories provided
  let classroomLabelOverrides: Map<string, string> | undefined;
  if (classroomId && visualMemories && visualMemories.length > 0) {
    classroomLabelOverrides = ensureClassroomLabels(classroomId, visualMemories);
    if (classroomLabelOverrides.size === 0) classroomLabelOverrides = undefined;
  }

  const result = await classifyImage(imageUrl, classroomLabelOverrides);
  if (!result || !visualMemories || visualMemories.length === 0) {
    return result;
  }

  // Create a map of visual memory entries by work_key
  const memoryMap = new Map<string, VisualMemory>();
  for (const memory of visualMemories) {
    memoryMap.set(memory.work_key, memory);
  }

  // Boost confidence if the matched work has visual memory
  // Only apply boost if base confidence is already meaningful
  // SigLIP sigmoid: 0.10 is noise/weak boundary, 0.15+ is weak-but-meaningful
  const VISUAL_MEMORY_MIN_BASE = 0.15;
  if (memoryMap.has(result.work_key)) {
    if (result.confidence >= VISUAL_MEMORY_MIN_BASE) {
      const boostedConfidence = Math.min(result.confidence + VISUAL_MEMORY_BOOST, VISUAL_MEMORY_BOOST_CAP);
      console.log(
        `[CLIP] Visual memory boost applied: ${result.confidence.toFixed(4)} -> ${boostedConfidence.toFixed(4)} for ${result.work_key}`
      );
      result.confidence = boostedConfidence;
    } else {
      console.log(
        `[CLIP] Visual memory boost SKIPPED: base confidence ${result.confidence.toFixed(4)} < ${VISUAL_MEMORY_MIN_BASE} for ${result.work_key}`
      );
    }
  }

  // Optionally boost runner-up as well
  if (result.runner_up && memoryMap.has(result.runner_up.work_key)) {
    if (result.runner_up.confidence >= VISUAL_MEMORY_MIN_BASE) {
      const boostedConfidence = Math.min(result.runner_up.confidence + VISUAL_MEMORY_BOOST, VISUAL_MEMORY_BOOST_CAP);
      result.runner_up.confidence = boostedConfidence;
    }
  }

  return result;
}

// ============================================================
// Public API: Classifier status
// ============================================================

export function isClassifierReady(): boolean {
  return initialized && classifier !== null && workLabels.size > 0;
}

export function getClassifierStats(): {
  initialized: boolean;
  works_loaded: number;
  model: string;
  areas_loaded: number;
  negative_embeddings_loaded: number;
  confusion_pairs_loaded: number;
  classroom_caches: number;
  error?: string;
} {
  return {
    initialized,
    works_loaded: workLabels.size,
    areas_loaded: areaLabels.size,
    negative_embeddings_loaded: negativeLabels.size,
    confusion_pairs_loaded: confusionPairMap.size,
    classroom_caches: classroomLabelCache.size,
    model: CLIP_MODEL,
    error: initializationError?.message,
  };
}

/**
 * Get the confusion pair differentiation text for a work pair.
 * Used by photo-insight to inject into Haiku disambiguation prompt.
 */
export function getConfusionDifferentiation(workKey: string, confusedWithKey: string): string | null {
  const pairs = confusionPairMap.get(workKey);
  if (!pairs) return null;
  const pair = pairs.find(p => p.work_key === confusedWithKey);
  return pair?.differentiation || null;
}

/**
 * Reset initialization error to allow retries.
 * Called by the orchestrator when its TTL-based retry kicks in.
 */
export function resetInitError(): void {
  initializationError = null;
}

/** Invalidate cached per-classroom labels when visual memory changes */
export function invalidateClassroomEmbeddings(classroomId: string): void {
  if (classroomLabelCache.delete(classroomId)) {
    console.log(`[CLIP] Invalidated classroom label cache for ${classroomId}`);
  }
}
