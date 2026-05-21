"use client";

import { useEffect, useMemo, useState } from "react";


import { getAgentActivity } from "@/lib/api";
import type { AgentActivity } from "@/lib/types";

const weekDays = ["월", "화", "수", "목", "금"];

const routines = [
  {
    time: "09:00",
    title: "데일리 승인 점검",
    owners: ["운영비서", "품질검수관"],
    cadence: "매일",
    mode: "수동 실행",
    days: weekDays,
    description: "승인함의 공식 지식 반영 후보, 결과지 문구 후보, 상담 사례 후보를 먼저 검토합니다.",
  },
  {
    time: "11:00",
    title: "지식 반영 후보 검토",
    owners: ["개념수호자", "사례학습가"],
    cadence: "월/수/금",
    mode: "수동 실행",
    days: ["월", "수", "금"],
    description: "상담 전사록과 회의록에서 나온 반복 패턴이 공식 MASTER에 들어갈 내용인지 분리합니다.",
  },
  {
    time: "14:00",
    title: "기획 후보 정리",
    owners: ["사업설계자", "개념수호자"],
    cadence: "필요 시",
    mode: "수동 실행",
    days: [],
    description: "기관, 문제, 목적, 성과, 예산, 일정, 검사 활용 방식이 충분히 파악됐는지 확인합니다.",
  },
  {
    time: "17:30",
    title: "콘텐츠 브리핑",
    owners: ["콘텐츠전략가", "운영비서"],
    cadence: "화/목",
    mode: "수동 실행",
    days: ["화", "목"],
    description: "블로그, 유튜브, 홈페이지 문구 후보를 정리하고 금지 표현과 전환 목표를 점검합니다.",
  },
];

const scheduleRows = [
  {
    label: "5시",
    blocks: [
      { day: "월", title: "입력 스캔", time: ":00", tone: "orange" },
      { day: "월", title: "승인 감시", time: ":30", tone: "gray" },
      { day: "월", title: "메모리 스냅샷", time: ":50", tone: "gray" },
      { day: "화", title: "입력 스캔", time: ":00", tone: "orange" },
      { day: "화", title: "승인 감시", time: ":30", tone: "gray" },
      { day: "화", title: "메모리 스냅샷", time: ":50", tone: "gray" },
      { day: "수", title: "입력 스캔", time: ":00", tone: "orange" },
      { day: "수", title: "승인 감시", time: ":30", tone: "gray" },
      { day: "수", title: "메모리 스냅샷", time: ":50", tone: "gray" },
      { day: "목", title: "입력 스캔", time: ":00", tone: "orange" },
      { day: "목", title: "승인 감시", time: ":30", tone: "gray" },
      { day: "목", title: "메모리 스냅샷", time: ":50", tone: "gray" },
      { day: "금", title: "입력 스캔", time: ":00", tone: "orange" },
      { day: "금", title: "승인 감시", time: ":30", tone: "gray" },
      { day: "금", title: "메모리 스냅샷", time: ":50", tone: "gray" },
    ],
  },
  {
    label: "6시",
    blocks: [
      { day: "월", title: "에이전트 브리핑", time: ":00", tone: "gray" },
      { day: "월", title: "오피스 미러", time: ":40", tone: "gray" },
      { day: "화", title: "에이전트 브리핑", time: ":00", tone: "gray" },
      { day: "화", title: "사례 주간 브리핑", time: ":30", tone: "green" },
      { day: "수", title: "에이전트 브리핑", time: ":00", tone: "gray" },
      { day: "수", title: "오피스 미러", time: ":40", tone: "gray" },
      { day: "목", title: "에이전트 브리핑", time: ":00", tone: "gray" },
      { day: "목", title: "오피스 미러", time: ":40", tone: "gray" },
      { day: "금", title: "에이전트 브리핑", time: ":00", tone: "gray" },
      { day: "금", title: "오피스 미러", time: ":40", tone: "gray" },
    ],
  },
  {
    label: "8시",
    blocks: [
      { day: "월", title: "승인함 수집", time: ":00", tone: "gray" },
      { day: "월", title: "지식 전략", time: ":00", tone: "gray" },
      { day: "월", title: "결과지 점검", time: ":30", tone: "gray" },
      { day: "월", title: "사례 지도", time: ":30", tone: "gray" },
      { day: "월", title: "콘텐츠 피드", time: ":30", tone: "gray" },
      { day: "월", title: "제안 실행 감시", time: ":45", tone: "gray" },
      { day: "화", title: "승인함 수집", time: ":00", tone: "gray" },
      { day: "화", title: "사례 파일 정리", time: ":30", tone: "gray" },
      { day: "화", title: "콘텐츠 피드", time: ":30", tone: "gray" },
      { day: "화", title: "제안 실행 감시", time: ":45", tone: "gray" },
      { day: "수", title: "승인함 수집", time: ":00", tone: "gray" },
      { day: "수", title: "결과지 점검", time: ":30", tone: "gray" },
      { day: "수", title: "콘텐츠 피드", time: ":30", tone: "gray" },
      { day: "수", title: "제안 실행 감시", time: ":45", tone: "gray" },
      { day: "목", title: "승인함 수집", time: ":00", tone: "gray" },
      { day: "목", title: "결과지 점검", time: ":30", tone: "gray" },
      { day: "목", title: "콘텐츠 피드", time: ":30", tone: "gray" },
      { day: "목", title: "제안 실행 감시", time: ":45", tone: "gray" },
      { day: "금", title: "승인함 수집", time: ":00", tone: "gray" },
      { day: "금", title: "결과지 점검", time: ":30", tone: "gray" },
      { day: "금", title: "제안 실행 감시", time: ":45", tone: "gray" },
    ],
  },
  {
    label: "9시",
    blocks: [
      { day: "월", title: "문구 감사", time: ":00", tone: "gray" },
      { day: "월", title: "승인 브리핑", time: ":00", tone: "indigo" },
      { day: "월", title: "에이전트 회고", time: ":00", tone: "gray" },
      { day: "월", title: "마케팅 콘텐츠", time: ":30", tone: "yellow" },
      { day: "화", title: "문구 감사", time: ":00", tone: "gray" },
      { day: "화", title: "사례 메일 흐름", time: ":00", tone: "purple" },
      { day: "화", title: "승인 브리핑", time: ":00", tone: "indigo" },
      { day: "화", title: "에이전트 회고", time: ":00", tone: "gray" },
      { day: "화", title: "마케팅 콘텐츠", time: ":30", tone: "yellow" },
      { day: "수", title: "문구 감사", time: ":00", tone: "gray" },
      { day: "수", title: "승인 브리핑", time: ":00", tone: "indigo" },
      { day: "수", title: "에이전트 회고", time: ":00", tone: "gray" },
      { day: "수", title: "마케팅 콘텐츠", time: ":30", tone: "yellow" },
      { day: "목", title: "문구 감사", time: ":00", tone: "gray" },
      { day: "목", title: "승인 브리핑", time: ":00", tone: "indigo" },
      { day: "목", title: "에이전트 회고", time: ":00", tone: "gray" },
      { day: "목", title: "마케팅 콘텐츠", time: ":30", tone: "yellow" },
      { day: "금", title: "문구 감사", time: ":00", tone: "gray" },
      { day: "금", title: "승인 브리핑", time: ":00", tone: "indigo" },
      { day: "금", title: "마케팅 콘텐츠", time: ":30", tone: "yellow" },
    ],
  },
];

const pipelineStages = [
  {
    id: "intake",
    title: "입력 접수",
    subtitle: "회의록 / 전사록",
    x: 72,
    y: 128,
    tone: "cyan",
    files: ["raw-meeting.md", "transcript.md"],
  },
  {
    id: "decompose",
    title: "후보 분리",
    subtitle: "Intake Graph",
    x: 250,
    y: 128,
    tone: "purple",
    files: ["report.json", "proposal.json"],
  },
  {
    id: "specialist",
    title: "에이전트 실행",
    subtitle: "전문가 초안",
    x: 428,
    y: 128,
    tone: "yellow",
    files: ["draft.md", "questions.md"],
  },
  {
    id: "quality",
    title: "품질 검수",
    subtitle: "개념 / 톤 / 안전",
    x: 606,
    y: 128,
    tone: "green",
    files: ["review.json"],
  },
  {
    id: "approval",
    title: "승인함",
    subtitle: "청하님 검토",
    x: 784,
    y: 128,
    tone: "red",
    files: ["approval-card"],
  },
];

const fallbackLivePipelines = [
  {
    name: "결과지 문구 수정 후보",
    cadence: "수정 요청 후 재검토",
    owner: "결과지 에디터",
    status: "승인 대기",
    tone: "yellow",
    stageIndex: 4,
  },
  {
    name: "상담 사례 학습 후보",
    cadence: "전사록 기반 추출",
    owner: "사례학습가",
    status: "품질 검수",
    tone: "cyan",
    stageIndex: 3,
  },
  {
    name: "사업 프로그램 기획 후보",
    cadence: "확인 질문 생성",
    owner: "사업설계자",
    status: "후보 대기",
    tone: "purple",
    stageIndex: 1,
  },
  {
    name: "콘텐츠 홍보 작업 후보",
    cadence: "채널 / 타깃 정리",
    owner: "콘텐츠전략가",
    status: "후보 대기",
    tone: "green",
    stageIndex: 1,
  },
];

const pipelineStepLabels = ["접수", "분리", "초안", "검수", "승인"];

type ScheduleTab = "overview" | "schedule" | "pipelines";
type LivePipeline = {
  name: string;
  cadence: string;
  owner: string;
  status: string;
  tone: string;
  stageIndex: number;
};

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState<ScheduleTab>("overview");
  const [agentActivity, setAgentActivity] = useState<AgentActivity[]>([]);
  const [activityUnavailable, setActivityUnavailable] = useState(false);
  const scheduledRoutineCount = routines.filter((routine) => routine.days.length > 0).length;
  const livePipelineItems = useMemo(() => buildLivePipelines(agentActivity), [agentActivity]);

  useEffect(() => {
    let isCurrent = true;

    getAgentActivity()
      .then((response) => {
        if (!isCurrent) {
          return;
        }
        setAgentActivity(response.agents);
        setActivityUnavailable(false);
      })
      .catch(() => {
        if (isCurrent) {
          setActivityUnavailable(true);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <>
      <section className="relative flex min-h-[calc(100vh-1rem)] flex-col overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] text-white">
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-white">스케줄</h1>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {routines.length}개 작업 · {scheduledRoutineCount}개 주간 루틴
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#77777F]">방금 업데이트</span>
            <span className="text-sm text-[#77777F]">↻</span>
          </div>
        </header>

        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-4 py-2">
          <ScheduleTabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
            개요
          </ScheduleTabButton>
          <ScheduleTabButton active={activeTab === "schedule"} onClick={() => setActiveTab("schedule")}>
            시간표
          </ScheduleTabButton>
          <ScheduleTabButton active={activeTab === "pipelines"} onClick={() => setActiveTab("pipelines")}>
            파이프라인
          </ScheduleTabButton>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <ScheduleStat label="루틴" value={`${routines.length}개`} />
            <ScheduleStat label="자동화" value="대기" tone="approval" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[var(--color-bg)] p-4">
          {activeTab === "overview" ? <OverviewPanel /> : null}
          {activeTab === "schedule" ? <ScheduleGrid /> : null}
          {activeTab === "pipelines" ? (
            <PipelinePanel
              livePipelines={livePipelineItems.length > 0 ? livePipelineItems : fallbackLivePipelines}
              activityUnavailable={activityUnavailable}
              usingFallback={livePipelineItems.length === 0}
            />
          ) : null}
        </div>

        <button className="absolute bottom-5 right-5 rounded-button border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-2.5 text-xs font-medium text-[var(--color-text-secondary)]">
          ● 실시간 로그
        </button>
      </section>
    </>
  );
}

function ScheduleTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-button px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
          : "bg-white/[0.04] text-[var(--color-text-secondary)] hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function OverviewPanel() {
  const primaryRoutines = routines.slice(0, 3);
  const secondaryRoutines = routines.slice(3);
  const manualCount = routines.filter((routine) => routine.mode === "수동 실행").length;

  return (
    <div className="space-y-3">
      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-text-muted)]">TODAY ROUTINE</p>
              <h2 className="mt-1 text-lg font-semibold text-white">오늘 먼저 확인할 운영 루틴</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                자동으로 많이 돌리기보다, 승인과 공식 지식 반영을 먼저 통제하는 일정입니다.
              </p>
            </div>
            <span className="rounded-button border border-[var(--color-warning)]/20 bg-[var(--color-warning-soft)] px-3 py-1.5 text-xs font-medium text-[var(--color-warning)]">
              수동 실행 {manualCount}개
            </span>
          </div>

          <div className="mt-4 grid gap-2">
            {primaryRoutines.map((routine) => (
              <article key={routine.title} className="grid gap-3 rounded-button border border-[var(--color-border)] bg-white/[0.03] px-3 py-2.5 md:grid-cols-[64px_minmax(0,1fr)_140px] md:items-center">
                <span className="rounded-md bg-[var(--color-info-soft)] px-2 py-1 text-center text-xs font-medium text-[var(--color-info)]">
                  {routine.time}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-medium text-white">{routine.title}</h3>
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-[#AEB9C4]">
                      {routine.cadence}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-[#AFAFB7]">{routine.description}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 md:justify-end">
                  {routine.owners.map((owner) => (
                    <span key={owner} className="rounded-full bg-[#2A2A2E] px-2 py-0.5 text-[10px] font-bold text-[#DDE6EE]">
                      {owner}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-text-muted)]">OPERATING RULE</p>
          <h2 className="mt-1 text-lg font-semibold text-white">스케줄의 역할</h2>
          <div className="mt-4 space-y-2">
            <ScheduleRule number="1" title="승인 먼저" text="공식 지식 반영 후보와 결과지 문구 후보를 우선 확인합니다." />
            <ScheduleRule number="2" title="자동화는 보조" text="중요 판단은 청하님 승인 흐름을 지나가게 둡니다." />
            <ScheduleRule number="3" title="파이프라인 확인" text="실행 중인 작업은 파이프라인 탭에서 단계만 빠르게 봅니다." />
          </div>
        </div>
      </section>

      <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white">추가 루틴 요약</h2>
            <p className="mt-1 text-xs text-[#8F98A3]">반복 설명은 줄이고, 빠진 루틴만 확인합니다.</p>
          </div>
          <span className="rounded-[7px] bg-[#2A2A2E] px-3 py-1.5 text-xs font-bold text-[#A6A6AD]">
            시간표 탭에서 주간 배치 확인
          </span>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {secondaryRoutines.map((routine) => (
            <div key={routine.title} className="grid gap-2 rounded-[8px] border border-white/10 bg-[#202024] px-3 py-2.5 md:grid-cols-[64px_minmax(0,1fr)_120px] md:items-center">
              <span className="rounded-[7px] bg-[#302410] px-2 py-1 text-center text-xs font-black text-[#FFD37A]">
                {routine.time}
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-black text-white">{routine.title}</h3>
                <p className="mt-0.5 truncate text-xs text-[#AFAFB7]">{routine.description}</p>
              </div>
              <span className="rounded-full bg-white/[0.06] px-2 py-1 text-center text-[10px] font-bold text-[#AEB9C4]">
                {routine.cadence}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ScheduleRule({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-button border border-[var(--color-border)] bg-white/[0.03] p-3">
      <span className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent-soft)] text-xs font-semibold text-[var(--color-accent)]">
        {number}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-white">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-[#AFAFB7]">{text}</span>
      </span>
    </div>
  );
}

function ScheduleGrid() {
  return (
    <>
      <section className="overflow-hidden rounded-[9px] border border-white/10 bg-[#101012]">
        <div className="grid min-w-[980px] grid-cols-[62px_repeat(5,minmax(158px,1fr))] border-b border-white/10">
          <div className="bg-[#19191D] px-3 py-3 text-xs font-bold text-[#77777F]" />
          {weekDays.map((day) => (
            <div
              key={day}
              className={`border-l border-white/10 px-3 py-3 text-center text-xs font-bold ${
                day === "월" ? "bg-[#4A2026] text-[#FF626F]" : "bg-[#19191D] text-[#E7E7EC]"
              }`}
            >
              {day}
              {day === "월" ? <span className="mx-auto mt-2 block size-1.5 rounded-full bg-[#FF626F]" /> : null}
            </div>
          ))}
        </div>

        {scheduleRows.map((row) => (
          <div
            key={row.label}
            className="grid min-w-[980px] grid-cols-[62px_repeat(5,minmax(158px,1fr))] border-b border-white/10 last:border-b-0"
          >
            <div className="bg-[#19191D] px-3 py-3 text-right text-xs font-semibold text-[#77777F]">{row.label}</div>
            {weekDays.map((day) => {
              const blocks = row.blocks.filter((block) => block.day === day);

              return (
                <div key={`${row.label}-${day}`} className="min-h-[98px] border-l border-white/10 p-1.5">
                  {blocks.map((block) => (
                    <div
                      key={`${row.label}-${day}-${block.title}-${block.time}`}
                      className={`mb-1.5 flex min-h-6 items-center gap-1.5 rounded-[5px] px-2 py-1 text-[10px] font-bold last:mb-0 ${scheduleToneClass(block.tone)}`}
                    >
                      <span className="text-[#9B9BA3]">{block.time}</span>
                      <span className="truncate">{block.title}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </section>
    </>
  );
}

function PipelinePanel({
  livePipelines,
  activityUnavailable,
  usingFallback,
}: {
  livePipelines: LivePipeline[];
  activityUnavailable: boolean;
  usingFallback: boolean;
}) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-white">작업 파이프라인</p>
          <p className="mt-1 text-xs text-[#77777F]">
            {activityUnavailable
              ? "백엔드 연결이 불안정해 예시 파이프라인을 표시합니다."
              : usingFallback
                ? "현재 작업 큐가 비어 있어 기본 운영 흐름을 표시합니다."
                : "에이전트 작업 큐에서 읽은 현재 작업 흐름입니다."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-[6px] border border-white/10 bg-[#101012] px-3 py-2 text-xs font-bold text-[#AEB9C4]">
            파이프라인 점검
          </button>
          <button className="rounded-[6px] border border-white/10 bg-[#101012] px-3 py-2 text-xs font-bold text-[#AEB9C4]">
            AI 재분석
          </button>
          <button className="rounded-[6px] border border-white/10 bg-[#101012] px-3 py-2 text-xs font-bold text-[#AEB9C4]">
            초기화
          </button>
        </div>
      </div>

      <section className="relative h-[390px] min-w-[940px] overflow-hidden rounded-[9px] border border-white/10 bg-black">
        <svg className="absolute inset-0" width="940" height="390" aria-hidden="true">
          <path d="M 194 185 H 250" stroke="#FFFFFF" strokeOpacity="0.82" strokeWidth="2" />
          <path d="M 372 185 H 428" stroke="#FF5F6D" strokeDasharray="6 7" strokeWidth="2" />
          <path d="M 550 185 H 606" stroke="#FFFFFF" strokeOpacity="0.82" strokeWidth="2" />
          <path d="M 728 185 H 784" stroke="#FF5F6D" strokeDasharray="6 7" strokeWidth="2" />
          <path d="M 250 255 C 250 312, 606 312, 606 255" fill="none" stroke="#FF5F6D" strokeDasharray="6 7" strokeWidth="2" />
          <path d="M 428 112 C 428 72, 606 72, 606 112" fill="none" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="2" />
        </svg>

        <div className="absolute left-[86px] top-12 text-center">
          <span className="inline-block size-1.5 rounded-full border border-white/60" />
          <p className="mt-1 text-xs font-bold text-[#8F8F98]">Daily Intake</p>
        </div>

        {pipelineStages.map((stage) => (
          <PipelineNode key={stage.id} stage={stage} />
        ))}

        <p className="absolute bottom-4 right-5 text-[11px] text-[#55555D]">
          파이프라인 설정은 자동으로 바뀌지 않습니다. 필요할 때 AI 재분석으로 갱신합니다.
        </p>
      </section>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-bold text-white">진행 중 작업 파이프라인 ({livePipelines.length})</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {livePipelines.map((pipeline) => (
            <article key={pipeline.name} className="rounded-[10px] border border-white/10 bg-[#202024] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-[5px] px-2 py-0.5 text-[10px] font-bold ${pipelineToneClass(pipeline.tone)}`}>
                  {pipeline.status}
                </span>
                <span className="text-[10px] font-semibold text-[#77777F]">{pipeline.owner}</span>
              </div>
              <h3 className="mt-2 text-sm font-bold leading-5 text-white">{pipeline.name}</h3>
              <p className="mt-1 text-xs leading-5 text-[#AFAFB7]">{pipeline.cadence}</p>
              <div className="mt-3">
                <div className="flex items-center">
                  {pipelineStepLabels.map((label, index) => (
                    <div key={label} className="flex flex-1 items-center">
                      <span
                        aria-label={`${label} 단계`}
                        className={`flex size-6 shrink-0 items-center justify-center rounded-[6px] border text-[9px] font-black ${
                          index <= pipeline.stageIndex
                            ? "border-[#38BDF8]/45 bg-[#0B2535] text-[#7DD7FF]"
                            : "border-white/10 bg-black/20 text-[#66666E]"
                        }`}
                        title={label}
                      >
                        {label.slice(0, 1)}
                      </span>
                      {index < pipelineStepLabels.length - 1 ? (
                        <span className={`h-px flex-1 ${index < pipeline.stageIndex ? "bg-[#38BDF8]/50" : "bg-white/10"}`} />
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[9px] font-bold text-[#66666E]">
                  {pipelineStepLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function buildLivePipelines(agentActivity: AgentActivity[]): LivePipeline[] {
  return agentActivity
    .flatMap((agent) =>
      agent.work_items.map((item) => ({
        name: item.title,
        cadence: item.summary || "작업 큐에 등록된 항목입니다.",
        owner: agent.display_name,
        status: itemStatusLabel(item.status),
        tone: pipelineToneFor(item.status, item.source_type),
        stageIndex: pipelineStageIndex(item.status, item.source_type),
      })),
    )
    .slice(0, 8);
}

function itemStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "후보 대기",
    running: "실행 중",
    pending_approval: "승인 대기",
    waiting_for_approval: "승인 대기",
    approved: "승인됨",
    revise_requested: "수정요청",
    rejected: "거절됨",
    failed: "실패",
  };

  return labels[status] ?? status;
}

function pipelineStageIndex(status: string, sourceType: string) {
  if (sourceType === "approval" || status === "pending_approval" || status === "waiting_for_approval") {
    return 4;
  }
  if (status === "running") {
    return 2;
  }
  if (status === "revise_requested") {
    return 1;
  }
  return 1;
}

function pipelineToneFor(status: string, sourceType: string) {
  if (sourceType === "approval" || status === "pending_approval" || status === "waiting_for_approval") {
    return "yellow";
  }
  if (status === "running") {
    return "cyan";
  }
  if (status === "revise_requested") {
    return "purple";
  }
  if (status === "failed" || status === "rejected") {
    return "red";
  }
  return "green";
}

function PipelineNode({
  stage,
}: {
  stage: {
    title: string;
    subtitle: string;
    x: number;
    y: number;
    tone: string;
    files: string[];
  };
}) {
  return (
    <article
      className="absolute w-[122px] rounded-[8px] border bg-[#202024] p-3 shadow-[0_18px_35px_rgba(0,0,0,0.38)]"
      style={{ left: stage.x, top: stage.y, borderTopColor: pipelineBorder(stage.tone), borderTopWidth: 3 }}
    >
      <p className="text-xs font-bold text-white">{stage.title}</p>
      <p className="mt-1 text-[10px] font-semibold text-[#8F8F98]">{stage.subtitle}</p>
      <div className="mt-2 space-y-1">
        {stage.files.map((file) => (
          <p key={file} className="rounded-[3px] bg-white px-1.5 py-0.5 text-[9px] font-bold text-black">
            {file}
          </p>
        ))}
      </div>
      <span className="mt-2 inline-flex rounded-[4px] bg-[#D83B4A] px-2 py-0.5 text-[9px] font-bold text-white">
        연결됨
      </span>
    </article>
  );
}

function ScheduleStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "approval";
}) {
  return (
    <div className="rounded-[7px] border border-white/10 bg-[#252529] px-3 py-2">
      <p className="text-[10px] font-semibold text-[#77777F]">{label}</p>
      <p className={`mt-0.5 text-xs font-bold ${tone === "approval" ? "text-[#F2B84B]" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function scheduleToneClass(tone: string) {
  const tones: Record<string, string> = {
    orange: "bg-[#432315] text-[#F28A38] border-l-2 border-[#D65D1F]",
    gray: "bg-[#2A2A2E] text-[#B9B9C0] border-l-2 border-[#77777F]",
    green: "bg-[#123426] text-[#40E08A] border-l-2 border-[#28B86E]",
    indigo: "bg-[#202056] text-[#858BFF] border-l-2 border-[#5A61FF]",
    purple: "bg-[#2C1C45] text-[#B58CFF] border-l-2 border-[#8B5CF6]",
    yellow: "bg-[#3A2A12] text-[#F2B84B] border-l-2 border-[#C98712]",
  };

  return tones[tone] ?? tones.gray;
}

function pipelineToneClass(tone: string) {
  const tones: Record<string, string> = {
    yellow: "bg-[#3A2A12] text-[#FFD37A]",
    cyan: "bg-[#0B2535] text-[#7DD7FF]",
    purple: "bg-[#2C1C45] text-[#B58CFF]",
    green: "bg-[#102A1C] text-[#6FF0A0]",
    red: "bg-[#3A1C23] text-[#FF7A86]",
  };

  return tones[tone] ?? tones.cyan;
}

function pipelineBorder(tone: string) {
  const tones: Record<string, string> = {
    cyan: "#38BDF8",
    purple: "#8B5CF6",
    yellow: "#F2B84B",
    green: "#36D47F",
    red: "#FF5F6D",
  };

  return tones[tone] ?? "#38BDF8";
}
