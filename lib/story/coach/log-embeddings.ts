// lib/story/coach/log-embeddings.ts
//
// Diary-recall embedding helper — self-contained to lib/story/* (no lib/montree
// import, so the coach stays independent). Mirrors the montree tracy embeddings
// precedent (OpenAI text-embedding-3-small, 1536 dims, raw fetch, 15s abort) but
// is FAIL-OPEN: any error / a missing OPENAI_API_KEY → null, so recall degrades
// to the keyword path and write-time embedding is skipped silently.
//
// Used to make story_coach_log (the permanent verbatim diary) semantically
// searchable by recall_history.

const OPENAI_EMBEDDING_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 1536;
const EMBED_INPUT_CAP = 8000;
const EMBED_TIMEOUT_MS = 15_000;

let _warnedNoKey = false;

/**
 * Embed a string → 1536-dim vector, or null. NEVER throws — every failure path
 * returns null so callers can fall back to keyword search / skip indexing.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if (!_warnedNoKey) {
      _warnedNoKey = true;
      console.warn('[coach/log-embeddings] OPENAI_API_KEY absent — Diary Recall falls back to keyword search');
    }
    return null;
  }
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMBED_TIMEOUT_MS);
  try {
    const res = await fetch(OPENAI_EMBEDDING_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: trimmed.slice(0, EMBED_INPUT_CAP),
        encoding_format: 'float',
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[coach/log-embeddings] embed HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    const emb = data.data?.[0]?.embedding;
    if (!Array.isArray(emb) || emb.length !== EMBEDDING_DIMS) {
      console.warn('[coach/log-embeddings] unexpected embed response shape');
      return null;
    }
    return emb;
  } catch (e) {
    console.warn('[coach/log-embeddings] embed failed:', e instanceof Error ? e.message : 'unknown');
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export { EMBEDDING_DIMS, EMBEDDING_MODEL };
