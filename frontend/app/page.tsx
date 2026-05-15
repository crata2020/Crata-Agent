import { Bot, ClipboardList, CircleDot, Users } from "lucide-react";

import { AgentCard } from "@/components/agent-card";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import type { Agent } from "@/lib/types";

const agents: Agent[] = [
  {
    id: "crata_ceo",
    name: "CRATA CEO",
    display_name: "CRATA CEO",
    role: "전체 요청 흐름과 에이전트 실행 순서를 조율합니다.",
    description: "작업 후보를 분류하고 적절한 에이전트 워크플로를 결정합니다.",
    status: "idle",
    default_model_provider: "openai",
    default_model_name: "gpt-4.1-mini",
    prompt: "",
    enabled: true,
    color: "#1F6B57",
  },
  {
    id: "concept_guardian",
    name: "Concept Guardian",
    display_name: "개념수호자",
    role: "핵심 개념과 용어의 일관성을 검토합니다.",
    description: "공식 CRATA 지식과 충돌하는 표현을 확인합니다.",
    status: "idle",
    default_model_provider: "openai",
    default_model_name: "gpt-4.1-mini",
    prompt: "",
    enabled: true,
    color: "#6A5EA8",
  },
  {
    id: "report_editor",
    name: "Report Editor",
    display_name: "결과지 에디터",
    role: "상담 결과지 문구를 작성하고 수정합니다.",
    description: "승인 가능한 문서 형태로 결과지 초안을 정리합니다.",
    status: "idle",
    default_model_provider: "openai",
    default_model_name: "gpt-4.1-mini",
    prompt: "",
    enabled: true,
    color: "#34699A",
  },
  {
    id: "counseling_coach",
    name: "Counseling Coach",
    display_name: "상담 코치",
    role: "유형 기반 상담 응답과 코칭 문장을 제안합니다.",
    description: "실제 대화에 사용할 수 있는 문장 초안을 만듭니다.",
    status: "idle",
    default_model_provider: "openai",
    default_model_name: "gpt-4.1-mini",
    prompt: "",
    enabled: true,
    color: "#2F7D4E",
  },
  {
    id: "case_learner",
    name: "Case Learner",
    display_name: "사례학습가",
    role: "상담 사례를 추출하고 학습 후보를 생성합니다.",
    description: "전사록에서 사례 사실과 패턴을 분리합니다.",
    status: "idle",
    default_model_provider: "openai",
    default_model_name: "gpt-4.1-mini",
    prompt: "",
    enabled: true,
    color: "#C9852B",
  },
  {
    id: "relationship_analyst",
    name: "Relationship Analyst",
    display_name: "관계분석가",
    role: "유형 조합과 관계 패턴을 분석합니다.",
    description: "반복되는 상호작용 루프와 개입 후보를 찾습니다.",
    status: "idle",
    default_model_provider: "openai",
    default_model_name: "gpt-4.1-mini",
    prompt: "",
    enabled: true,
    color: "#4B7F83",
  },
  {
    id: "quality_inspector",
    name: "Quality Inspector",
    display_name: "품질검수관",
    role: "출력 안전성과 승인 준비 상태를 점검합니다.",
    description: "위험 표현과 공식 지식 반영 여부를 확인합니다.",
    status: "idle",
    default_model_provider: "openai",
    default_model_name: "gpt-4.1-mini",
    prompt: "",
    enabled: true,
    color: "#B83A3A",
  },
  {
    id: "business_designer",
    name: "Business Designer",
    display_name: "사업설계자",
    role: "제안서, 상품, 프로그램 기획을 준비합니다.",
    description: "2차 확장 예정 에이전트입니다.",
    status: "planned",
    default_model_provider: "openai",
    default_model_name: "gpt-4.1-mini",
    prompt: "",
    enabled: false,
    color: "#7A5A2E",
  },
  {
    id: "content_strategist",
    name: "Content Strategist",
    display_name: "콘텐츠전략가",
    role: "홍보, 유튜브, 블로그, 캠페인 문구를 준비합니다.",
    description: "2차 확장 예정 에이전트입니다.",
    status: "planned",
    default_model_provider: "openai",
    default_model_name: "gpt-4.1-mini",
    prompt: "",
    enabled: false,
    color: "#B35C3E",
  },
  {
    id: "operations_secretary",
    name: "Operations Secretary",
    display_name: "운영비서",
    role: "브리핑, 승인 요약, 작업 우선순위를 정리합니다.",
    description: "2차 확장 예정 에이전트입니다.",
    status: "planned",
    default_model_provider: "openai",
    default_model_name: "gpt-4.1-mini",
    prompt: "",
    enabled: false,
    color: "#5F6B64",
  },
];

const flowSteps = ["입력 접수", "후보 분리", "에이전트 실행", "승인대기"];

export default function HomePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1F2723]">CRATA AI Office</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5F6B64]">
              회의록과 상담 전사록에서 작업 후보를 분리하고, 에이전트 실행과 승인 흐름을 관리합니다.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-button border border-border bg-surface px-3 py-2 text-xs font-medium text-[#5F6B64]">
            <CircleDot size={14} className="text-primary" aria-hidden="true" />
            로컬 운영 모드
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="운영 지표">
          <MetricCard label="활성 에이전트" value={7} tone="primary" icon={<Bot size={18} aria-hidden="true" />} />
          <MetricCard label="준비중 에이전트" value={3} tone="analysis" icon={<Users size={18} aria-hidden="true" />} />
          <MetricCard label="작업 후보" value={0} icon={<ClipboardList size={18} aria-hidden="true" />} />
          <MetricCard label="승인대기" value={0} tone="approval" icon={<CircleDot size={18} aria-hidden="true" />} />
        </section>

        <section className="rounded-card border border-border bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1F2723]">AI Office 상태판</h2>
              <p className="mt-1 text-xs leading-5 text-[#5F6B64]">현재 1차 MVP 에이전트는 대기 중이며, 확장 에이전트는 준비 상태입니다.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#5F6B64]">
              {flowSteps.map((step, index) => (
                <span key={step} className="inline-flex items-center gap-2">
                  <span>{step}</span>
                  {index < flowSteps.length - 1 ? <span className="text-border">→</span> : null}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section aria-label="에이전트 목록">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#1F2723]">에이전트</h2>
            <p className="text-xs font-medium text-[#5F6B64]">10명 구성</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
