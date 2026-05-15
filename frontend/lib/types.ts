import type { statusColors } from "./design-tokens";

export type AgentStatus = keyof typeof statusColors;

export type ApprovalStatus =
  | "pending_approval"
  | "waiting_for_approval"
  | "approved"
  | "rejected"
  | "revise_requested";

export type CandidateTaskStatus =
  | "draft"
  | "planned"
  | "working"
  | "reviewing"
  | "approved"
  | "rejected"
  | "error";

export interface Agent {
  id: string;
  name: string;
  display_name: string;
  role: string;
  description: string;
  status: AgentStatus;
  default_model_provider: string;
  default_model_name: string;
  prompt: string;
  enabled: boolean;
  color: string;
  created_at?: string;
  updated_at?: string;
}

export interface CandidateTask {
  id: string;
  task_type: string;
  title: string;
  summary: string;
  evidence_excerpt: string;
  recommended_agents: string[];
  status: CandidateTaskStatus | string;
}

export interface IntakeResponse {
  id: string;
  title: string;
  input_type: string;
  raw_content: string;
  candidate_tasks: CandidateTask[];
}

export interface Approval {
  id: string;
  task_id: string;
  artifact_id: string;
  approval_type: string;
  title: string;
  summary: string;
  status: ApprovalStatus;
  before_content: string;
  after_content: string;
  affected_area: string;
  reviewer_note: string;
}

export interface DashboardSummary {
  agent_count: number;
  active_agent_count: number;
  candidate_task_count: number;
  running_task_count: number;
  pending_approval_count: number;
  artifact_count: number;
}
