import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("api client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_BASE;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("posts intake payloads to the default backend base", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "intake-1", candidate_tasks: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { createIntake } = await import("@/lib/api");

    await createIntake({
      title: "회의록",
      input_type: "meeting_notes",
      raw_content: "작업 후보를 추출한다.",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/intake",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "회의록",
          input_type: "meeting_notes",
          raw_content: "작업 후보를 추출한다.",
        }),
      }),
    );
  });

  it("requests approvals without server-side caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { listApprovals } = await import("@/lib/api");

    await listApprovals();

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/approvals", {
      cache: "no-store",
    });
  });

  it("requests candidate tasks without server-side caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { listCandidateTasks } = await import("@/lib/api");

    await listCandidateTasks();

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/intake/candidates", {
      cache: "no-store",
    });
  });

  it("requests dashboard summary without server-side caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidate_task_count: 3, pending_approval_count: 2 }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getDashboardSummary } = await import("@/lib/api");

    await getDashboardSummary();

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/dashboard/summary", {
      cache: "no-store",
    });
  });

  it("requests agent activity without server-side caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ agents: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getAgentActivity } = await import("@/lib/api");

    await getAgentActivity();

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/dashboard/agent-activity", {
      cache: "no-store",
    });
  });

  it("requests workflow activity without server-side caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ runs: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getWorkflowActivity } = await import("@/lib/api");

    await getWorkflowActivity();

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/dashboard/workflow-activity", {
      cache: "no-store",
    });
  });

  it("runs a candidate task by candidate id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ task_id: "task-1", approval_id: "approval-1" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { runCandidate } = await import("@/lib/api");

    await runCandidate("candidate-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/tasks/from-candidate/candidate-1/run",
      { method: "POST" },
    );
  });

  it("runs multiple candidate tasks in one request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ candidate_id: "candidate-1", approval_id: "approval-1" }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { runCandidates } = await import("@/lib/api");

    await runCandidates(["candidate-1", "candidate-2"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/tasks/from-candidates/run",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_ids: ["candidate-1", "candidate-2"] }),
      }),
    );
  });

  it("patches a candidate task before execution", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "candidate-1", title: "수정 후보" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { updateCandidate } = await import("@/lib/api");

    await updateCandidate("candidate-1", {
      title: "수정 후보",
      summary: "실행 전 후보를 정리한다.",
      recommended_agents: ["crata_ceo", "report_editor"],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/intake/candidates/candidate-1",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "수정 후보",
          summary: "실행 전 후보를 정리한다.",
          recommended_agents: ["crata_ceo", "report_editor"],
        }),
      }),
    );
  });

  it("splits a candidate task into separate request parts", async () => {
    const parts = ["문구수정하고", "기획서 작성해줘."];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ original_candidate: { id: "candidate-1" }, split_candidates: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { splitCandidate } = await import("@/lib/api");

    await splitCandidate("candidate-1", parts);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/intake/candidates/candidate-1/split",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts }),
      }),
    );
  });

  it("posts approval decisions with an optional reason", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "approval-1", status: "rejected" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { decideApproval } = await import("@/lib/api");

    await decideApproval("approval-1", "rejected", "근거 부족");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/approvals/approval-1/decide",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "rejected", reason: "근거 부족" }),
      }),
    );
  });
});
