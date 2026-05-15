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
  | "split"
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
  rule_hint_task_type?: string | null;
  ai_task_type?: string;
  classification_source?: string;
  classification_status?: string;
  confidence?: number;
  classification_reason?: string;
  approval_required?: boolean;
  rule_hints?: string[];
  review_flags?: string[];
}

export interface GraphNodeTrace {
  name: string;
  status: string;
  summary: string;
}

export interface IntakeResponse {
  id: string;
  title: string;
  input_type: string;
  raw_content: string;
  decomposition_graph_name?: string | null;
  human_review_required?: boolean;
  decomposition_trace?: GraphNodeTrace[];
  candidate_tasks: CandidateTask[];
}

export interface CandidateSplitResponse {
  original_candidate: CandidateTask;
  split_candidates: CandidateTask[];
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
  revision_candidate_task?: CandidateTask | null;
}

export interface DashboardSummary {
  agent_count: number;
  active_agent_count: number;
  candidate_task_count: number;
  running_task_count: number;
  pending_approval_count: number;
  artifact_count: number;
}

export type AgentActivityStatus = "working" | "waiting_approval" | "queued" | "idle" | "planned";
export type AgentWorkItemSource = "candidate" | "task" | "approval";

export interface AgentWorkItem {
  id: string;
  source_type: AgentWorkItemSource;
  title: string;
  summary: string;
  task_type: string;
  status: string;
  href: string;
}

export interface AgentActivity {
  id: string;
  display_name: string;
  role: string;
  color: string;
  enabled: boolean;
  status: AgentStatus | string;
  activity_status: AgentActivityStatus;
  current_focus: string;
  current_task_title: string | null;
  current_task_type: string | null;
  workload_count: number;
  pending_approval_count: number;
  candidate_count: number;
  work_items: AgentWorkItem[];
}

export interface AgentActivityResponse {
  agents: AgentActivity[];
}

export interface WorkflowStepActivity {
  id: string;
  step_name: string;
  agent_id: string | null;
  input_summary: string;
  output_summary: string;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export interface WorkflowRunActivity {
  id: string;
  workflow_type: string;
  task_id: string | null;
  task_title: string | null;
  task_type: string | null;
  status: string;
  current_step: string;
  started_at: string;
  completed_at: string | null;
  steps: WorkflowStepActivity[];
}

export interface WorkflowActivityResponse {
  runs: WorkflowRunActivity[];
}
