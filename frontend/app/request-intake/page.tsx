"use client";

import { Play, Send } from "lucide-react";
import { FormEvent, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { createIntake, runCandidate } from "@/lib/api";
import type { CandidateTask } from "@/lib/types";

const exampleContent =
  "조직행동검사 5페이지 문구를 수정하자. A유형 B유형 상담 사례는 학습 후보로 저장하자. 공공기관 제안서 프로그램도 기획해보자.";

export default function RequestIntakePage() {
  const [title, setTitle] = useState("회의록");
  const [inputType, setInputType] = useState("meeting_notes");
  const [rawContent, setRawContent] = useState("");
  const [candidates, setCandidates] = useState<CandidateTask[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runningCandidateId, setRunningCandidateId] = useState<string | null>(null);
  const [runApprovals, setRunApprovals] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");
    setRunApprovals({});

    try {
      const response = await createIntake({
        title,
        input_type: inputType,
        raw_content: rawContent,
        source: "manual",
      });
      setCandidates(response.candidate_tasks);
      setMessage(`작업 후보 ${response.candidate_tasks.length}개를 추출했습니다.`);
    } catch (err) {
      setCandidates([]);
      setError(err instanceof Error ? err.message : "작업 후보 추출에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRunCandidate(candidate: CandidateTask) {
    setRunningCandidateId(candidate.id);
    setError("");

    try {
      const response = await runCandidate(candidate.id);
      setRunApprovals((current) => ({
        ...current,
        [candidate.id]: response.approval_id,
      }));
      setMessage(`작업을 실행했습니다. 승인 ID: ${response.approval_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "작업 실행에 실패했습니다.");
    } finally {
      setRunningCandidateId(null);
    }
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="border-b border-border pb-5">
          <h1 className="text-2xl font-semibold text-[#1F2723]">Request Console</h1>
          <p className="mt-2 text-sm leading-6 text-[#5F6B64]">
            회의록, 상담 전사록, 메모를 붙여넣으면 작업 후보 카드로 분리합니다.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="rounded-card border border-border bg-surface p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="block">
              <span className="text-xs font-semibold text-[#5F6B64]">제목</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                className="mt-1 h-10 w-full rounded-button border border-border bg-white px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[#5F6B64]">입력 유형</span>
              <select
                value={inputType}
                onChange={(event) => setInputType(event.target.value)}
                className="mt-1 h-10 w-full rounded-button border border-border bg-white px-3 text-sm outline-none focus:border-primary"
              >
                <option value="meeting_notes">meeting_notes</option>
                <option value="transcript">transcript</option>
                <option value="memo">memo</option>
              </select>
            </label>
          </div>

          <label className="mt-3 block">
            <span className="text-xs font-semibold text-[#5F6B64]">원문</span>
            <textarea
              value={rawContent}
              onChange={(event) => setRawContent(event.target.value)}
              required
              rows={8}
              placeholder={exampleContent}
              className="mt-1 w-full resize-y rounded-card border border-border bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-primary"
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} aria-hidden="true" />
              {isSubmitting ? "추출 중" : "작업 후보 추출"}
            </button>
            {message ? <p className="text-sm font-medium text-success">{message}</p> : null}
            {error ? <p role="alert" className="text-sm font-medium text-danger">{error}</p> : null}
          </div>
        </form>

        {candidates.length > 0 ? (
          <section className="space-y-3" aria-label="작업 후보">
            {candidates.map((candidate) => {
              const approvalId = runApprovals[candidate.id];
              const isRunning = runningCandidateId === candidate.id;
              const hasRun = Boolean(approvalId);

              return (
                <article key={candidate.id} className="rounded-card border border-border bg-surface p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-button bg-surfaceAlt px-2 py-1 text-xs font-semibold text-primary">
                          {candidate.task_type}
                        </span>
                        <span className="text-xs font-medium text-[#5F6B64]">{candidate.status}</span>
                      </div>
                      <h2 className="mt-3 text-base font-semibold text-[#1F2723]">{candidate.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-[#5F6B64]">{candidate.summary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRunCandidate(candidate)}
                      disabled={isRunning || hasRun}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-button bg-analysis px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Play size={16} aria-hidden="true" />
                      {hasRun ? "실행 완료" : isRunning ? "실행 중" : "작업 실행"}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="rounded-card border border-border bg-surfaceAlt p-3">
                      <h3 className="text-xs font-semibold text-[#5F6B64]">근거 발췌</h3>
                      <p className="mt-2 text-sm leading-6 text-[#1F2723]">{candidate.evidence_excerpt}</p>
                    </div>
                    <div className="rounded-card border border-border bg-surfaceAlt p-3">
                      <h3 className="text-xs font-semibold text-[#5F6B64]">추천 에이전트</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {candidate.recommended_agents.map((agent) => (
                          <span key={agent} className="rounded-button bg-white px-2 py-1 text-xs font-semibold text-[#1F2723]">
                            {agent}
                          </span>
                        ))}
                      </div>
                      {approvalId ? <p className="mt-3 text-xs font-medium text-success">승인 ID: {approvalId}</p> : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
