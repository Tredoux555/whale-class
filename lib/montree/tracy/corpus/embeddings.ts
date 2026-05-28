// lib/montree/tracy/corpus/embeddings.ts
//
// Ultimate Tracy Phase C — embedding helper.
//
// Uses OpenAI text-embedding-3-small (1536 dims, ~$0.00002 per insight —
// negligible). Same OPENAI_API_KEY already used for Whisper.
//
// embedText(text) → Promise<number[1536]>
//
// Failure mode: throws. Callers MUST catch — corpus extraction wraps in
// try/catch and skips on failure.

const OPENAI_EMBEDDING_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 1536;

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY env var missing');
  }
  const trimmed = (text || '').trim();
  if (trimmed.length === 0) {
    throw new Error('empty text');
  }

  // 🚨 Hard 15s timeout. Without this, a hung OpenAI fetch blocks
  // prepare_parent_meeting indefinitely (the orchestrator's
  // TOTAL_TIMEOUT_MS fires first and the principal sees silence).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let res: Response;
  try {
    res = await fetch(OPENAI_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: trimmed.slice(0, 8000),
        encoding_format: 'float',
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`embedText HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    data?: Array<{ embedding: number[] }>;
  };
  const emb = data.data?.[0]?.embedding;
  if (!Array.isArray(emb) || emb.length !== EMBEDDING_DIMS) {
    throw new Error('embedText: unexpected response shape');
  }
  return emb;
}

/**
 * Embed a batch of texts in parallel. Useful for the extraction
 * pipeline (5 corpus entries per analysis × N unprocessed analyses).
 *
 * One OpenAI request per text — they're independent. Concurrency cap
 * at 5 to keep request rate friendly.
 */
export async function embedTextBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const out: number[][] = new Array(texts.length);
  const CONCURRENCY = 5;
  let cursor = 0;
  const workers = new Array(Math.min(CONCURRENCY, texts.length))
    .fill(0)
    .map(async () => {
      while (true) {
        const i = cursor++;
        if (i >= texts.length) return;
        out[i] = await embedText(texts[i]);
      }
    });
  await Promise.all(workers);
  return out;
}

export { EMBEDDING_DIMS, EMBEDDING_MODEL };
