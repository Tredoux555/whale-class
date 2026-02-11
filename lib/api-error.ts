// lib/api-error.ts
// Phase 8: Safe error logging utility — strips sensitive fields from error objects.
// Prevents database schema info (details, hint, stack) from leaking into logs or responses.

/**
 * Safe error logging — logs classification without sensitive fields.
 * Omits: details, hint, stack, query (these can leak schema info)
 */
export function safeErrorLog(context: string, error: unknown): void {
  const e = error as Record<string, unknown>;
  console.error(`[${context}]`, {
    message: e?.message || String(error),
    code: e?.code,
  });
}
