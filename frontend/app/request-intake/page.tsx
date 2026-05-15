"use client";

import {
  CheckCircle2,
  Cpu,
  Inbox,
  Layers,
  PauseCircle,
  Pencil,
  Play,
  Route,
  Save,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { createIntake, runCandidate, runCandidates, updateCandidate } from "@/lib/api";
import { agentSeeds } from "@/lib/agent-seeds";
import {
  detectInputType,
  inputTypeLabels,
  resolveInputType,
  type InputTypeMode,
} from "@/lib/intake-input-type";
import type { CandidateTask } from "@/lib/types";

const exampleContent =
  "조직행동검사 5페이지 문구를 수정하자. A유형 B유형 상담 전사록은 학습 후보로 저장하자. 공공기관 연수 프로그램 제안서도 기획해보자.";

type CandidateEdit = {
  title: string;
  summary: string;
  recommendedAgentIds: string[];
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
  pending_approval: "승인 대기",
  rejected: "거절됨",
  error: "오류",
  failed: "실패",
};

const agentSeedIds = new Set(agentSeeds.map((agent) => agent.id));

function candidateToEdit(candidate: CandidateTask): CandidateEdit {
  return {
    title: candidate.title,
    summary: candidate.summary,
    recommendedAgentIds: candidate.recommended_agents.filter((agentId) => agentSeedIds.has(agentId)),
  };
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
  const [isRunningSelected, setIsRunningSelected] = useState(false);
  const [runApprovals, setRunApprovals] = useState<Record<string, string>>({});
  const [candidateSelections, setCandidateSelections] = useState<Record<string, boolean>>({});
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [savingCandidateId, setSavingCandidateId] = useState<string | null>(null);
  const [candidateEdits, setCandidateEdits] = useState<Record<string, CandidateEdit>>({});
  const agentById = useMemo(() => new Map(agentSeeds.map((agent) => [agent.id, agent])), []);
  const detectedInputType = detectInputType(title, rawContent);
  const resolvedInputType = resolveInputType(inputType, title, rawContent);
  const selectedCandidateCount = candidates.filter((candidate) => candidateSelections[candidate.id] !== false).length;
  const executableCandidates = candidates.filter(
    (candidate) =>
      candidateSelections[candidate.id] !== false &&
      !runApprovals[candidate.id] &&
      candidate.status === "draft",
  );
  const hasApprovalResults = Object.keys(runApprovals).length > 0;

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
      setError("수정 중인 후보를 저장하거나 취소한 뒤 실행하세요.");
      return;
    }
    if (candidateSelections[candidate.id] === false) {
      setError("보류한 후보는 실행할 수 없습니다. 실행 대상으로 다시 포함한 뒤 실행하세요.");
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
      setCandidates((current) =>
        current.map((currentCandidate) =>
          currentCandidate.id === candidate.id
            ? { ...currentCandidate, status: response.status }
            : currentCandidate,
        ),
      );
      setMessage(`작업을 실행했습니다. 승인 ID: ${response.approval_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "작업 실행에 실패했습니다.");
    } finally {
      setRunningCandidateId(null);
    }
  }

  async function handleRunSelectedCandidates() {
    if (editingCandidateId) {
      setError("수정 중인 후보를 저장하거나 취소한 뒤 실행하세요.");
      return;
    }

    const candidateIds = executableCandidates.map((candidate) => candidate.id);
    if (candidateIds.length === 0) {
      setError("실행할 후보를 1개 이상 포함하세요.");
      return;
    }

    setIsRunningSelected(true);
    setError("");
    setMessage("");

    try {
      const response = await runCandidates(candidateIds);
      setRunApprovals((current) => ({
        ...current,
        ...Object.fromEntries(response.results.map((result) => [result.candidate_id, result.approval_id])),
      }));
      setCandidates((current) =>
        current.map((candidate) => {
          const result = response.results.find((currentResult) => currentResult.candidate_id === candidate.id);
          return result ? { ...candidate, status: result.status } : candidate;
        }),
      );
      setMessage(`선택 후보 ${response.results.length}개를 실행했습니다. 승인함에서 검토하세요.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "선택 후보 실행에 실패했습니다.");
    } finally {
      setIsRunningSelected(false);
    }
  }

  function updateCandidateEdit(candidateId: string, patch: Partial<CandidateEdit>) {
    setCandidateEdits((current) => ({
      ...current,
      [candidateId]: {
        ...(current[candidateId] ?? { title: "", summary: "", recommendedAgentIds: [] }),
        ...patch,
      },
    }));
  }

  function toggleRecommendedAgent(candidateId: string, agentId: string, selected: boolean) {
    setCandidateEdits((current) => {
      const currentEdit = current[candidateId] ?? { title: "", summary: "", recommendedAgentIds: [] };
      const recommendedAgentIds = selected
        ? Array.from(new Set([...currentEdit.recommendedAgentIds, agentId]))
        : currentEdit.recommendedAgentIds.filter((currentAgentId) => currentAgentId !== agentId);

      return {
        ...current,
        [candidateId]: {
          ...currentEdit,
          recommendedAgentIds,
        },
      };
    });
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
    const nextAgents = edit.recommendedAgentIds;

    if (!nextTitle || !nextSummary) {
      setError("후보 제목과 요약을 입력하세요.");
      return;
    }

    if (nextAgents.length === 0) {
      setError("추천 에이전트를 1명 이상 선택하세요.");
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
      <section className="relative min-h-[calc(100vh-2rem)] overflow-hidden rounded-[18px] border border-white/10 bg-[#05080B] text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(31,107,87,0.22),transparent_36%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:auto,48px_48px,48px_48px]" />
        <div className="relative z-10 space-y-5 p-5">
          <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8EA0AE]">Request Console</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-white">요청 콘솔</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#B7C2CC]">
                회의록, 상담 전사록, 메모를 넣으면 입력 유형을 감지하고 실행 가능한 작업 후보로 분리합니다.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <ConsoleStat icon={<Inbox size={15} />} label="후보" value={candidates.length} />
              <ConsoleStat icon={<Play size={15} />} label="실행대상" value={selectedCandidateCount} />
              <ConsoleStat icon={<CheckCircle2 size={15} />} label="승인요청" value={Object.keys(runApprovals).length} />
            </div>
          </header>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_360px]">
            <form onSubmit={handleSubmit} className="rounded-[14px] border border-white/10 bg-[#0E141B]/90 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <label className="block">
                  <span className="text-xs font-semibold text-[#AAB6C1]">제목</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    className="mt-1 h-11 w-full rounded-button border border-white/10 bg-[#101820] px-3 text-sm text-white outline-none transition placeholder:text-[#64727F] focus:border-[#38BDF8]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#AAB6C1]">입력 유형</span>
                  <select
                    value={inputType}
                    onChange={(event) => setInputType(event.target.value as InputTypeMode)}
                    className="mt-1 h-11 w-full rounded-button border border-white/10 bg-[#101820] px-3 text-sm text-white outline-none transition focus:border-[#38BDF8]"
                  >
                    <option value="auto">{inputTypeLabels.auto}</option>
                    <option value="meeting_notes">{inputTypeLabels.meeting_notes}</option>
                    <option value="transcript">{inputTypeLabels.transcript}</option>
                    <option value="memo">{inputTypeLabels.memo}</option>
                  </select>
                </label>
              </div>

              <label className="mt-3 block">
                <span className="text-xs font-semibold text-[#AAB6C1]">원문</span>
                <textarea
                  value={rawContent}
                  onChange={(event) => setRawContent(event.target.value)}
                  required
                  rows={10}
                  placeholder={exampleContent}
                  className="mt-1 w-full resize-y rounded-[10px] border border-white/10 bg-[#101820] px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-[#64727F] focus:border-[#38BDF8]"
                />
              </label>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-10 items-center gap-2 rounded-button bg-[#FF5261] px-4 text-sm font-semibold text-white transition hover:bg-[#FF6976] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={16} aria-hidden="true" />
                  {isSubmitting ? "추출 중" : "작업 후보 추출"}
                </button>
                {message ? <p className="text-sm font-medium text-[#6FF0A0]">{message}</p> : null}
                {error ? <p role="alert" className="text-sm font-medium text-[#FF6B7A]">{error}</p> : null}
              </div>
            </form>

            <aside className="rounded-[14px] border border-white/10 bg-[#0E141B]/90 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8EA0AE]">Intake Decomposition</p>
              <div className="mt-4 rounded-[10px] border border-white/10 bg-black/20 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Sparkles size={16} className="text-[#38BDF8]" aria-hidden="true" />
                  자동 감지 결과
                </div>
                <p className="mt-2 text-sm text-[#DDE6EE]">
                  {inputType === "auto"
                    ? inputTypeLabels[detectedInputType]
                    : inputTypeLabels[resolvedInputType]}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#91A0AD]">
                  자동 모드에서는 제목과 원문 안의 회의, 상담, 전사록 신호를 보고 분류합니다.
                </p>
              </div>
              <div className="mt-4 space-y-3">
                <FlowStep icon={<Inbox size={15} />} title="입력 접수" text="회의록·상담 전사록·메모를 원문으로 보관" active />
                <FlowStep icon={<Layers size={15} />} title="후보 분리" text="문구 수정, 사례 학습, 기획, 홍보 요청을 분리" active={candidates.length > 0} />
                <FlowStep icon={<Route size={15} />} title="에이전트 배정" text="현재 등록된 CRATA 에이전트 중에서 추천" active={candidates.length > 0} />
                <FlowStep icon={<Cpu size={15} />} title="실행·승인" text="실행 결과는 승인함에서 검토" active={hasApprovalResults} />
              </div>
            </aside>
          </div>

          {candidates.length > 0 ? (
            <section className="space-y-3" aria-label="작업 후보 검토">
              <div className="rounded-[14px] border border-white/10 bg-[#0E141B]/90 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">작업 후보 검토</h2>
                    <p className="mt-1 text-sm leading-6 text-[#B7C2CC]">
                      추출된 후보를 확인하고, 지금 실행할 항목만 실행 대상으로 남겨두세요.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-button bg-white/[0.06] px-3 py-2 text-xs font-semibold text-[#7DD7FF]">
                      실행 대상 {selectedCandidateCount}개 / 전체 {candidates.length}개
                    </span>
                    {hasApprovalResults ? (
                      <Link
                        href="/approvals"
                        className="inline-flex h-9 items-center rounded-button border border-[#F2B84B]/40 bg-[#302410] px-3 text-xs font-semibold text-[#FFD37A] transition hover:bg-[#3A2B13]"
                      >
                        승인함으로 이동
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleRunSelectedCandidates}
                      disabled={executableCandidates.length === 0 || isRunningSelected || Boolean(editingCandidateId)}
                      className="inline-flex h-9 items-center gap-2 rounded-button bg-[#1E88B9] px-3 text-xs font-semibold text-white transition hover:bg-[#2398CE] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Play size={14} aria-hidden="true" />
                      {isRunningSelected ? "일괄 실행 중" : "선택 후보 한 번에 실행"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllCandidateSelections(true)}
                      className="h-9 rounded-button border border-white/10 bg-white/[0.06] px-3 text-xs font-semibold text-[#DDE6EE] transition hover:bg-white/10"
                    >
                      전체 포함
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllCandidateSelections(false)}
                      className="h-9 rounded-button border border-white/10 bg-white/[0.06] px-3 text-xs font-semibold text-[#DDE6EE] transition hover:bg-white/10"
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
                    className={`rounded-[14px] border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)] ${
                      isSelected ? "border-white/10 bg-[#111820]/92" : "border-white/5 bg-[#0B1016]/75 opacity-80"
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#0B2535] px-2 py-1 text-xs font-semibold text-[#7DD7FF]">
                            {taskTypeLabel}
                          </span>
                          <span className="rounded-full bg-white/[0.06] px-2 py-1 text-xs font-medium text-[#AEB9C4]">
                            {candidate.task_type}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#B9C4CE]">
                            {isSelected ? <CheckCircle2 size={14} aria-hidden="true" /> : <PauseCircle size={14} aria-hidden="true" />}
                            {statusLabel}
                          </span>
                        </div>
                        {isEditing ? (
                          <div className="mt-3 grid gap-3">
                            <label className="block">
                              <span className="text-xs font-semibold text-[#AAB6C1]">후보 제목</span>
                              <input
                                value={edit.title}
                                onChange={(event) => updateCandidateEdit(candidate.id, { title: event.target.value })}
                                className="mt-1 h-10 w-full rounded-button border border-white/10 bg-[#101820] px-3 text-sm text-white outline-none transition focus:border-[#38BDF8]"
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs font-semibold text-[#AAB6C1]">후보 요약</span>
                              <textarea
                                value={edit.summary}
                                onChange={(event) => updateCandidateEdit(candidate.id, { summary: event.target.value })}
                                rows={3}
                                className="mt-1 w-full resize-y rounded-[10px] border border-white/10 bg-[#101820] px-3 py-2 text-sm leading-6 text-white outline-none transition focus:border-[#38BDF8]"
                              />
                            </label>
                            <fieldset className="rounded-[10px] border border-white/10 bg-black/20 p-3">
                              <legend className="text-xs font-semibold text-[#AAB6C1]">추천 에이전트</legend>
                              <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                {agentSeeds.map((agent) => {
                                  const checked = edit.recommendedAgentIds.includes(agent.id);

                                  return (
                                    <label
                                      key={agent.id}
                                      className="flex min-h-16 items-start gap-2 rounded-button border border-white/10 bg-white/[0.05] p-2 text-xs text-[#E8EEF2]"
                                    >
                                      <input
                                        type="checkbox"
                                        aria-label={`${agent.display_name} 선택`}
                                        checked={checked}
                                        onChange={(event) =>
                                          toggleRecommendedAgent(candidate.id, agent.id, event.target.checked)
                                        }
                                        className="mt-0.5 size-4 shrink-0 accent-[#FF5261]"
                                      />
                                      <span className="min-w-0">
                                        <span className="block font-semibold">{agent.display_name}</span>
                                        <span className="mt-0.5 block text-[#91A0AD]">{agent.id}</span>
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </fieldset>
                          </div>
                        ) : (
                          <>
                            <h2 className="mt-3 text-lg font-semibold leading-7 text-white">{candidate.title}</h2>
                            <p className="mt-2 text-sm leading-6 text-[#C7D2DC]">{candidate.summary}</p>
                          </>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 xl:w-[230px] xl:flex-col xl:items-stretch">
                        <label className="inline-flex h-9 items-center gap-2 rounded-button border border-white/10 bg-white/[0.06] px-3 text-xs font-semibold text-[#E8EEF2]">
                          <input
                            type="checkbox"
                            aria-label={`${candidate.title} 실행 대상`}
                            checked={isSelected}
                            disabled={isRunning || isRunningSelected || hasRun || isEditing}
                            onChange={(event) =>
                              setCandidateSelections((current) => ({
                                ...current,
                                [candidate.id]: event.target.checked,
                              }))
                            }
                            className="size-4 accent-[#FF5261]"
                          />
                          실행 대상
                        </label>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveCandidate(candidate)}
                              disabled={isSaving}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-button bg-[#FF5261] px-4 text-sm font-semibold text-white transition hover:bg-[#FF6976] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Save size={16} aria-hidden="true" />
                              {isSaving ? "저장 중" : "후보 저장"}
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelEditingCandidate(candidate)}
                              disabled={isSaving}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-button border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-[#DDE6EE] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <X size={16} aria-hidden="true" />
                              취소
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditingCandidate(candidate)}
                            disabled={isRunning || isRunningSelected || hasRun}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-button border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-[#DDE6EE] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Pencil size={16} aria-hidden="true" />
                            후보 수정
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRunCandidate(candidate)}
                          disabled={!isSelected || isRunning || isRunningSelected || hasRun || isEditing}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-button bg-[#1E88B9] px-4 text-sm font-semibold text-white transition hover:bg-[#2398CE] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Play size={16} aria-hidden="true" />
                          {hasRun ? "실행 완료" : isRunning ? "실행 중" : isSelected ? "작업 실행" : "보류됨"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
                      <div className="rounded-[10px] border border-white/10 bg-black/20 p-3">
                        <h3 className="text-xs font-semibold text-[#9BA8B4]">근거 발췌</h3>
                        <p className="mt-2 text-sm leading-6 text-[#E3EAF0]">{candidate.evidence_excerpt}</p>
                      </div>
                      <div className="rounded-[10px] border border-white/10 bg-black/20 p-3">
                        <h3 className="text-xs font-semibold text-[#9BA8B4]">추천 에이전트</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {candidate.recommended_agents.map((agentId) => (
                            <span key={agentId} className="rounded-full bg-white/[0.07] px-2 py-1 text-xs font-semibold text-[#E8EEF2]">
                              {agentById.get(agentId)?.display_name ?? agentId}
                            </span>
                          ))}
                        </div>
                        {approvalId ? <p className="mt-3 text-xs font-medium text-[#6FF0A0]">승인 ID: {approvalId}</p> : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}

function ConsoleStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="min-w-24 rounded-[10px] border border-white/10 bg-white/[0.06] px-3 py-2">
      <div className="flex items-center justify-center gap-1.5 text-[#AEB9C4]">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function FlowStep({
  icon,
  title,
  text,
  active,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  active: boolean;
}) {
  return (
    <div className={`rounded-[10px] border p-3 ${active ? "border-[#38BDF8]/35 bg-[#0B2535]/45" : "border-white/10 bg-white/[0.04]"}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <span className={active ? "text-[#7DD7FF]" : "text-[#798592]"}>{icon}</span>
        {title}
      </div>
      <p className="mt-1 text-xs leading-5 text-[#AEB9C4]">{text}</p>
    </div>
  );
}
