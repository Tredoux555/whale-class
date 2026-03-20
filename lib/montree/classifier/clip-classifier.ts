/**
 * CLIP/SigLIP-based image classifier for Montessori works
 * Runs on Node.js via @xenova/transformers (ONNX Runtime)
 *
 * Two-stage classification:
 * 1. Area classification (5 classes: practical_life, sensorial, mathematics, language, cultural)
 * 2. Work classification within the identified area (50-80 classes)
 *
 * Pre-computed text embeddings for all 329 works + 5 areas
 * Uses cosine similarity for matching
 */

import { loadCurriculumAreas, loadAllCurriculumWorks, type CurriculumWork } from '@/lib/montree/curriculum-loader';
import { getSignatureByKey, AREA_SIGNATURES } from '@/lib/montree/classifier/work-signatures';

const CLIP_MODEL = 'Xenova/siglip-base-patch16-224';
const CLIP_CONFIDENCE_THRESHOLD = 0.75; // Below this, fall back to Haiku vision
const VISUAL_MEMORY_BOOST = 0.15; // Confidence boost for works with visual memory
const VISUAL_MEMORY_BOOST_CAP = 0.99; // Cap boosted confidence at this value
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB max image download
const IMAGE_DOWNLOAD_TIMEOUT_MS = 10_000; // 10s timeout for image download
const CLASSIFICATION_TIMEOUT_MS = 30_000; // 30s max for entire classification

export interface ClassifyResult {
  work_key: string;
  work_name: string;
  area_key: string;
  confidence: number; // 0-1 cosine similarity
  area_confidence: number; // Area-level confidence
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
// ============================================================

let pipeline: any = null;
let textEmbeddings: Map<string, Float32Array> = new Map(); // work_key -> embedding
let areaEmbeddings: Map<string, Float32Array> = new Map(); // area_key -> embedding
let worksByArea: Map<string, CurriculumWork[]> = new Map(); // area_key -> works
let initialized = false;
let initializationError: Error | null = null;
let initInProgress: Promise<void> | null = null; // Re-entrance guard for initClassifier

// Pipeline mutex: serializes concurrent classifyImage calls to prevent ONNX state corruption
let pipelineQueue: Promise<ClassifyResult | null> = Promise.resolve(null);

// ============================================================
// Helper: Cosine similarity
// ============================================================

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    console.warn(`[CLIP] Embedding dimension mismatch: ${a.length} vs ${b.length}`);
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

// ============================================================
// Helper: Download image as buffer
// ============================================================

async function downloadImageAsBuffer(imageUrl: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_DOWNLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    // Check Content-Length header if available
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(`Image too large: ${contentLength} bytes (max ${MAX_IMAGE_SIZE_BYTES})`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(`Image too large: ${buffer.length} bytes (max ${MAX_IMAGE_SIZE_BYTES})`);
    }
    return buffer;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// Helper: Load dynamic module
// ============================================================

async function getTransformersModule(): Promise<any> {
  // Dynamically import @xenova/transformers to avoid bundling issues
  // This is a large module (~50MB) and should be loaded on demand
  // IMPORTANT: Must remain a dynamic import() — NOT a top-level import
  // to prevent Next.js Turbopack from bundling it at build time
  try {
    // Use variable to prevent static analysis from resolving the import
    const moduleName = '@xenova/transformers';
    const module = await import(/* webpackIgnore: true */ moduleName);
    return module;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Provide actionable error message
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
// Public API: Initialize classifier
// ============================================================

export async function initClassifier(): Promise<void> {
  if (initialized) {
    console.log('[CLIP] Classifier already initialized');
    return;
  }

  // If previously failed, re-throw the cached error
  // The orchestrator's initFailed flag prevents retries at that layer
  if (initializationError) {
    throw initializationError;
  }

  // Re-entrance guard: if another call is already initializing, wait for it
  if (initInProgress) {
    console.log('[CLIP] Init already in progress — waiting...');
    return initInProgress;
  }

  const INIT_TIMEOUT_MS = 60_000; // 60s hard wall for model loading

  const doInit = async () => {
    const startTime = Date.now();
    console.log('[CLIP] Initializing SigLIP classifier...');

    // Wrap entire init in a timeout to prevent hanging on model download
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

      // Load transformers module
      const transformers = await getTransformersModule();
      const { pipeline: createPipeline } = transformers;

      // Initialize the feature-extraction pipeline for embeddings
      console.log(`[CLIP] Loading model: ${CLIP_MODEL}`);
      pipeline = await createPipeline('feature-extraction', CLIP_MODEL);
      console.log('[CLIP] Model loaded successfully');

      // Pre-compute text embeddings for areas using rich AREA_SIGNATURES descriptions
      console.log('[CLIP] Pre-computing area embeddings...');
      for (const area of areas) {
        const richDescription = AREA_SIGNATURES[area.area_key] || `A Montessori ${area.name} work or material`;
        const areaEmbedding = await pipeline(richDescription, {
          pooling: 'mean',
          normalize: true,
        });
        if (!areaEmbedding?.data) {
          console.warn(`[CLIP] Failed to compute area embedding for ${area.area_key} — skipping`);
          continue;
        }
        areaEmbeddings.set(area.area_key, new Float32Array(areaEmbedding.data));
      }
      console.log(`[CLIP] Pre-computed ${areaEmbeddings.size} area embeddings`);

      // Pre-compute text embeddings for works
      // Prefer rich visual descriptions from work-signatures, fall back to curriculum descriptions
      console.log('[CLIP] Pre-computing work embeddings...');
      let embeddingCount = 0;
      let richCount = 0;
      for (const work of allWorks) {
        const signature = getSignatureByKey(work.work_key);
        let prompt: string;
        if (signature) {
          // Rich visual description — describes what's VISIBLE in a photo
          prompt = `${signature.name}. ${signature.visual_description}`.slice(0, 256);
          richCount++;
        } else {
          // Fallback to curriculum description — pedagogical but still useful
          prompt = `${work.name}. ${work.description || work.materials?.join(', ') || ''}`.slice(0, 256);
        }
        const embedding = await pipeline(prompt, {
          pooling: 'mean',
          normalize: true,
        });
        if (!embedding?.data) {
          console.warn(`[CLIP] Failed to compute embedding for ${work.work_key} — skipping`);
          continue;
        }
        textEmbeddings.set(work.work_key, new Float32Array(embedding.data));
        embeddingCount++;

        // Log progress every 50 works
        if (embeddingCount % 50 === 0) {
          console.log(`[CLIP] Computed ${embeddingCount}/${allWorks.length} work embeddings`);
        }
      }
      console.log(`[CLIP] Pre-computed ${embeddingCount} work embeddings (${richCount} with rich visual descriptions)`);

      initialized = true;
      const elapsed = Date.now() - startTime;
      console.log(`[CLIP] Initialization complete (${elapsed}ms)`);
    };

    try {
      await Promise.race([initWork(), initTimeoutPromise]);
    } catch (error) {
      // Cleanup partial state to prevent memory leak
      pipeline = null;
      textEmbeddings.clear();
      areaEmbeddings.clear();
      worksByArea.clear();
      initialized = false;
      initializationError = error instanceof Error ? error : new Error(String(error));
      console.error('[CLIP] Initialization failed:', initializationError.message);
      throw initializationError;
    } finally {
      clearTimeout(initTimeoutHandle!);
    }
  };

  // Assign to initInProgress so concurrent callers wait on the same promise
  initInProgress = doInit().finally(() => {
    initInProgress = null; // Clear guard whether success or failure
  });

  return initInProgress;
}

// ============================================================
// Public API: Classify image
// ============================================================

export async function classifyImage(imageUrl: string): Promise<ClassifyResult | null> {
  if (!initialized || !pipeline) {
    console.warn('[CLIP] Classifier not initialized, skipping classification');
    return null;
  }

  // Pipeline mutex: serialize concurrent classifyImage calls to prevent ONNX state corruption.
  // Each call chains onto the previous promise so only one inference runs at a time.
  const result = new Promise<ClassifyResult | null>((resolve) => {
    pipelineQueue = pipelineQueue.then(async () => {
      const startTime = Date.now();

      // Wrap entire classification in a timeout to prevent runaway inference
      const timeoutPromise = new Promise<null>((res) => {
        setTimeout(() => {
          console.warn(`[CLIP] Classification timed out after ${CLASSIFICATION_TIMEOUT_MS}ms`);
          res(null);
        }, CLASSIFICATION_TIMEOUT_MS);
      });

      const classificationResult = await Promise.race([
        classifyImageInternal(imageUrl, startTime),
        timeoutPromise,
      ]);
      resolve(classificationResult);
      return classificationResult;
    }).catch((err) => {
      console.error('[CLIP] Pipeline queue error:', err);
      resolve(null);
      return null;
    });
  });

  return result;
}

async function classifyImageInternal(imageUrl: string, startTime: number): Promise<ClassifyResult | null> {
  try {
    // Download and encode image
    console.log(`[CLIP] Downloading image: ${imageUrl.slice(0, 100)}...`);
    const imageBuffer = await downloadImageAsBuffer(imageUrl);

    // Create image tensor and get embedding
    console.log('[CLIP] Computing image embedding...');
    const imageEmbedding = await pipeline(imageBuffer, {
      pooling: 'mean',
      normalize: true,
    });
    if (!imageEmbedding?.data) {
      console.warn('[CLIP] Pipeline returned null/undefined embedding');
      return null;
    }
    const imageVec = new Float32Array(imageEmbedding.data);

    // Stage 1: Classify area
    console.log('[CLIP] Stage 1: Classifying area...');
    let bestAreaKey = '';
    let bestAreaConfidence = 0;

    for (const [areaKey, areaVec] of areaEmbeddings) {
      const similarity = cosineSimilarity(imageVec, areaVec);
      if (similarity > bestAreaConfidence) {
        bestAreaConfidence = similarity;
        bestAreaKey = areaKey;
      }
    }

    if (bestAreaConfidence < 0.5) {
      // Area confidence too low — barely better than random (5 areas = 20% baseline)
      console.log(`[CLIP] Area confidence too low: ${bestAreaConfidence.toFixed(3)}`);
      return null;
    }

    console.log(`[CLIP] Stage 1 result: ${bestAreaKey} (confidence: ${bestAreaConfidence.toFixed(3)})`);

    // Stage 2: Classify work within area
    console.log(`[CLIP] Stage 2: Classifying work within ${bestAreaKey}...`);
    const areaWorks = worksByArea.get(bestAreaKey) || [];
    let bestWork: CurriculumWork | null = null;
    let bestWorkConfidence = 0;
    let runnerUpWork: CurriculumWork | null = null;
    let runnerUpConfidence = 0;

    for (const work of areaWorks) {
      const workVec = textEmbeddings.get(work.work_key);
      if (!workVec) continue;

      const similarity = cosineSimilarity(imageVec, workVec);

      if (similarity > bestWorkConfidence) {
        // Previous best becomes runner-up
        if (bestWork) {
          runnerUpWork = bestWork;
          runnerUpConfidence = bestWorkConfidence;
        }
        bestWork = work;
        bestWorkConfidence = similarity;
      } else if (similarity > runnerUpConfidence) {
        runnerUpWork = work;
        runnerUpConfidence = similarity;
      }
    }

    // Cross-area fallback: if within-area confidence is low, search ALL 329 works
    // This prevents cascade lock-in where wrong area classification excludes the correct work
    const CROSS_AREA_FALLBACK_THRESHOLD = 0.70;
    if (bestWorkConfidence < CROSS_AREA_FALLBACK_THRESHOLD) {
      console.log(`[CLIP] Within-area confidence ${bestWorkConfidence.toFixed(3)} < ${CROSS_AREA_FALLBACK_THRESHOLD} — searching ALL works`);

      let globalBestWork: CurriculumWork | null = null;
      let globalBestConfidence = 0;
      let globalRunnerUp: CurriculumWork | null = null;
      let globalRunnerUpConfidence = 0;
      let globalBestAreaKey = bestAreaKey;

      for (const [areaKey, areaWorksForSearch] of worksByArea) {
        for (const work of areaWorksForSearch) {
          const workVec = textEmbeddings.get(work.work_key);
          if (!workVec) continue;
          const similarity = cosineSimilarity(imageVec, workVec);
          if (similarity > globalBestConfidence) {
            if (globalBestWork) {
              globalRunnerUp = globalBestWork;
              globalRunnerUpConfidence = globalBestConfidence;
            }
            globalBestWork = work;
            globalBestConfidence = similarity;
            globalBestAreaKey = areaKey;
          } else if (similarity > globalRunnerUpConfidence) {
            globalRunnerUp = work;
            globalRunnerUpConfidence = similarity;
          }
        }
      }

      // Use global result if it's better than area-restricted result
      if (globalBestWork && globalBestConfidence > bestWorkConfidence) {
        console.log(`[CLIP] Cross-area fallback found: "${globalBestWork.name}" (${globalBestAreaKey}) at ${globalBestConfidence.toFixed(3)} vs area-restricted "${bestWork?.name}" at ${bestWorkConfidence.toFixed(3)}`);
        bestWork = globalBestWork;
        bestWorkConfidence = globalBestConfidence;
        bestAreaKey = globalBestAreaKey;
        bestAreaConfidence = areaEmbeddings.has(globalBestAreaKey)
          ? cosineSimilarity(imageVec, areaEmbeddings.get(globalBestAreaKey)!)
          : bestAreaConfidence;
        runnerUpWork = globalRunnerUp;
        runnerUpConfidence = globalRunnerUpConfidence;
      }
    }

    if (!bestWork || bestWorkConfidence < CLIP_CONFIDENCE_THRESHOLD) {
      console.log(`[CLIP] Work confidence below threshold: ${bestWorkConfidence.toFixed(3)} < ${CLIP_CONFIDENCE_THRESHOLD}`);
      return null;
    }

    const classificationMs = Date.now() - startTime;
    console.log(
      `[CLIP] Classification complete: ${bestWork.work_key} (${bestWorkConfidence.toFixed(3)}) in ${classificationMs}ms`
    );

    const result: ClassifyResult = {
      work_key: bestWork.work_key,
      work_name: bestWork.name,
      area_key: bestAreaKey,
      confidence: bestWorkConfidence,
      area_confidence: bestAreaConfidence,
      classification_ms: classificationMs,
      model_used: 'clip',
    };

    if (runnerUpWork) {
      result.runner_up = {
        work_key: runnerUpWork.work_key,
        work_name: runnerUpWork.name,
        confidence: runnerUpConfidence,
      };
    }

    return result;
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
  const result = await classifyImage(imageUrl);
  if (!result || !visualMemories || visualMemories.length === 0) {
    return result;
  }

  // Create a map of visual memory entries by work_key
  const memoryMap = new Map<string, VisualMemory>();
  for (const memory of visualMemories) {
    memoryMap.set(memory.work_key, memory);
  }

  // Boost confidence if the matched work has visual memory
  // SAFETY: Only apply boost if base confidence is already meaningful (>= 0.60)
  // This prevents a weak match (e.g., 0.50) from being boosted above the threshold (0.75)
  // which would cause a false positive identification
  const VISUAL_MEMORY_MIN_BASE = 0.60;
  if (memoryMap.has(result.work_key)) {
    if (result.confidence >= VISUAL_MEMORY_MIN_BASE) {
      const boostedConfidence = Math.min(result.confidence + VISUAL_MEMORY_BOOST, VISUAL_MEMORY_BOOST_CAP);
      console.log(
        `[CLIP] Visual memory boost applied: ${result.confidence.toFixed(3)} -> ${boostedConfidence.toFixed(3)} for ${result.work_key}`
      );
      result.confidence = boostedConfidence;
    } else {
      console.log(
        `[CLIP] Visual memory boost SKIPPED: base confidence ${result.confidence.toFixed(3)} < ${VISUAL_MEMORY_MIN_BASE} for ${result.work_key}`
      );
    }
  }

  // Optionally boost runner-up as well (same safety check)
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
  return initialized && pipeline !== null && textEmbeddings.size > 0;
}

export function getClassifierStats(): {
  initialized: boolean;
  works_loaded: number;
  model: string;
  areas_loaded: number;
  error?: string;
} {
  return {
    initialized,
    works_loaded: textEmbeddings.size,
    areas_loaded: areaEmbeddings.size,
    model: CLIP_MODEL,
    error: initializationError?.message,
  };
}

/**
 * Reset initialization error to allow retries.
 * Called by the orchestrator when its TTL-based retry kicks in.
 */
export function resetInitError(): void {
  initializationError = null;
}
