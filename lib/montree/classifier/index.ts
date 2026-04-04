// lib/montree/classifier/index.ts
// Barrel exports for the Montessori work classifier system

// Stub exports from disabled CLIP classifier (interfaces only)
export {
  type ClassifyResult,
  type VisualMemory,
  invalidateClassroomEmbeddings,
} from './clip-classifier';

// Work signature data (valuable for future Haiku Visual ID Guide enrichment)
export {
  WORK_SIGNATURES,
  AREA_SIGNATURES,
  WORK_SIGNATURES_STATS,
  getSignaturesByArea,
  getSignatureByKey,
  getWorkKeysForArea,
  getConfusionPairsForWork,
  getNegativeDescriptions,
  type WorkSignature,
  type ConfusionPair,
} from './work-signatures';

// Classify orchestrator (always routes to Haiku two-pass)
export {
  tryClassify,
  isClipAvailable,
  getClipDiagnostics,
  type ClassifyDecision,
} from './classify-orchestrator';

// Classroom onboarding status (used by photo-insight to decide Sonnet vs Haiku)
export {
  getClassroomOnboardingStatus,
  invalidateOnboardingCache,
  clearOnboardingCache,
  type OnboardingStatus,
} from './classroom-embeddings';

// Chinese glossary for Haiku prompts
export {
  MONTESSORI_GLOSSARY_ZH,
  getGlossaryPromptSection,
} from './montessori-glossary-zh';
