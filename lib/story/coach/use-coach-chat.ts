'use client';

// The Coach chat now lives in a shared provider (coach-chat-context) so the full
// page and the floating companion share ONE live conversation that survives
// in-app navigation + reload. This file re-exports the consumer hook so existing
// imports (`@/lib/story/coach/use-coach-chat`) keep working unchanged.

export { useCoachChat, type CoachMessage } from './coach-chat-context';
