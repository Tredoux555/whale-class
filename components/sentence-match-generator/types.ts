// Sentence-match generator reuses the canonical card-generator module.
// SentenceItem is an alias for Card — the underlying shape is identical;
// the `label` field holds a sentence in this context.
export type { Card as SentenceItem, ImageOffset, CropData, FrameCropState } from '../card-generator/types';
