/**
 * CLIP/SigLIP-based image classifier for Montessori works
 * Runs on Node.js via @xenova/transformers (ONNX Runtime)
 *
 * Two-stage classification:
 * 1. Area classification (5 classes: practical_life, sensorial, mathematics, language, cultural)
 * 2. Work classification within the identified area (50-80 classes)
 *
 * Pre-computed text embeddings for all 270 works + 5 areas + negative embeddings
 * Uses cosine similarity with negative embedding penalty for disambiguation
 */

import { loadCurriculumAreas, loadAllCurriculumWorks, type CurriculumWork } from '@/lib/montree/curriculum-loader';
import { getSignatureByKey, getConfusionPairsForWork, getNegativeDescriptions, AREA_SIGNATURES } from '@/lib/montree/classifier/work-signatures';
import type { ConfusionPair } from '@/lib/montree/classifier/work-signatures';

const CLIP_MODEL = 'Xenova/siglip-base-patch16-224';
const CLIP_CONFIDENCE_THRESHOLD = 0.75; // Below this, fall back to Haiku vision
const VISUAL_MEMORY_BOOST = 0.15; // Confidence boost for works with visual memory
const VISUAL_MEMORY_BOOST_CAP = 0.99; // Cap boosted confidence at this value
const CLASSIFICATION_TIMEOUT_MS = 30_000; // 30s max for entire classification
const NEGATIVE_EMBEDDING_MARGIN = 0.12; // Minimum gap required between positive and negative scores
const NEGATIVE_EMBEDDING_WEIGHT = 0.25; // Weight for margin-deficit penalty

export interface ClassifyResult {
  work_key: string;
  work_name: string;
  area_key: string;
  confidence: number; // 0-1 cosine similarity (after negative penalty)
  raw_confidence: number; // Pre-penalty cosine similarity
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
// SigLIP has SEPARATE text and vision encoders. The generic
// `pipeline('feature-extraction', ...)` defaults to the vision
// encoder and crashes on text input ("Missing pixel_values").
// We load each encoder independently:
//   - SiglipTextModel + AutoTokenizer  → text embeddings
//   - SiglipVisionModel + AutoProcessor → image embeddings
// ============================================================

let tokenizer: any = null;   // AutoTokenizer instance for text
let textModel: any = null;   // SiglipTextModel instance
let processor: any = null;   // AutoProcessor instance for images
let visionModel: any = null; // SiglipVisionModel instance
let textEmbeddings: Map<string, Float32Array> = new Map(); // work_key -> embedding
let negativeEmbeddings: Map<string, Float32Array[]> = new Map(); // work_key -> array of negative embeddings
let confusionPairMap: Map<string, ConfusionPair[]> = new Map(); // work_key -> confusion pairs (cached)
let areaEmbeddings: Map<string, Float32Array> = new Map(); // area_key -> embedding
let worksByArea: Map<string, CurriculumWork[]> = new Map(); // area_key -> works
let initialized = false;
let initializationError: Error | null = null;
let initInProgress: Promise<void> | null = null; // Re-entrance guard for initClassifier

// Pipeline mutex: serializes concurrent classifyImage calls to prevent ONNX state corruption
// Type is Promise<unknown> to support both classification (ClassifyResult|null) and embedding builds (void)
let pipelineQueue: Promise<unknown> = Promise.resolve(null);

// Per-classroom embedding overrides: classroomId -> (work_key -> Float32Array)
// When a classroom has visual memories with descriptions, we re-embed using THOSE
// descriptions instead of the generic work-signatures. LRU eviction at max classrooms.
const classroomEmbeddingCache = new Map<string, {
  embeddings: Map<string, Float32Array>;
  createdAt: number;
  workCount: number;
}>();
const CLASSROOM_CACHE_MAX = 50;
const CLASSROOM_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLASSROOM_EMBEDDING_TIMEOUT_MS = 15_000; // 15s max for embedding build

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
// Helper: L2 normalize a vector (unit length)
// pooler_output from SiglipTextModel/SiglipVisionModel is NOT
// pre-normalized — we must do it manually.
// ============================================================

function l2Normalize(vec: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  const result = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    result[i] = vec[i] / norm;
  }
  return result;
}

// ============================================================
// Helper: Compute text embedding via SiglipTextModel
// ============================================================

async function embedText(text: string): Promise<Float32Array | null> {
  if (!tokenizer || !textModel) return null;
  try {
    const inputs = tokenizer(text, { padding: 'max_length', truncation: true });
    const result = await textModel(inputs);
    // SiglipTextModel may return pooler_output or only last_hidden_state depending on version
    const embedding = result.pooler_output ?? result.text_embeds ?? result.last_hidden_state;
    if (!embedding?.data) {
      console.warn('[CLIP] embedText: no usable output key. Available keys:', Object.keys(result));
      return null;
    }
    // If we got last_hidden_state (3D: [batch, seq, hidden]), mean-pool across seq dimension
    if (embedding.dims?.length === 3) {
      const [, seqLen, hiddenSize] = embedding.dims;
      const data = embedding.data;
      const pooled = new Float32Array(hiddenSize);
      for (let i = 0; i < seqLen; i++) {
        for (let j = 0; j < hiddenSize; j++) {
          pooled[j] += data[i * hiddenSize + j];
        }
      }
      for (let j = 0; j < hiddenSize; j++) {
        pooled[j] /= seqLen;
      }
      return l2Normalize(pooled);
    }
    return l2Normalize(new Float32Array(embedding.data));
  } catch (err) {
    console.warn('[CLIP] embedText error:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ============================================================
// Helper: Compute image embedding via SiglipVisionModel
// ============================================================

async function embedImage(imageUrl: string): Promise<Float32Array | null> {
  if (!processor || !visionModel) return null;
  try {
    const transformers = await getTransformersModule();
    const { RawImage } = transformers;
    const image = await RawImage.fromURL(imageUrl);
    console.log(`[CLIP] Image loaded: ${image.width}x${image.height}, computing embedding...`);
    const imageInputs = await processor(image);
    const result = await visionModel(imageInputs);
    // SiglipVisionModel may return pooler_output, image_embeds, or only last_hidden_state
    const embedding = result.pooler_output ?? result.image_embeds ?? result.last_hidden_state;
    if (!embedding?.data) {
      console.warn('[CLIP] embedImage: no usable output key. Available keys:', Object.keys(result));
      return null;
    }
    // If we got last_hidden_state (3D: [batch, patches, hidden]), mean-pool across patches
    if (embedding.dims?.length === 3) {
      const [, patchCount, hiddenSize] = embedding.dims;
      const data = embedding.data;
      const pooled = new Float32Array(hiddenSize);
      for (let i = 0; i < patchCount; i++) {
        for (let j = 0; j < hiddenSize; j++) {
          pooled[j] += data[i * hiddenSize + j];
        }
      }
      for (let j = 0; j < hiddenSize; j++) {
        pooled[j] /= patchCount;
      }
      return l2Normalize(pooled);
    }
    return l2Normalize(new Float32Array(embedding.data));
  } catch (err) {
    console.error('[CLIP] embedImage error:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// NOTE: downloadImageAsBuffer() removed — no longer needed after switching to RawImage.fromURL()
// which handles image download, decode, and tensor creation in one step.

// ============================================================
// Helper: Build per-classroom embeddings (serialized via pipelineQueue)
// ============================================================

/**
 * Ensure per-classroom text embeddings are built and cached.
 * When a classroom has visual memories with rich descriptions from teacher setup
 * or corrections, we re-embed those descriptions instead of using generic work-signatures.
 *
 * ONNX thread safety: all pipeline() calls serialize through pipelineQueue.
 * LRU eviction: oldest classroom evicted when cache hits CLASSROOM_CACHE_MAX.
 * TTL: 30-minute auto-expiry to pick up new visual memories.
 */
async function ensureClassroomEmbeddings(
  classroomId: string,
  visualMemories: VisualMemory[],
): Promise<Map<string, Float32Array>> {
  // Filter to memories with actual descriptions worth embedding (needed for count comparison below)
  const memoriesWithDescriptions = visualMemories.filter(
    vm => vm.visual_description && vm.visual_description.length >= 20 && vm.work_key
  );

  // Fast path: return cached if fresh AND covers all current visual memories
  // The workCount check prevents stale cache when new visual memories arrive between requests
  const cached = classroomEmbeddingCache.get(classroomId);
  if (cached && (Date.now() - cached.createdAt) < CLASSROOM_CACHE_TTL_MS
      && cached.workCount >= memoriesWithDescriptions.length) {
    return cached.embeddings;
  }

  if (memoriesWithDescriptions.length === 0) {
    return new Map(); // No overrides — use generic embeddings
  }

  // Build embeddings through the pipelineQueue mutex (ONNX thread safety)
  // Uses the same nested-Promise pattern as classifyImage() (lines 309-334)
  const classroomMap = await new Promise<Map<string, Float32Array>>((resolve) => {
    pipelineQueue = pipelineQueue.then(async () => {
      // Double-check cache after acquiring mutex (another request may have built it)
      // Also verify workCount matches — if new visual memories arrived since cache was built, rebuild
      const recheck = classroomEmbeddingCache.get(classroomId);
      if (recheck && (Date.now() - recheck.createdAt) < CLASSROOM_CACHE_TTL_MS
          && recheck.workCount >= memoriesWithDescriptions.length) {
        resolve(recheck.embeddings);
        return;
      }

      if (!tokenizer || !textModel) {
        console.warn('[CLIP] Text model not ready for classroom embedding build');
        resolve(new Map());
        return;
      }

      console.log(`[CLIP] Building per-classroom embeddings for ${classroomId} (${memoriesWithDescriptions.length} works)`);
      const startMs = Date.now();
      const embMap = new Map<string, Float32Array>();

      // Timeout: prevent hanging on bad ONNX state
      const timeoutPromise = new Promise<'timeout'>((res) => {
        setTimeout(() => res('timeout'), CLASSROOM_EMBEDDING_TIMEOUT_MS);
      });

      const buildWork = async () => {
        for (const vm of memoriesWithDescriptions) {
          try {
            const prompt = `${vm.work_name}. ${vm.visual_description}`.slice(0, 512);
            const emb = await embedText(prompt);
            if (emb) {
              embMap.set(vm.work_key, emb);
            }
          } catch (err) {
            console.warn(`[CLIP] Failed to embed visual memory for ${vm.work_key}:`, err instanceof Error ? err.message : String(err));
          }
        }
        return 'done' as const;
      };

      const result = await Promise.race([buildWork(), timeoutPromise]);

      if (result === 'timeout') {
        console.warn(`[CLIP] Classroom embedding build timed out after ${CLASSROOM_EMBEDDING_TIMEOUT_MS}ms — using ${embMap.size} partial embeddings`);
      }

      // LRU eviction: remove oldest if over limit
      if (classroomEmbeddingCache.size >= CLASSROOM_CACHE_MAX) {
        let oldestKey = '';
        let oldestTime = Infinity;
        for (const [key, entry] of classroomEmbeddingCache) {
          if (entry.createdAt < oldestTime) {
            oldestTime = entry.createdAt;
            oldestKey = key;
          }
        }
        if (oldestKey) {
          classroomEmbeddingCache.delete(oldestKey);
          console.log(`[CLIP] LRU evicted classroom ${oldestKey} from embedding cache`);
        }
      }

      classroomEmbeddingCache.set(classroomId, {
        embeddings: embMap,
        createdAt: Date.now(),
        workCount: embMap.size,
      });

      console.log(`[CLIP] Built ${embMap.size} per-classroom embeddings in ${Date.now() - startMs}ms`);
      resolve(embMap);
    }).catch((err) => {
      console.error('[CLIP] Classroom embedding build error:', err);
      resolve(new Map());
    });
  });

  return classroomMap;
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

      // Load transformers module and initialize separate text/vision models
      // SigLIP has separate encoders — the generic pipeline('feature-extraction')
      // defaults to vision encoder and crashes on text input with "Missing pixel_values"
      const transformers = await getTransformersModule();
      const { AutoTokenizer, SiglipTextModel, AutoProcessor, SiglipVisionModel } = transformers;

      console.log(`[CLIP] Loading text model: ${CLIP_MODEL}`);
      tokenizer = await AutoTokenizer.from_pretrained(CLIP_MODEL);
      textModel = await SiglipTextModel.from_pretrained(CLIP_MODEL);
      console.log('[CLIP] Text model loaded successfully');

      console.log(`[CLIP] Loading vision model: ${CLIP_MODEL}`);
      processor = await AutoProcessor.from_pretrained(CLIP_MODEL);
      visionModel = await SiglipVisionModel.from_pretrained(CLIP_MODEL);
      console.log('[CLIP] Vision model loaded successfully');

      // Diagnostic: log output keys from both models so we know which keys to use
      try {
        const testTextInputs = tokenizer('test', { padding: 'max_length', truncation: true });
        const testTextResult = await textModel(testTextInputs);
        console.log('[CLIP] Text model output keys:', Object.keys(testTextResult));
        for (const key of Object.keys(testTextResult)) {
          const val = testTextResult[key];
          if (val?.dims) console.log(`[CLIP]   ${key}: dims=${JSON.stringify(val.dims)}, dtype=${val.type}`);
        }
      } catch (err) {
        console.warn('[CLIP] Text model diagnostic failed:', err instanceof Error ? err.message : String(err));
      }

      // Pre-compute text embeddings for areas using rich AREA_SIGNATURES descriptions
      console.log('[CLIP] Pre-computing area embeddings...');
      for (const area of areas) {
        const richDescription = AREA_SIGNATURES[area.area_key] || `A Montessori ${area.name} work or material`;
        const areaEmb = await embedText(richDescription);
        if (!areaEmb) {
          console.warn(`[CLIP] Failed to compute area embedding for ${area.area_key} — skipping`);
          continue;
        }
        areaEmbeddings.set(area.area_key, areaEmb);
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
          // 512 chars preserves ~90% of visual descriptions (256 was losing ~60% of critical disambiguation text)
          prompt = `${signature.name}. ${signature.visual_description}`.slice(0, 512);
          richCount++;
        } else {
          // Fallback to curriculum description — pedagogical but still useful
          // 512 chars preserves ~90% of visual descriptions (256 was losing ~60% of critical disambiguation text)
          prompt = `${work.name}. ${work.description || work.materials?.join(', ') || ''}`.slice(0, 512);
        }
        const emb = await embedText(prompt);
        if (!emb) {
          console.warn(`[CLIP] Failed to compute embedding for ${work.work_key} — skipping`);
          continue;
        }
        textEmbeddings.set(work.work_key, emb);
        embeddingCount++;

        // Log progress every 50 works
        if (embeddingCount % 50 === 0) {
          console.log(`[CLIP] Computed ${embeddingCount}/${allWorks.length} work embeddings`);
        }
      }
      console.log(`[CLIP] Pre-computed ${embeddingCount} work embeddings (${richCount} with rich visual descriptions)`);

      // Pre-compute negative embeddings for disambiguation
      console.log('[CLIP] Pre-computing negative embeddings...');
      let negativeCount = 0;
      for (const work of allWorks) {
        const negDescs = getNegativeDescriptions(work.work_key);
        if (negDescs.length === 0) continue;

        const negEmbeds: Float32Array[] = [];
        for (const desc of negDescs) {
          try {
            const negEmb = await embedText(desc);
            if (negEmb) {
              negEmbeds.push(negEmb);
              negativeCount++;
            }
          } catch { /* skip individual negative embedding failures */ }
        }
        if (negEmbeds.length > 0) {
          negativeEmbeddings.set(work.work_key, negEmbeds);
        }

        // Cache confusion pairs for this work
        const pairs = getConfusionPairsForWork(work.work_key);
        if (pairs.length > 0) {
          confusionPairMap.set(work.work_key, pairs);
        }
      }
      console.log(`[CLIP] Pre-computed ${negativeCount} negative embeddings across ${negativeEmbeddings.size} works`);

      // CRITICAL GUARD: If we computed zero embeddings, init is broken — fail loudly
      // This prevents the silent "init succeeds but everything returns null" failure mode
      if (areaEmbeddings.size === 0) {
        throw new Error(`CLIP init produced 0 area embeddings (expected 5). embedText() is likely returning null — check text model output keys above.`);
      }
      if (textEmbeddings.size === 0) {
        throw new Error(`CLIP init produced 0 work embeddings (expected ~270). embedText() is likely returning null — check text model output keys above.`);
      }
      if (textEmbeddings.size < 100) {
        console.warn(`[CLIP] WARNING: Only ${textEmbeddings.size} work embeddings computed (expected ~270) — some works will be unrecognizable`);
      }

      initialized = true;
      const elapsed = Date.now() - startTime;
      console.log(`[CLIP] Initialization complete (${elapsed}ms) — ${areaEmbeddings.size} areas, ${textEmbeddings.size} works, ${negativeEmbeddings.size} negative sets`);
    };

    try {
      await Promise.race([initWork(), initTimeoutPromise]);
    } catch (error) {
      // Cleanup partial state to prevent memory leak
      tokenizer = null;
      textModel = null;
      processor = null;
      visionModel = null;
      textEmbeddings.clear();
      negativeEmbeddings.clear();
      confusionPairMap.clear();
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

export async function classifyImage(
  imageUrl: string,
  classroomOverrides?: Map<string, Float32Array>,
): Promise<ClassifyResult | null> {
  if (!initialized || !visionModel || !processor) {
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
        classifyImageInternal(imageUrl, startTime, classroomOverrides),
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

async function classifyImageInternal(
  imageUrl: string,
  startTime: number,
  classroomOverrides?: Map<string, Float32Array>,
): Promise<ClassifyResult | null> {
  try {
    // Use separate SiglipVisionModel + AutoProcessor to compute image embeddings.
    // The generic pipeline('feature-extraction') defaults to vision encoder for SigLIP
    // and crashes on text input — so we use separate models for text vs images.
    console.log(`[CLIP] classifyImageInternal — embeddings available: ${textEmbeddings.size} works, ${areaEmbeddings.size} areas`);
    console.log(`[CLIP] Downloading image via RawImage: ${imageUrl.slice(0, 100)}...`);
    const imageVec = await embedImage(imageUrl);
    if (!imageVec) {
      console.warn('[CLIP] Vision model returned null/undefined embedding — image download or model inference failed');
      return null;
    }
    console.log(`[CLIP] Image embedding computed: ${imageVec.length} dimensions`);

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
      const workVec = classroomOverrides?.get(work.work_key) || textEmbeddings.get(work.work_key);
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
          const workVec = classroomOverrides?.get(work.work_key) || textEmbeddings.get(work.work_key);
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

    // ================================================================
    // NEGATIVE EMBEDDING PENALTY
    // For the top match, check if the image is ALSO similar to what this
    // work is NOT. If so, subtract a weighted penalty to suppress false positives.
    // ================================================================
    const rawConfidence = bestWorkConfidence;
    let negativePenaltyApplied = false;
    let confusionPairMatched: string | null = null;

    if (bestWork) {
      const negEmbeds = negativeEmbeddings.get(bestWork.work_key);
      if (negEmbeds && negEmbeds.length > 0) {
        let maxNegSimilarity = 0;
        for (const negVec of negEmbeds) {
          const negSim = cosineSimilarity(imageVec, negVec);
          if (negSim > maxNegSimilarity) maxNegSimilarity = negSim;
        }
        if (maxNegSimilarity > 0.3) { // Only penalize if negative match is meaningful
          const confidenceGap = bestWorkConfidence - maxNegSimilarity;
          if (confidenceGap < NEGATIVE_EMBEDDING_MARGIN) {
            const marginDeficit = NEGATIVE_EMBEDDING_MARGIN - confidenceGap;
            const penalty = marginDeficit * NEGATIVE_EMBEDDING_WEIGHT;
            bestWorkConfidence = Math.max(0, bestWorkConfidence - penalty);
            negativePenaltyApplied = true;
            console.log(`[CLIP] Margin-based penalty: gap=${confidenceGap.toFixed(3)}, deficit=${marginDeficit.toFixed(3)}, penalty=${penalty.toFixed(3)}, ${rawConfidence.toFixed(3)} -> ${bestWorkConfidence.toFixed(3)} for ${bestWork.work_key}`);
          } else {
            console.log(`[CLIP] Negative match found but gap sufficient: gap=${confidenceGap.toFixed(3)} >= margin=${NEGATIVE_EMBEDDING_MARGIN} for ${bestWork.work_key}`);
          }
        }
      }

      // Check if runner-up is a known confusion pair — useful for Haiku differentiation
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
      console.log(`[CLIP] Work confidence below threshold: ${bestWorkConfidence.toFixed(3)} < ${CLIP_CONFIDENCE_THRESHOLD}`);
      return null;
    }

    const classificationMs = Date.now() - startTime;
    console.log(
      `[CLIP] Classification complete: ${bestWork.work_key} (raw: ${rawConfidence.toFixed(3)}, final: ${bestWorkConfidence.toFixed(3)}) in ${classificationMs}ms`
    );

    const result: ClassifyResult = {
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
  // Build per-classroom embeddings if visual memories provided
  let classroomOverrides: Map<string, Float32Array> | undefined;
  if (classroomId && visualMemories && visualMemories.length > 0) {
    classroomOverrides = await ensureClassroomEmbeddings(classroomId, visualMemories);
    if (classroomOverrides.size === 0) classroomOverrides = undefined;
  }

  const result = await classifyImage(imageUrl, classroomOverrides);
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
  return initialized && tokenizer !== null && textModel !== null && processor !== null && visionModel !== null && textEmbeddings.size > 0;
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
    works_loaded: textEmbeddings.size,
    areas_loaded: areaEmbeddings.size,
    negative_embeddings_loaded: negativeEmbeddings.size,
    confusion_pairs_loaded: confusionPairMap.size,
    classroom_caches: classroomEmbeddingCache.size,
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

/** Invalidate cached per-classroom embeddings when visual memory changes */
export function invalidateClassroomEmbeddings(classroomId: string): void {
  if (classroomEmbeddingCache.delete(classroomId)) {
    console.log(`[CLIP] Invalidated classroom embedding cache for ${classroomId}`);
  }
}
