// lib/montree/gloria/storage-keys.ts
// Per-agent localStorage namespace for Gloria. Mirrors lib/montree/tracy/storage-keys.ts
// so we never leak conversation context across agents who share a browser
// (rare but real — Tredoux on his own Mac, partner on theirs, etc.).

export const gloriaKeys = {
  agentConvId(agentId: string): string {
    return `montree.agent.gloriaConvId.${agentId}`;
  },
  agentConv(agentId: string, convId: string): string {
    return `montree.agent.gloriaConv.${agentId}.${convId}`;
  },
  hasMet(agentId: string): string {
    return `montree.gloriaFloat.hasMet.${agentId}`;
  },
  greetedSession(agentId: string): string {
    return `montree.gloriaFloat.greetedSession.${agentId}`;
  },
  // UI-only key — same across agents (just whether the float panel is open).
  floatOpen: 'montree.gloriaFloat.open',
};
