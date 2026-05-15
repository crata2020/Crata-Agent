import type { AgentStatus } from "@/lib/types";
import sharedAgentSeeds from "@/data/agent-seeds.json";

export interface AgentSeed {
  id: string;
  name: string;
  display_name: string;
  role: string;
  description: string;
  status: AgentStatus;
  enabled: boolean;
  color: string;
}

export const agentSeeds = sharedAgentSeeds as AgentSeed[];
