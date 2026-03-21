// lib/montree/classifier/index.ts
// Barrel exports for the CLIP-based Montessori work classifier

export {
  initClassifier,
  classifyImage,
  classifyImageWithMemory,
  isClassifierReady,
  getClassifierStats,
  resetInitError,
  // getConfusionDifferentiation, // TEMP: not yet pushed to git — re-enable after pushing clip-classifier.ts
  type ClassifyResult,
  type VisualMemory,
} from './clip-classifier';

export {
  WORK_SIGNATURES,
  AREA_SIGNATURES,
  WORK_SIGNATURES_STATS,
  getSignaturesByArea,
  getSignatureByKey,
  getWorkKeysForArea,
  getConfusionPairsForWork,
  type WorkSignature,
} from './work-signatures';

export {
  tryClassify,
  isClipAvailable,
  getClipDiagnostics,
  type ClassifyDecision,
} from './classify-orchestrator';
