import type { Approval, IntakeResponse } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type IntakePayload = {
  title: string;
  input_type: string;
  raw_content: string;
  source?: string;
};

export type ApprovalDecision = "approved" | "rejected" | "revise_requested";

export type RunCandidateResponse = {
  task_id: string;
  workflow_run_id: string;
  artifact_id: string;
  approval_id: string;
  status: string;
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

export function runCandidate(candidateId: string) {
  return requestJson<RunCandidateResponse>(`/tasks/from-candidate/${candidateId}/run`, {
    method: "POST",
  });
}

export function listApprovals() {
  return requestJson<Approval[]>("/approvals", { cache: "no-store" });
}

export function decideApproval(id: string, decision: ApprovalDecision, reason = "") {
  return requestJson<Approval>(`/approvals/${id}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, reason }),
  });
}
