// lib/montree/agent-messaging/types.ts
// Session 104 — types for the agent → principal messaging surface.

export interface MessagingAgent {
  agentId: string;
  agentName: string;
  schoolIds: string[]; // schools founded by this agent
}

export interface AgentRecipientPrincipal {
  id: string;
  name: string;
}

export interface AgentRecipientSchool {
  school_id: string;
  school_name: string;
  principal: AgentRecipientPrincipal | null;
}
