// lib/montree/mira/storage-keys.ts
// Per-agent localStorage namespace for Mira. Mirrors lib/montree/tracy/storage-keys.ts
// so we never leak conversation context across agents who share a browser
// (rare but real — Tredoux on his own Mac, partner on theirs, etc.).

export const miraKeys = {
  agentConvId(agentId: string): string {
    return `montree.agent.miraConvId.${agentId}`;
  },
  agentConv(agentId: string, convId: string): string {
    return `montree.agent.miraConv.${agentId}.${convId}`;
  },
  hasMet(agentId: string): string {
    return `montree.miraFloat.hasMet.${agentId}`;
  },
  greetedSession(agentId: string): string {
    return `montree.miraFloat.greetedSession.${agentId}`;
  },
  // UI-only key — same across agents (just whether the float panel is open).
  floatOpen: 'montree.miraFloat.open',
};
