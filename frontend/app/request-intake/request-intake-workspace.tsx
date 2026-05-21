"use client";

import {
  Send,
  Bot,
  User,
  Check,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Play,
  Sparkles,
  MessageSquare,
  ClipboardCheck,
  RotateCcw,
  Clock,
  Sparkle
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useState, useEffect, useRef } from "react";

import {
  createIntake,
  listCandidateTasks,
  listApprovals,
  getRequestMap,
  decideApproval,
  sendCandidateMessage,
  runCandidate
} from "@/lib/api";
import { agentSeeds } from "@/lib/agent-seeds";
import {
  getAssistantAnswerContent,
  shouldShowApprovalControls,
} from "@/lib/chat-response";
import { collectApprovalChain } from "@/lib/approval-chain";
import { taskTypeLabel } from "@/lib/task-labels";
import type { CandidateTask, GraphNodeTrace, Approval, RequestMapItem } from "@/lib/types";

const agentMap = new Map(agentSeeds.map((a) => [a.id, a]));

const placeholders = [
  "조직행동검사 결과지 5페이지 문구를 상담형으로 수정해줘.",
  "A유형과 B유형 부부 상담 전사록을 학습 후보로 정리해줘.",
  "공공기관 연수 프로그램 제안서를 기획해줘.",
  "회의록이나 상담 전사록을 붙여 넣으세요.",
];

function renderDraftContent(content: string) {
  if (!content) return null;
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let idx = 0;

  function flushList() {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`list-${idx}`} className="mt-2 mb-2 space-y-1 pl-5 text-[#B7C2CC]">
        {listBuffer.map((item, i) => (
          <li key={i} className="list-disc text-xs leading-relaxed">{item}</li>
        ))}
      </ul>
    );
    listBuffer = [];
    idx++;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={`hr-${idx++}`} className="my-3 border-white/10" />);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h4 key={`h2-${idx++}`} className="mt-4 mb-2 text-sm font-bold text-white border-b border-white/5 pb-1">
          {trimmed.slice(3)}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h3 key={`h1-${idx++}`} className="mt-5 mb-3 text-base font-bold text-[var(--color-accent)]">
          {trimmed.slice(2)}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith("- ")) {
      listBuffer.push(trimmed.slice(2));
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      elements.push(
        <p key={`ol-${idx++}`} className="mt-2 text-xs leading-relaxed text-[#B7C2CC]">
          {trimmed}
        </p>
      );
      continue;
    }

    const kvMatch = trimmed.match(/^([가-힣a-zA-Z_]+\s*[:：])\s*(.+)$/);
    if (kvMatch) {
      flushList();
      elements.push(
        <p key={`kv-${idx++}`} className="mt-2 text-xs leading-relaxed text-[#B7C2CC]">
          <span className="font-semibold text-white/90">{kvMatch[1]}</span> {kvMatch[2]}
        </p>
      );
      continue;
    }

    flushList();
    elements.push(
      <p key={`p-${idx++}`} className="mt-2 text-xs leading-relaxed text-[#B7C2CC]">
        {trimmed}
      </p>
    );
  }

  flushList();

  return <div className="space-y-1">{elements}</div>;
}

export default function RequestIntakeWorkspace({ linkedCandidateId = null }: { linkedCandidateId?: string | null }) {
  const [rawContent, setRawContent] = useState("");
  const [listAllCandidates, setListAllCandidates] = useState<CandidateTask[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [recentRequests, setRecentRequests] = useState<RequestMapItem[]>([]);

  const [selectedRequest, setSelectedRequest] = useState<RequestMapItem | null>(null);
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);

  const [inputText, setInputText] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [placeholder, setPlaceholder] = useState(placeholders[0]);
  const [compareModeId, setCompareModeId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const refreshData = async () => {
    try {
      const [allCands, allApprovals, mapRes] = await Promise.all([
        listCandidateTasks(),
        listApprovals(),
        getRequestMap(),
      ]);
      setListAllCandidates(allCands);
      setApprovals(allApprovals);
      setRecentRequests(mapRes.items);
      setSelectedRequest((current) => {
        if (!current) return current;
        return mapRes.items.find((item) => item.id === current.id) || current;
      });
      return { allCands, allApprovals, mapRes };
    } catch (e) {
      console.error("Failed to refresh data", e);
      throw e;
    }
  };

  useEffect(() => {
    setPlaceholder(placeholders[Math.floor(Math.random() * placeholders.length)]);
  }, []);

  useEffect(() => {
    async function init() {
      setIsSubmitting(true);
      setError("");
      try {
        const data = await refreshData();

        if (linkedCandidateId) {
          const foundRequest = data.mapRes.items.find((r) =>
            r.candidates.some(
              (c) => c.id === linkedCandidateId || c.revision_candidate_id === linkedCandidateId
            )
          );
          if (foundRequest) {
            setSelectedRequest(foundRequest);
            const foundCand = foundRequest.candidates.find(
              (c) => c.id === linkedCandidateId || c.revision_candidate_id === linkedCandidateId
            );
            if (foundCand) {
              setActiveCandidateId(foundCand.id);
            }
          }
        }
      } catch (err) {
        setError("워크스페이스 초기화에 실패했습니다.");
      } finally {
        setIsSubmitting(false);
      }
    }
    init();
  }, [linkedCandidateId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeCandidateId, runningTaskId, listAllCandidates, approvals]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rawContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await createIntake({
        title: rawContent.trim().slice(0, 20) + "...",
        input_type: "auto",
        raw_content: rawContent.trim(),
        source: "manual",
      });

      const data = await refreshData();

      const newRequestItem = data.mapRes.items.find((item) => item.id === res.id) || {
        id: res.id,
        title: res.title,
        input_type: res.input_type,
        raw_preview: rawContent.trim(),
        created_at: new Date().toISOString(),
        decomposition_trace: res.decomposition_trace?.map((t) => ({
          name: t.name,
          status: t.status,
          summary: t.summary,
          step_name: t.name,
          started_at: new Date().toISOString(),
        })) || [],
        candidates: res.candidate_tasks.map((c) => ({
          id: c.id,
          task_type: c.task_type,
          title: c.title,
          summary: c.summary,
          status: c.status,
          agents: c.recommended_agents.map((a) => ({ id: a, display_name: a, color: "#38BDF8", status: "active" })),
          steps: [],
          href: "",
          current_step_index: 0,
          total_steps: 4,
        })),
      };

      setSelectedRequest(newRequestItem);
      if (res.candidate_tasks.length > 0) {
        setActiveCandidateId(res.candidate_tasks[0].id);
      }
      setRawContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청 분석에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleSendMessage = async (candidateId: string, customText?: string) => {
    const text = (customText || inputText).trim();
    if (!text) return;

    const candidate = listAllCandidates.find((c) => c.id === candidateId);
    if (!candidate) return;

    if (!customText) setInputText("");

    try {
      setRunningTaskId(candidateId);
      setError("");

      await sendCandidateMessage(candidate.id, text);

      const mapTask = selectedRequest?.candidates.find((c) => c.id === candidateId);
      if (false) {
        const rootApprovalId = mapTask?.approval_id || "";
        if (!rootApprovalId) {
          throw new Error("진행 중인 초안 결재를 찾을 수 없습니다.");
        }

        // Traverse the approval chain to find the latest active pending approval
        let activeApprovalId = rootApprovalId;
        while (true) {
          const currentApproval = approvals.find((a) => a.id === activeApprovalId);
          const revisionApprovalId = currentApproval?.comparison?.revision_approval_id;
          if (!revisionApprovalId) {
            break;
          }
          activeApprovalId = revisionApprovalId || "";
        }

        const updatedApproval = await decideApproval(activeApprovalId, "revise_requested", text);
        const data = await refreshData();

        const nextRevisionId =
          updatedApproval.revision_candidate_task?.id ||
          data.mapRes.items
            .flatMap((r) => r.candidates)
            .find((c) => c.id === candidateId)?.revision_candidate_id;

        if (nextRevisionId) {
          await runCandidate(nextRevisionId || "");
        } else {
          throw new Error("재작업 후보를 생성하지 못했습니다.");
        }
      }

      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "메시지 전송에 실패했습니다.");
    } finally {
      setRunningTaskId(null);
    }
  };

  const updateCandidateAnswers = async (candidate: CandidateTask, text: string) => {
    const { updateCandidate } = await import("@/lib/api");
    await updateCandidate(candidate.id, {
      title: candidate.title,
      summary: candidate.summary,
      recommended_agents: candidate.recommended_agents,
      clarifying_answers: text,
    });
  };

  const handleApprove = async (approvalId: string) => {
    try {
      setError("");
      await decideApproval(approvalId, "approved");
      await refreshData();
    } catch (err) {
      setError("승인 처리에 실패했습니다.");
    }
  };

  const buildMessages = (candidate: CandidateTask) => {
    const msgs: any[] = [];
    const assistant = {
      display_name: "CRATA AI",
      color: "var(--color-accent)",
      role: "답변 정리",
    };

    const requestText =
      selectedRequest?.raw_preview ||
      candidate.evidence_excerpt ||
      candidate.summary;

    if (requestText) {
      msgs.push({
        id: `request-${candidate.id}`,
        sender: "user",
        senderName: "나",
        content: requestText,
      });
    }

    const chatMessages = candidate.chat_messages || [];
    const hasChatMessages = chatMessages.length > 0;

    chatMessages.forEach((message, index) => {
      const isAssistant = message.role === "assistant";
      msgs.push({
        id: `chat-${candidate.id}-${index}`,
        sender: isAssistant ? "agent" : "user",
        senderName: isAssistant ? assistant.display_name : "나",
        senderRole: isAssistant ? assistant.role : undefined,
        senderColor: isAssistant ? assistant.color : undefined,
        content: message.content,
      });
    });

    if (
      candidate.clarifying_questions &&
      candidate.clarifying_questions.length > 0 &&
      !candidate.clarifying_answers &&
      !hasChatMessages
    ) {
      msgs.push({
        id: `q-${candidate.id}`,
        sender: "agent",
        senderName: assistant.display_name,
        senderRole: assistant.role,
        senderColor: assistant.color,
        content: "답변 전에 확인하면 좋을 내용이 있습니다. 아래 질문에 답해주시면 그 기준으로 정리하겠습니다.",
        type: "questions",
        questions: candidate.clarifying_questions,
      });
    }

    if (candidate.clarifying_answers) {
      msgs.push({
        id: `clarifying-answer-${candidate.id}`,
        sender: "user",
        senderName: "나",
        content: candidate.clarifying_answers,
      });
    }

    if (
      candidate.status === "draft" &&
      (!candidate.clarifying_questions || candidate.clarifying_questions.length === 0) &&
      !hasChatMessages
    ) {
      msgs.push({
        id: `ready-${candidate.id}`,
        sender: "agent",
        senderName: assistant.display_name,
        senderRole: assistant.role,
        senderColor: assistant.color,
        content: "요청을 확인했습니다. 바로 답변을 정리할 수 있습니다.",
        type: "welcome",
      });
    }

    if (
      (candidate.id === activeCandidateId && runningTaskId === candidate.id) ||
      candidate.status === "running" ||
      candidate.status === "working"
    ) {
      msgs.push({
        id: `run-${candidate.id}`,
        sender: "agent",
        senderName: assistant.display_name,
        senderRole: assistant.role,
        senderColor: assistant.color,
        content: "공식 지식과 요청 내용을 확인해서 답변을 정리하고 있습니다.",
        type: "running",
      });
    }

    return msgs;

    const mapTask = selectedRequest?.candidates.find((c) => c.id === candidate.id);
    const rootApprovalId = mapTask?.approval_id;

    for (const chainItem of collectApprovalChain({ approvals, rootApprovalId })) {
        const approval = chainItem.approval;
        msgs.push({
          id: `approval-${approval.id}`,
          sender: "agent",
          senderName: assistant.display_name,
          senderRole: assistant.role,
          senderColor: assistant.color,
          content: chainItem.isRevision ? "피드백을 반영해 다시 정리했습니다." : "",
          answerContent: getAssistantAnswerContent(
            approval.after_content,
            "이전 형식의 내부 작업 메모만 남아 있어 사용자용 답변을 표시할 수 없습니다. 아래 입력창에 다시 정리해 달라고 남겨주세요.",
          ),
          type: "draft",
          approval: approval,
          isRevision: chainItem.isRevision,
          originalApproval: chainItem.originalApproval,
        });

        // If this approval was revised, render the user's feedback message
        if (approval.status === "revise_requested" || approval.comparison?.revision_reason) {
          const reason = approval.comparison?.revision_reason || approval.decision_reason || "문서 수정 요청";
          msgs.push({
            id: `revision-req-${approval.id}`,
            sender: "user",
            senderName: "나",
            content: reason,
          });

          // Render running state for the next candidate if it is currently processing
          const nextCandId = approval.comparison?.revision_candidate_id;
          const nextCand = nextCandId ? listAllCandidates.find((c) => c.id === nextCandId) : null;
          if (
            nextCand &&
            (runningTaskId === nextCand?.id || nextCand?.status === "running" || nextCand?.status === "working")
          ) {
            msgs.push({
              id: `rework-run-${nextCand?.id || "unknown"}`,
              sender: "agent",
              senderName: assistant.display_name,
              senderRole: assistant.role,
              senderColor: assistant.color,
              content: "말씀하신 내용을 반영해서 다시 정리하고 있습니다.",
              type: "running",
            });
          }
        }

    }

    return msgs;
  };

  const activeCandidate = listAllCandidates.find((c) => c.id === activeCandidateId);
  const activeMessages = activeCandidate ? buildMessages(activeCandidate) : [];

  return (
    <div className="flex h-full min-h-0 bg-[var(--color-bg)] text-white">
      {/* 1. Empty Onboarding State */}
      {!selectedRequest ? (
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-12 justify-center">
          <div className="text-center mb-8">
            <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/5 mb-4 text-3xl shadow-lg">
              ✨
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">에이전트 채팅 워크스페이스</h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">
              회의록, 지시사항, 기획안 요청을 자유롭게 적어보세요. 필요한 지식을 찾아 대화로 정리합니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mb-8">
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl transition focus-within:border-[var(--color-accent)]/60">
              <textarea
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                placeholder={placeholder}
                rows={5}
                disabled={isSubmitting}
                className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm leading-relaxed text-white outline-none placeholder:text-[var(--color-text-muted)] disabled:opacity-50"
              />
              <div className="flex items-center justify-between border-t border-white/5 bg-black/20 px-4 py-3">
                <span className="text-xs text-[var(--color-text-muted)]">
                  {rawContent.trim().length > 0 ? `${rawContent.trim().length}자 입력됨` : "지식이 통합된 문서가 출력됩니다."}
                </span>
                <button
                  type="submit"
                  disabled={!rawContent.trim() || isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      작업 분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      분석 및 채팅 시작
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Recent sessions list */}
          {recentRequests.length > 0 && (
            <div className="border-t border-white/5 pt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">최근 작업 세션</p>
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                {recentRequests.slice(0, 4).map((req) => (
                  <button
                    key={req.id}
                    onClick={() => {
                      setSelectedRequest(req);
                      if (req.candidates.length > 0) {
                        setActiveCandidateId(req.candidates[0].id);
                      }
                    }}
                    className="flex flex-col text-left rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.05] hover:border-white/10 transition"
                  >
                    <span className="text-xs font-bold text-white truncate w-full">{req.title || "새 세션"}</span>
                    <span className="mt-1 text-[11px] text-[var(--color-text-muted)] line-clamp-1">{req.raw_preview}</span>
                    <span className="mt-2 text-[10px] text-[var(--color-accent)] font-semibold">
                      세부 작업 {req.candidates.length}개 · {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 2. Workspace Chat Layout */
        <div className="flex flex-1 min-w-0">
          {/* Left Sidebar (Sub-tasks list) */}
          <aside className="w-80 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col shrink-0">
            {/* Sidebar header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setActiveCandidateId(null);
                }}
                className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-white transition"
              >
                <ArrowLeft size={14} />
                새 요청
              </button>
              <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                세션 워크스페이스
              </span>
            </div>

            {/* Request original text summary */}
            <div className="p-4 border-b border-white/5 bg-black/10">
              <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock size={12} />
                전체 원본 지시문
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3 leading-relaxed">
                {selectedRequest.raw_preview}
              </p>
            </div>

            {/* Sub-tasks menu */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider px-2 mb-2">답변 목록</p>
              
              {selectedRequest.candidates.map((mapTask, i) => {
                const fullCand = listAllCandidates.find(c => c.id === mapTask.id);
                const isActive = activeCandidateId === mapTask.id;
                const isGeneralChat = mapTask.task_type === "general_agent_task";
                
                // Determine current state label and styling
                let statusLabel = "대기 중";
                let statusClass = "bg-white/[0.04] text-[var(--color-text-muted)] border-white/5";
                
                const currentStatus = fullCand?.status || mapTask.status;
                if (currentStatus === "draft") {
                  if (fullCand?.chat_messages && fullCand.chat_messages.length > 0) {
                    statusLabel = "대화 중";
                    statusClass = "bg-[var(--color-info-soft)] text-[var(--color-info)] border-[var(--color-info)]/20";
                  } else if (fullCand?.clarifying_questions && fullCand.clarifying_questions.length > 0) {
                    statusLabel = "질문 대기";
                    statusClass = "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning)]/20";
                  } else {
                    statusLabel = "준비 완료";
                    statusClass = "bg-[var(--color-info-soft)] text-[var(--color-info)] border-[var(--color-info)]/20";
                  }
                } else if (currentStatus === "running" || currentStatus === "working") {
                  statusLabel = "작성 중...";
                  statusClass = "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]/20 animate-pulse";
                } else if (currentStatus === "approved") {
                  statusLabel = "승인 완료";
                  statusClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                } else if (currentStatus === "pending_approval") {
                  statusLabel = "검토 대기";
                  statusClass = "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning)]/20";
                } else if (currentStatus === "revise_requested") {
                  statusLabel = "수정 작업 중";
                  statusClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                }

                if (isGeneralChat && currentStatus === "pending_approval") {
                  statusLabel = "답변 완료";
                }

                return (
                  <button
                    key={mapTask.id}
                    onClick={() => setActiveCandidateId(mapTask.id)}
                    className={`w-full flex items-start gap-3 text-left rounded-xl border p-3 transition ${
                      isActive
                        ? "bg-[rgba(79,209,165,0.06)] border-[var(--color-accent)]/40 text-white shadow-[0_4px_12px_rgba(79,209,165,0.03)]"
                        : "bg-white/[0.01] border-white/5 text-[var(--color-text-secondary)] hover:bg-white/[0.03] hover:border-white/10"
                    }`}
                  >
                    <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      isActive ? "bg-[var(--color-accent)] text-black" : "bg-white/[0.04] text-[var(--color-text-muted)]"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${isActive ? "text-white" : "text-[var(--color-text-secondary)]"}`}>
                        {isGeneralChat ? "답변" : mapTask.title}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-text-muted)] line-clamp-1">
                        {isGeneralChat ? mapTask.summary : taskTypeLabel(mapTask.task_type)}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sidebar Footer Link */}
            <div className="p-3 border-t border-white/5 bg-black/10 flex justify-center">
              <Link
                href="/approvals"
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] py-2 text-xs font-semibold hover:bg-white/[0.06] transition text-[var(--color-text-secondary)] hover:text-white"
              >
                <ClipboardCheck size={14} />
                저장된 결과 보기
              </Link>
            </div>
          </aside>

          {/* Right Area (Chat Screen) */}
          <main className="flex-1 min-w-0 flex flex-col bg-[#080B10]">
            {activeCandidate ? (
              <>
                {/* Chat window Header */}
                <header className="px-6 py-4 border-b border-white/5 bg-[var(--color-surface)] flex items-center justify-between shrink-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white truncate">CRATA AI 채팅</h3>
                      <span className="hidden rounded-full bg-white/[0.04] border border-white/5 px-2 py-0.5 text-[9px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                        {taskTypeLabel(activeCandidate.task_type)}
                      </span>
                    </div>
                    {/* Agents list */}
                    <div className="hidden mt-1.5 items-center gap-2">
                      <span className="text-[10px] text-[var(--color-text-muted)]">배정 비서단:</span>
                      <div className="flex gap-1.5">
                        {activeCandidate.recommended_agents.map(id => {
                          const ag = agentMap.get(id);
                          if (!ag) return null;
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold border border-white/5"
                              style={{ color: ag.color, backgroundColor: `${ag.color}0B` }}
                            >
                              <span className="size-1 rounded-full" style={{ backgroundColor: ag.color }} />
                              {ag.display_name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Top Header Status Indicator */}
                  <div className="flex items-center gap-2">
                    {activeCandidate.status === "approved" && (
                      <span className="flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400">
                        <Check size={14} />
                        최종 반영 완료
                      </span>
                    )}
                  </div>
                </header>

                {/* Error Banner */}
                {error && (
                  <div className="mx-6 mt-4 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] p-3 text-xs text-[var(--color-danger)] flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Chat window Messages Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                  {activeMessages.map((msg: any) => {
                    const isAgent = msg.sender === "agent";
                    const isSystem = msg.sender === "system";

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <span className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-1 text-[10px] text-[var(--color-text-muted)] font-semibold">
                            {msg.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-[85%] ${isAgent ? "mr-auto" : "ml-auto flex-row-reverse"}`}
                      >
                        {/* Avatar */}
                        {isAgent ? (
                          <div
                            className="size-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold border"
                            style={{
                              borderColor: `${msg.senderColor}40`,
                              backgroundColor: `${msg.senderColor}14`,
                              color: msg.senderColor,
                            }}
                          >
                            <Bot size={16} />
                          </div>
                        ) : (
                          <div className="size-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold bg-white/5 border border-white/10 text-white/80">
                            <User size={16} />
                          </div>
                        )}

                        {/* Content bubble wrapper */}
                        <div className="space-y-1">
                          {/* Sender name */}
                          <div className={`flex items-center gap-1.5 text-[10px] font-bold ${
                            isAgent ? "text-[var(--color-text-secondary)]" : "text-right flex-row-reverse text-white/50"
                          }`}>
                            <span>{msg.senderName}</span>
                            {isAgent && (
                              <span className="rounded bg-white/[0.04] px-1 text-[9px] font-semibold text-white/40">
                                {msg.senderRole}
                              </span>
                            )}
                          </div>

                          {/* Bubble box */}
                          <div className={`rounded-2xl border px-4 py-3 text-xs leading-relaxed transition ${
                            isAgent
                              ? "bg-[var(--color-surface)] border-white/5 text-white/90"
                              : "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-white rounded-tr-none"
                          }`}>
                            {/* Normal Chat Bubble Content */}
                            {msg.type !== "draft" && (
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            )}

                            {/* Welcome Actions (Draft Run) */}
                            {msg.type === "welcome" && activeCandidate.status === "draft" && (
                              <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                                <button
                                  onClick={() => handleSendMessage(activeCandidate.id, "답변을 정리해줘.")}
                                  className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black px-3.5 py-2 font-bold transition shadow-md text-[11px]"
                                >
                                  <Play size={12} fill="black" />
                                  답변 받기
                                </button>
                              </div>
                            )}

                            {/* Clarifying Questions Block */}
                            {msg.type === "questions" && (
                              <div className="mt-3 space-y-3 bg-black/20 p-3.5 rounded-xl border border-[var(--color-warning)]/20">
                                <div className="flex items-center gap-1.5">
                                  <span className="flex size-4 items-center justify-center rounded-full bg-[var(--color-warning)] text-[10px] font-black text-black">?</span>
                                  <span className="font-bold text-[var(--color-warning)] text-[11px]">확인 필요 조건</span>
                                </div>
                                <ul className="space-y-1.5 pl-5 text-[11px] text-[#FFD37A]/80 list-disc">
                                  {msg.questions.map((q: string, idx: number) => (
                                    <li key={idx}>{q}</li>
                                  ))}
                                </ul>
                                <div className="pt-2">
                                  <textarea
                                    id={`clarify-textarea-${activeCandidate.id}`}
                                    placeholder="여기에 답변을 작성해 주세요. (예: 진로, 고등학교야, 2시간...)"
                                    className="w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-warning)]/40 placeholder:text-white/20"
                                    rows={3}
                                  />
                                  <div className="mt-2 flex gap-2 justify-end">
                                    <button
                                      onClick={() => {
                                        const el = document.getElementById(`clarify-textarea-${activeCandidate.id}`) as HTMLTextAreaElement;
                                        if (el && el.value.trim()) {
                                          handleSendMessage(activeCandidate.id, el.value.trim());
                                        }
                                      }}
                                      className="rounded-lg bg-[var(--color-warning)]/20 hover:bg-[var(--color-warning)]/30 text-[var(--color-warning)] px-3 py-1.5 font-bold transition border border-[var(--color-warning)]/25 text-[10px]"
                                    >
                                      답변 전송
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Running Loading Bubble */}
                            {msg.type === "running" && (
                              <div className="flex items-center gap-2.5 mt-2 bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                                <Loader2 size={16} className="animate-spin text-[var(--color-accent)] shrink-0" />
                                <span className="text-[11px] text-[var(--color-text-secondary)] font-medium">답변을 정리하고 있습니다...</span>
                              </div>
                            )}

                            {/* Draft content rendering */}
                            {msg.type === "draft" && (
                              <div className="mt-2 space-y-4">
                                {msg.content && (
                                  <p className="text-[11px] text-[var(--color-text-secondary)] mb-2 font-medium">{msg.content}</p>
                                )}

                                {/* Single draft or side-by-side compare rendering */}
                                {msg.isRevision && msg.originalApproval && compareModeId === msg.approval.id ? (
                                  <div className="grid gap-3 grid-cols-1 md:grid-cols-2 mt-3 pt-2">
                                    <div className="rounded-xl border border-white/5 bg-black/40 p-3">
                                      <div className="flex items-center gap-1.5 mb-2.5">
                                        <RotateCcw size={12} className="text-white/40" />
                                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">이전 문서 초안</span>
                                      </div>
                                      <div className="max-h-[300px] overflow-y-auto text-[11px] leading-relaxed border-t border-white/5 pt-2">
                                        {renderDraftContent(msg.originalApproval.after_content)}
                                      </div>
                                    </div>
                                    <div className="rounded-xl border border-[var(--color-accent)]/20 bg-black/40 p-3 shadow-inner">
                                      <div className="flex items-center gap-1.5 mb-2.5">
                                        <Sparkle size={12} className="text-[var(--color-accent)]" />
                                        <span className="text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-wider">피드백 반영 수정 초안</span>
                                      </div>
                                      <div className="max-h-[300px] overflow-y-auto text-[11px] leading-relaxed border-t border-white/5 pt-2">
                                        {renderDraftContent(msg.approval.after_content)}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="leading-relaxed text-[#D2D6DC]">
                                    {renderDraftContent(msg.answerContent)}
                                  </div>
                                )}

                                {/* Compare mode toggle button */}
                                {msg.isRevision && msg.originalApproval && (
                                  <div className="flex justify-end mt-1">
                                    <button
                                      onClick={() => setCompareModeId(compareModeId === msg.approval.id ? null : msg.approval.id)}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)] hover:text-white transition"
                                    >
                                      {compareModeId === msg.approval.id ? "📄 단일 문서로 보기" : "📊 이전 초안과 비교하기 (분할 화면)"}
                                    </button>
                                  </div>
                                )}

                                {/* Interactive Decision Block */}
                                {shouldShowApprovalControls(activeCandidate.task_type) && msg.approval.status === "pending_approval" && (
                                  <div className="pt-3 border-t border-white/5 flex flex-wrap gap-2 items-center">
                                    <button
                                      onClick={() => handleApprove(msg.approval.id)}
                                      className="flex items-center gap-1 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black px-4 py-2 font-bold transition shadow text-[11px]"
                                    >
                                      <Check size={12} />
                                      최종 승인 및 공식 반영
                                    </button>
                                    <span className="text-[10px] text-white/30">아래 채팅창에 이어서 원하는 방향을 남길 수 있습니다.</span>
                                  </div>
                                )}

                                {msg.approval.status === "approved" && (
                                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
                                    <Check size={14} />
                                    <span>작업 승인이 완료되었습니다. 최종 결과물이 보관함에 업데이트되었습니다.</span>
                                  </div>
                                )}

                                {msg.approval.status === "revise_requested" && (
                                  <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-2 flex items-center gap-2 text-purple-400 font-bold text-[11px]">
                                    <span>수정 요청이 기록되었습니다.</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat window Input Footer */}
                <footer className="px-6 py-4 border-t border-white/5 bg-[var(--color-surface)] shrink-0">
                  {activeCandidate.status === "approved" ? (
                    <div className="text-center py-2 text-xs text-[var(--color-text-muted)] font-semibold flex items-center justify-center gap-2">
                      <span>✓ 이 세부 작업은 완전히 종료되어 공식 반영되었습니다. 추가 수정은 불가능합니다.</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(activeCandidate.id);
                          }
                        }}
                        disabled={runningTaskId === activeCandidate.id}
                        data-old-placeholder={
                          activeCandidate.status === "draft"
                            ? "작업에 추가할 메모나 조건을 여기에 자유롭게 적은 후 엔터를 누르세요..."
                            : "이어 묻거나 원하는 방향을 바로 남겨주세요."
                        }
                        placeholder={activeCandidate.status === "draft" ? "추가 조건이 있으면 적고 Enter를 누르세요..." : "이어 묻거나, 수정할 점을 바로 남기세요..."}
                        rows={1}
                        className="w-full resize-none rounded-xl border border-white/10 bg-black/35 py-3 pl-4 pr-12 text-xs text-white outline-none focus:border-[var(--color-accent)]/50 placeholder:text-white/20 max-h-24 overflow-y-auto leading-relaxed"
                      />
                      <button
                        onClick={() => handleSendMessage(activeCandidate.id)}
                        disabled={!inputText.trim() || runningTaskId === activeCandidate.id}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black p-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  )}
                </footer>
              </>
            ) : (
              /* No selected subtask: show trace */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-xl mx-auto">
                <div className="size-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-xl mb-4">
                  💬
                </div>
                <h3 className="text-sm font-bold text-white">작업 세션 시작됨</h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed">
                  요청이 준비되었습니다. 왼쪽 목록에서 대화를 선택해 이어가세요.
                </p>

                {selectedRequest.decomposition_trace.length > 0 && (
                  <div className="mt-6 w-full text-left bg-black/20 rounded-xl border border-white/5 p-4">
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">CEO 분석 트레이스</p>
                    <div className="space-y-2">
                      {selectedRequest.decomposition_trace.map((node) => (
                        <div key={node.name} className="flex items-start gap-2 text-xs">
                          <span className="text-[var(--color-accent)] mt-0.5">✓</span>
                          <div>
                            <span className="font-semibold text-white/90">{node.name}</span>
                            <span className="ml-2 text-[var(--color-text-secondary)]">{node.summary}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
