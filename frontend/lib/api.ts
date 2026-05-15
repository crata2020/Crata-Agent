import type {
  AgentActivityResponse,
  Approval,
  CandidateTask,
  DashboardSummary,
  IntakeResponse,
  WorkflowActivityResponse,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

type IntakePayload = {
  title: string;
  input_type: string;
  raw_content: string;
  source?: string;
};

export type CandidateUpdatePayload = {
  title: string;
  summary: string;
  recommended_agents: string[];
};

export type ApprovalDecision = "approved" | "rejected" | "revise_requested";

export type RunCandidateResponse = {
  task_id: string;
  workflow_run_id: string;
  artifact_id: string;
  approval_id: string;
  status: string;
};

export type RunCandidateResult = RunCandidateResponse & {
  candidate_id: string;
};

export type RunCandidatesResponse = {
  results: RunCandidateResult[];
};

function apiUrl(path: string) {
  return `${API_BASE.replace(/\/$/, "")}${path}`;
}

async function parseError(response: Response) {
  let detail = "";

  try {
    const body = await response.json();
    if (typeof body?.detail === "string") {
      detail = `: ${body.detail}`;
    }
  } catch {
    detail = "";
  }

  return new Error(`요청 처리에 실패했습니다. (${response.status})${detail}`);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init);

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<T>;
}

export function createIntake(payload: IntakePayload) {
  return requestJson<IntakeResponse>("/intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function listCandidateTasks() {
  return requestJson<CandidateTask[]>("/intake/candidates", { cache: "no-store" });
}

export function runCandidate(candidateId: string) {
  return requestJson<RunCandidateResponse>(`/tasks/from-candidate/${candidateId}/run`, {
    method: "POST",
  });
}

export function runCandidates(candidateIds: string[]) {
  return requestJson<RunCandidatesResponse>("/tasks/from-candidates/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidate_ids: candidateIds }),
  });
}

export function updateCandidate(candidateId: string, payload: CandidateUpdatePayload) {
  return requestJson<CandidateTask>(`/intake/candidates/${candidateId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function listApprovals() {
  return requestJson<Approval[]>("/approvals", { cache: "no-store" });
}

export function getDashboardSummary() {
  return requestJson<DashboardSummary>("/dashboard/summary", { cache: "no-store" });
}

export function getAgentActivity() {
  return requestJson<AgentActivityResponse>("/dashboard/agent-activity", { cache: "no-store" });
}

export function getWorkflowActivity() {
  return requestJson<WorkflowActivityResponse>("/dashboard/workflow-activity", { cache: "no-store" });
}

export function decideApproval(id: string, decision: ApprovalDecision, reason = "") {
  return requestJson<Approval>(`/approvals/${id}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, reason }),
  });
}
