// scripts/test_mira_knowledge.ts
// Verify Mira's knowledge base loads from disk and the summary fits the
// rough token budget (~3-4K tokens = ~16K chars).
//
// Run:
//   npx tsx scripts/test_mira_knowledge.ts

import {
  getMiraKnowledge,
  getMiraKnowledgeSummary,
} from '../lib/montree/mira/knowledge/loader';

async function main() {
  const k = await getMiraKnowledge();
  const sections = Object.entries(k);
  console.log(`Loaded ${sections.length} knowledge sections.`);
  for (const [key, body] of sections) {
    const lines = body.split('\n').length;
    const chars = body.length;
    const placeholder = body.includes('unavailable');
    console.log(`  ${key.padEnd(14)} ${String(lines).padStart(4)} lines  ${String(chars).padStart(6)} chars${placeholder ? '  ⚠ MISSING' : ''}`);
  }
  const total = sections.reduce((acc, [, b]) => acc + b.length, 0);
  console.log(`Total: ${total} chars (~${Math.round(total / 4)} tokens approx)`);

  const summary = await getMiraKnowledgeSummary();
  console.log(`\nSummary: ${summary.length} chars (~${Math.round(summary.length / 4)} tokens)`);
  console.log(`Summary fits 4K-token budget: ${summary.length < 16000 ? 'YES' : 'NO — trim'}`);

  console.log('\n--- Summary preview (first 1500 chars) ---');
  console.log(summary.slice(0, 1500));
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
