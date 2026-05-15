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
      "http://localhost:8000/intake",
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

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/approvals", {
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
      "http://localhost:8000/tasks/from-candidate/candidate-1/run",
      { method: "POST" },
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
      "http://localhost:8000/approvals/approval-1/decide",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "rejected", reason: "근거 부족" }),
      }),
    );
  });
});
