"use client";

import { CheckCircle2, PauseCircle, Pencil, Play, Save, Send, X } from "lucide-react";
import { FormEvent, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { createIntake, runCandidate, updateCandidate } from "@/lib/api";
import {
  detectInputType,
  inputTypeLabels,
  resolveInputType,
  type InputTypeMode,
} from "@/lib/intake-input-type";
import type { CandidateTask } from "@/lib/types";

const exampleContent =
  "조직행동검사 5페이지 문구를 수정하자. A유형 B유형 상담 사례는 학습 후보로 저장하자. 공공기관 제안서 프로그램도 기획해보자.";

type CandidateEdit = {
  title: string;
  summary: string;
  recommendedAgentsText: string;
};

const taskTypeLabels: Record<string, string> = {
  report_phrase_revision: "결과지 문구 수정",
  counseling_case_learning: "상담 사례 학습",
  business_planning: "사업·프로그램 기획",
  content_marketing: "콘텐츠·홍보",
  general_agent_task: "일반 작업",
};

const candidateStatusLabels: Record<string, string> = {
  draft: "검토 필요",
  planned: "계획됨",
  working: "진행 중",
  reviewing: "검수 중",
  approved: "승인됨",
  rejected: "거절됨",
  error: "오류",
};

function candidateToEdit(candidate: CandidateTask): CandidateEdit {
  return {
    title: candidate.title,
    summary: candidate.summary,
    recommendedAgentsText: candidate.recommended_agents.join(", "),
  };
}

function parseRecommendedAgents(value: string) {
  return Array.from(new Set(value.split(/[\s,]+/).map((agent) => agent.trim()).filter(Boolean)));
}

export default function RequestIntakePage() {
  const [title, setTitle] = useState("회의록");
  const [inputType, setInputType] = useState<InputTypeMode>("auto");
  const [rawContent, setRawContent] = useState("");
  const [candidates, setCandidates] = useState<CandidateTask[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runningCandidateId, setRunningCandidateId] = useState<string | null>(null);
  const [runApprovals, setRunApprovals] = useState<Record<string, string>>({});
  const [candidateSelections, setCandidateSelections] = useState<Record<string, boolean>>({});
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [savingCandidateId, setSavingCandidateId] = useState<string | null>(null);
  const [candidateEdits, setCandidateEdits] = useState<Record<string, CandidateEdit>>({});
  const detectedInputType = detectInputType(title, rawContent);
  const resolvedInputType = resolveInputType(inputType, title, rawContent);
  const selectedCandidateCount = candidates.filter((candidate) => candidateSelections[candidate.id] !== false).length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");
    setRunApprovals({});

    try {
      const response = await createIntake({
        title,
        input_type: resolvedInputType,
        raw_content: rawContent,
        source: "manual",
      });
      setCandidates(response.candidate_tasks);
      setCandidateSelections(
        Object.fromEntries(response.candidate_tasks.map((candidate) => [candidate.id, true])),
      );
      setCandidateEdits(
        Object.fromEntries(response.candidate_tasks.map((candidate) => [candidate.id, candidateToEdit(candidate)])),
      );
      setEditingCandidateId(null);
      setMessage(`작업 후보 ${response.candidate_tasks.length}개를 추출했습니다.`);
    } catch (err) {
      setCandidates([]);
      setCandidateSelections({});
      setCandidateEdits({});
      setEditingCandidateId(null);
      setError(err instanceof Error ? err.message : "작업 후보 추출에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRunCandidate(candidate: CandidateTask) {
    if (editingCandidateId === candidate.id) {
      setError("수정 중인 후보는 저장하거나 취소한 뒤 실행하세요.");
      return;
    }
    if (candidateSelections[candidate.id] === false) {
      setError("보류한 후보는 실행할 수 없습니다. 실행 대상에 다시 포함한 뒤 실행하세요.");
      return;
    }

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

  function updateCandidateEdit(candidateId: string, patch: Partial<CandidateEdit>) {
    setCandidateEdits((current) => ({
      ...current,
      [candidateId]: {
        ...(current[candidateId] ?? { title: "", summary: "", recommendedAgentsText: "" }),
        ...patch,
      },
    }));
  }

  function startEditingCandidate(candidate: CandidateTask) {
    setError("");
    setMessage("");
    setEditingCandidateId(candidate.id);
    setCandidateEdits((current) => ({
      ...current,
      [candidate.id]: current[candidate.id] ?? candidateToEdit(candidate),
    }));
  }

  function cancelEditingCandidate(candidate: CandidateTask) {
    setEditingCandidateId(null);
    setCandidateEdits((current) => ({
      ...current,
      [candidate.id]: candidateToEdit(candidate),
    }));
  }

  async function saveCandidate(candidate: CandidateTask) {
    const edit = candidateEdits[candidate.id] ?? candidateToEdit(candidate);
    const nextTitle = edit.title.trim();
    const nextSummary = edit.summary.trim();
    const nextAgents = parseRecommendedAgents(edit.recommendedAgentsText);

    if (!nextTitle || !nextSummary || nextAgents.length === 0) {
      setError("후보 제목, 요약, 추천 에이전트를 모두 입력하세요.");
      return;
    }

    setSavingCandidateId(candidate.id);
    setError("");
    setMessage("");

    try {
      const updatedCandidate = await updateCandidate(candidate.id, {
        title: nextTitle,
        summary: nextSummary,
        recommended_agents: nextAgents,
      });
      setCandidates((current) =>
        current.map((currentCandidate) =>
          currentCandidate.id === updatedCandidate.id ? updatedCandidate : currentCandidate,
        ),
      );
      setCandidateEdits((current) => ({
        ...current,
        [updatedCandidate.id]: candidateToEdit(updatedCandidate),
      }));
      setEditingCandidateId(null);
      setMessage("후보를 저장했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "후보 저장에 실패했습니다.");
    } finally {
      setSavingCandidateId(null);
    }
  }

  function setAllCandidateSelections(selected: boolean) {
    setCandidateSelections(Object.fromEntries(candidates.map((candidate) => [candidate.id, selected])));
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="border-b border-border pb-5">
          <h1 className="text-2xl font-semibold text-[#1F2723]">요청 콘솔</h1>
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
                onChange={(event) => setInputType(event.target.value as InputTypeMode)}
                className="mt-1 h-10 w-full rounded-button border border-border bg-white px-3 text-sm outline-none focus:border-primary"
              >
                <option value="auto">{inputTypeLabels.auto}</option>
                <option value="meeting_notes">{inputTypeLabels.meeting_notes}</option>
                <option value="transcript">{inputTypeLabels.transcript}</option>
                <option value="memo">{inputTypeLabels.memo}</option>
              </select>
              <p className="mt-1 text-xs font-medium text-[#5F6B64]">
                {inputType === "auto"
                  ? `자동 판별: ${inputTypeLabels[detectedInputType]}`
                  : `수동 지정: ${inputTypeLabels[resolvedInputType]}`}
              </p>
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
          <section className="space-y-3" aria-label="작업 후보 검토">
            <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#1F2723]">작업 후보 검토</h2>
                  <p className="mt-1 text-sm leading-6 text-[#5F6B64]">
                    회의록에서 분리된 후보를 확인하고, 지금 실행할 항목만 실행 대상으로 남겨두세요.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-button bg-surfaceAlt px-3 py-2 text-xs font-semibold text-primary">
                    실행 대상 {selectedCandidateCount}개 / 전체 {candidates.length}개
                  </span>
                  <button
                    type="button"
                    onClick={() => setAllCandidateSelections(true)}
                    className="h-9 rounded-button border border-border bg-white px-3 text-xs font-semibold text-[#1F2723] transition hover:bg-surfaceAlt"
                  >
                    전체 포함
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllCandidateSelections(false)}
                    className="h-9 rounded-button border border-border bg-white px-3 text-xs font-semibold text-[#1F2723] transition hover:bg-surfaceAlt"
                  >
                    전체 보류
                  </button>
                </div>
              </div>
            </div>

            {candidates.map((candidate) => {
              const approvalId = runApprovals[candidate.id];
              const isRunning = runningCandidateId === candidate.id;
              const hasRun = Boolean(approvalId);
              const isSelected = candidateSelections[candidate.id] !== false;
              const taskTypeLabel = taskTypeLabels[candidate.task_type] ?? candidate.task_type;
              const statusLabel = isSelected
                ? candidateStatusLabels[candidate.status] ?? candidate.status
                : "보류됨";
              const isEditing = editingCandidateId === candidate.id;
              const edit = candidateEdits[candidate.id] ?? candidateToEdit(candidate);
              const isSaving = savingCandidateId === candidate.id;

              return (
                <article
                  key={candidate.id}
                  className={`rounded-card border p-4 shadow-sm ${
                    isSelected ? "border-border bg-surface" : "border-border bg-surfaceAlt"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-button bg-surfaceAlt px-2 py-1 text-xs font-semibold text-primary">
                          {taskTypeLabel}
                        </span>
                        <span className="rounded-button bg-white px-2 py-1 text-xs font-medium text-[#5F6B64]">
                          {candidate.task_type}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#5F6B64]">
                          {isSelected ? <CheckCircle2 size={14} aria-hidden="true" /> : <PauseCircle size={14} aria-hidden="true" />}
                          {statusLabel}
                        </span>
                      </div>
                      {isEditing ? (
                        <div className="mt-3 grid gap-3">
                          <label className="block">
                            <span className="text-xs font-semibold text-[#5F6B64]">후보 제목</span>
                            <input
                              value={edit.title}
                              onChange={(event) => updateCandidateEdit(candidate.id, { title: event.target.value })}
                              className="mt-1 h-10 w-full rounded-button border border-border bg-white px-3 text-sm outline-none focus:border-primary"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-semibold text-[#5F6B64]">후보 요약</span>
                            <textarea
                              value={edit.summary}
                              onChange={(event) => updateCandidateEdit(candidate.id, { summary: event.target.value })}
                              rows={3}
                              className="mt-1 w-full resize-y rounded-card border border-border bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-primary"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-semibold text-[#5F6B64]">추천 에이전트</span>
                            <input
                              value={edit.recommendedAgentsText}
                              onChange={(event) =>
                                updateCandidateEdit(candidate.id, { recommendedAgentsText: event.target.value })
                              }
                              className="mt-1 h-10 w-full rounded-button border border-border bg-white px-3 text-sm outline-none focus:border-primary"
                            />
                          </label>
                        </div>
                      ) : (
                        <>
                          <h2 className="mt-3 text-base font-semibold text-[#1F2723]">{candidate.title}</h2>
                          <p className="mt-2 text-sm leading-6 text-[#5F6B64]">{candidate.summary}</p>
                        </>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                      <label className="inline-flex h-9 items-center gap-2 rounded-button border border-border bg-white px-3 text-xs font-semibold text-[#1F2723]">
                        <input
                          type="checkbox"
                          aria-label={`${candidate.title} 실행 대상`}
                          checked={isSelected}
                          disabled={isRunning || hasRun || isEditing}
                          onChange={(event) =>
                            setCandidateSelections((current) => ({
                              ...current,
                              [candidate.id]: event.target.checked,
                            }))
                          }
                          className="size-4 accent-primary"
                        />
                        실행 대상
                      </label>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveCandidate(candidate)}
                            disabled={isSaving}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-button bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Save size={16} aria-hidden="true" />
                            {isSaving ? "저장 중" : "후보 저장"}
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelEditingCandidate(candidate)}
                            disabled={isSaving}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-button border border-border bg-white px-4 text-sm font-semibold text-[#1F2723] transition hover:bg-surfaceAlt disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <X size={16} aria-hidden="true" />
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingCandidate(candidate)}
                          disabled={isRunning || hasRun}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-button border border-border bg-white px-4 text-sm font-semibold text-[#1F2723] transition hover:bg-surfaceAlt disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Pencil size={16} aria-hidden="true" />
                          후보 수정
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRunCandidate(candidate)}
                        disabled={!isSelected || isRunning || hasRun || isEditing}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-button bg-analysis px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Play size={16} aria-hidden="true" />
                        {hasRun ? "실행 완료" : isRunning ? "실행 중" : isSelected ? "작업 실행" : "보류됨"}
                      </button>
                    </div>
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
