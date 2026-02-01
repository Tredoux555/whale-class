// lib/montree/guru/index.ts
// Montessori Guru - AI Assistant for Teachers
// Exports all guru-related functionality

export { buildChildContext, formatContextForPrompt } from './context-builder';
export type { ChildContext, MentalProfile, WorkProgress, Observation, PastInteraction, TeacherNote } from './context-builder';

export { retrieveKnowledge, formatKnowledgeForPrompt } from './knowledge-retriever';
export type { KnowledgeResult } from './knowledge-retriever';

export { buildGuruPrompt, parseGuruResponse } from './prompt-builder';
export type { GuruPromptParts, ParsedGuruResponse } from './prompt-builder';
