import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { AgentStatus } from "@/lib/types";

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

function resolveSharedSeedsPath() {
  const candidates = [
    resolve(process.cwd(), "..", "shared", "agent-seeds.json"),
    resolve(process.cwd(), "shared", "agent-seeds.json"),
  ];
  const seedsPath = candidates.find((candidate) => existsSync(candidate));

  if (!seedsPath) {
    throw new Error("Unable to locate shared/agent-seeds.json");
  }

  return seedsPath;
}

export const agentSeeds = JSON.parse(
  readFileSync(resolveSharedSeedsPath(), "utf-8"),
) as AgentSeed[];
