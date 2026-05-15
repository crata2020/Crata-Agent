import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RequestIntakePage from "@/app/request-intake/page";
import { createIntake, listCandidateTasks, runCandidate, runCandidates, splitCandidate, updateCandidate } from "@/lib/api";

const searchParamsState = vi.hoisted(() => ({ value: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/request-intake",
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

vi.mock("@/lib/api", () => ({
  createIntake: vi.fn(),
  listCandidateTasks: vi.fn(),
  runCandidate: vi.fn(),
  runCandidates: vi.fn(),
  splitCandidate: vi.fn(),
  updateCandidate: vi.fn(),
}));

const createIntakeMock = vi.mocked(createIntake);
const listCandidateTasksMock = vi.mocked(listCandidateTasks);
const runCandidateMock = vi.mocked(runCandidate);
const runCandidatesMock = vi.mocked(runCandidates);
const splitCandidateMock = vi.mocked(splitCandidate);
const updateCandidateMock = vi.mocked(updateCandidate);

const candidateTasks = [
  {
    id: "candidate-report",
    task_type: "report_phrase_revision",
    title: "결과지 문구 수정 후보",
    summary: "검사 결과지 문구 수정 요청입니다.",
    evidence_excerpt: "조직행동검사 5페이지 문구를 수정하자.",
    recommended_agents: ["crata_ceo", "report_editor"],
    status: "draft",
    rule_hint_task_type: "report_phrase_revision",
    ai_task_type: "report_phrase_revision",
    classification_source: "rule_assisted_ai",
    classification_status: "aligned",
    confidence: 0.91,
    classification_reason: "결과지 문구나 검사 표현을 실제로 바꾸자는 요청이므로 결과지 문구 수정으로 판단했습니다.",
    approval_required: true,
    rule_hints: ["결과지", "문구", "수정"],
    review_flags: [],
  },
  {
    id: "candidate-case",
    task_type: "counseling_case_learning",
    title: "상담 사례 학습 후보",
    summary: "상담 사례 학습 요청입니다.",
    evidence_excerpt: "A유형 B유형 상담 전사록은 학습 후보로 저장하자.",
    recommended_agents: ["case_learner", "relationship_analyst"],
    status: "draft",
    rule_hint_task_type: "counseling_case_learning",
    ai_task_type: "counseling_case_learning",
    classification_source: "rule_assisted_ai",
    classification_status: "aligned",
    confidence: 0.88,
    classification_reason: "상담 전사록, 사례 저장, 유형 관계 패턴 학습을 다루는 요청으로 판단했습니다.",
    approval_required: true,
    rule_hints: ["상담", "전사록", "사례", "학습"],
    review_flags: [],
  },
];

describe("RequestIntakePage candidate review", () => {
  beforeEach(() => {
    createIntakeMock.mockReset();
    listCandidateTasksMock.mockReset();
    runCandidateMock.mockReset();
    runCandidatesMock.mockReset();
    splitCandidateMock.mockReset();
    updateCandidateMock.mockReset();
    searchParamsState.value = "";
  });

  it("shows a review workspace for extracted candidates and lets the user hold one", async () => {
    createIntakeMock.mockResolvedValue({
      id: "intake-1",
      title: "회의록",
      input_type: "meeting_notes",
      raw_content: "원문",
      candidate_tasks: candidateTasks,
    });

    render(<RequestIntakePage />);

    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: "조직행동검사 5페이지 문구를 수정하고 상담 사례를 학습 후보로 저장하자." },
    });
    fireEvent.click(screen.getByRole("button", { name: "작업 후보 추출" }));

    expect(await screen.findByText("작업 후보 검토")).toBeInTheDocument();
    expect(screen.getByText("실행 대상 2개 / 전체 2개")).toBeInTheDocument();
    expect(screen.getAllByText("결과지 문구 수정").length).toBeGreaterThan(0);
    expect(screen.getAllByText("상담 사례 학습").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("checkbox", { name: "상담 사례 학습 후보 실행 대상" }));

    expect(screen.getByText("실행 대상 1개 / 전체 2개")).toBeInTheDocument();
    expect(screen.getAllByText("보류됨").length).toBeGreaterThan(0);
  });

  it("shows rule hints and AI judgment when classification overrides keywords", async () => {
    createIntakeMock.mockResolvedValue({
      id: "intake-1",
      title: "홍보 회의록",
      input_type: "meeting_notes",
      raw_content: "원문",
      candidate_tasks: [
        {
          id: "candidate-content",
          task_type: "content_marketing",
          title: "콘텐츠·홍보 작업 후보",
          summary: "홍보 콘텐츠 기획 요청입니다.",
          evidence_excerpt: "결과지 문구 수정 기능을 홍보 콘텐츠로 만들어서 유튜브와 블로그에 올리자.",
          recommended_agents: ["crata_ceo", "content_strategist"],
          status: "draft",
          rule_hint_task_type: "report_phrase_revision",
          ai_task_type: "content_marketing",
          classification_source: "rule_assisted_ai",
          classification_status: "ai_overrode_rule",
          confidence: 0.82,
          classification_reason: "문구 자체를 수정하는 요청이 아니라 결과지 문구 수정 기능을 홍보 콘텐츠로 풀자는 요청으로 판단했습니다.",
          approval_required: false,
          rule_hints: ["결과지", "문구", "수정"],
          review_flags: ["AI가 규칙 힌트를 재분류함"],
        },
      ],
    });

    render(<RequestIntakePage />);

    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: "결과지 문구 수정 기능을 홍보 콘텐츠로 만들어서 유튜브와 블로그에 올리자." },
    });
    fireEvent.click(screen.getByRole("button", { name: "작업 후보 추출" }));

    expect(await screen.findByText("AI 판단")).toBeInTheDocument();
    expect(screen.getAllByText("콘텐츠·홍보").length).toBeGreaterThan(0);
    expect(screen.getByText("규칙 힌트")).toBeInTheDocument();
    expect(screen.getAllByText("결과지 문구 수정").length).toBeGreaterThan(0);
    expect(screen.getByText("신뢰도 82%")).toBeInTheDocument();
    expect(screen.getByText("승인 불필요")).toBeInTheDocument();
    expect(screen.getByText("AI가 규칙 힌트를 재분류함")).toBeInTheDocument();
    expect(screen.getByText(/문구 자체를 수정하는 요청이 아니라/)).toBeInTheDocument();
  });

  it("shows clarifying questions before running a planning candidate", async () => {
    createIntakeMock.mockResolvedValue({
      id: "intake-1",
      title: "기획 요청",
      input_type: "memo",
      raw_content: "원문",
      candidate_tasks: [
        {
          id: "candidate-plan",
          task_type: "business_planning",
          title: "사업·프로그램 기획 후보",
          summary: "공공기관 연수 프로그램 제안서 기획 요청입니다.",
          evidence_excerpt: "공공기관 연수 프로그램 제안서를 기획해줘.",
          recommended_agents: ["crata_ceo", "business_designer"],
          status: "draft",
          rule_hint_task_type: "business_planning",
          ai_task_type: "business_planning",
          classification_source: "rule_assisted_ai",
          classification_status: "aligned",
          confidence: 0.86,
          classification_reason: "사업 기획 산출물이 필요한 요청으로 판단했습니다.",
          approval_required: false,
          rule_hints: ["공공기관", "연수", "프로그램", "제안서"],
          review_flags: [],
          clarifying_questions: [
            "대상 기관 또는 고객은 누구인가요?",
            "해결하려는 문제나 개선하고 싶은 장면은 무엇인가요?",
          ],
        },
      ],
    });

    render(<RequestIntakePage />);

    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: "공공기관 연수 프로그램 제안서를 기획해줘." },
    });
    fireEvent.click(screen.getByRole("button", { name: "작업 후보 추출" }));

    expect(await screen.findByText("먼저 확인할 질문")).toBeInTheDocument();
    expect(screen.getByText("대상 기관 또는 고객은 누구인가요?")).toBeInTheDocument();
    expect(screen.getByText("해결하려는 문제나 개선하고 싶은 장면은 무엇인가요?")).toBeInTheDocument();
  });

  it("shows the intake decomposition graph trace after candidate extraction", async () => {
    createIntakeMock.mockResolvedValue({
      id: "intake-1",
      title: "복합 회의록",
      input_type: "meeting_notes",
      raw_content: "원문",
      decomposition_graph_name: "intake_decomposition_graph",
      human_review_required: true,
      decomposition_trace: [
        {
          name: "preserve_input",
          status: "completed",
          summary: "원문을 보존하고 앞뒤 공백만 정리했습니다.",
        },
        {
          name: "split_semantic_units",
          status: "completed",
          summary: "2개 의미 단위로 분리했습니다.",
        },
        {
          name: "prepare_human_review",
          status: "completed",
          summary: "사람 검토 화면에서 확인할 수 있도록 후보와 근거를 준비했습니다.",
        },
      ],
      candidate_tasks: candidateTasks,
    });

    render(<RequestIntakePage />);

    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: "결과지 문구는 상담형으로 수정하고 상담 사례는 학습 후보로 저장하자." },
    });
    fireEvent.click(screen.getByRole("button", { name: "작업 후보 추출" }));

    expect(await screen.findByText("LangGraph 실행 단계")).toBeInTheDocument();
    expect(screen.getByText("intake_decomposition_graph")).toBeInTheDocument();
    expect(screen.getByText("원문 보존")).toBeInTheDocument();
    expect(screen.getByText("의미 단위 분리")).toBeInTheDocument();
    expect(screen.getByText("사람 검토 준비")).toBeInTheDocument();
    expect(screen.getByText("2개 의미 단위로 분리했습니다.")).toBeInTheDocument();
  });

  it("runs only candidates kept as execution targets", async () => {
    createIntakeMock.mockResolvedValue({
      id: "intake-1",
      title: "회의록",
      input_type: "meeting_notes",
      raw_content: "원문",
      candidate_tasks: candidateTasks,
    });
    runCandidateMock.mockResolvedValue({
      task_id: "task-1",
      workflow_run_id: "run-1",
      artifact_id: "artifact-1",
      approval_id: "approval-1",
      status: "pending_approval",
    });

    render(<RequestIntakePage />);

    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: "조직행동검사 5페이지 문구를 수정하고 상담 사례를 학습 후보로 저장하자." },
    });
    fireEvent.click(screen.getByRole("button", { name: "작업 후보 추출" }));

    await screen.findByText("작업 후보 검토");
    fireEvent.click(screen.getByRole("checkbox", { name: "상담 사례 학습 후보 실행 대상" }));
    fireEvent.click(screen.getAllByRole("button", { name: "작업 실행" })[0]);

    await waitFor(() => expect(runCandidateMock).toHaveBeenCalledWith("candidate-report"));
    expect(runCandidateMock).toHaveBeenCalledTimes(1);
  });

  it("loads and highlights a candidate linked from the dashboard", async () => {
    searchParamsState.value = "candidateId=candidate-case";
    listCandidateTasksMock.mockResolvedValue(candidateTasks);

    render(<RequestIntakePage />);

    await waitFor(() => expect(listCandidateTasksMock).toHaveBeenCalledTimes(1));

    expect(await screen.findByText("대시보드에서 선택한 후보를 표시합니다.")).toBeInTheDocument();
    expect(screen.getByText("상담 사례 학습 후보 항목이 아래 목록에서 강조됩니다.")).toBeInTheDocument();
    expect(screen.getByText("대시보드 선택")).toBeInTheDocument();
    expect(screen.getByText("실행 대상 2개 / 전체 2개")).toBeInTheDocument();
  });

  it("runs all selected candidates at once and links to the approval inbox", async () => {
    createIntakeMock.mockResolvedValue({
      id: "intake-1",
      title: "회의록",
      input_type: "meeting_notes",
      raw_content: "원문",
      candidate_tasks: candidateTasks,
    });
    runCandidatesMock.mockResolvedValue({
      results: [
        {
          candidate_id: "candidate-report",
          task_id: "task-1",
          workflow_run_id: "run-1",
          artifact_id: "artifact-1",
          approval_id: "approval-1",
          status: "pending_approval",
        },
      ],
    });

    render(<RequestIntakePage />);

    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: "조직행동검사 5페이지 문구를 수정하고 상담 사례를 학습 후보로 저장하자." },
    });
    fireEvent.click(screen.getByRole("button", { name: "작업 후보 추출" }));

    await screen.findByText("작업 후보 검토");
    fireEvent.click(screen.getByRole("checkbox", { name: "상담 사례 학습 후보 실행 대상" }));
    fireEvent.click(screen.getByRole("button", { name: "선택 후보 한 번에 실행" }));

    await waitFor(() => expect(runCandidatesMock).toHaveBeenCalledWith(["candidate-report"]));
    expect(await screen.findByText("선택 후보 1개를 실행했습니다. 승인함에서 검토하세요.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "승인함으로 이동" })).toHaveAttribute("href", "/approvals");
    expect(screen.getByText("승인 ID: approval-1")).toBeInTheDocument();
  });

  it("edits and saves candidate title, summary, and recommended agents before execution", async () => {
    createIntakeMock.mockResolvedValue({
      id: "intake-1",
      title: "회의록",
      input_type: "meeting_notes",
      raw_content: "원문",
      candidate_tasks: candidateTasks,
    });
    updateCandidateMock.mockResolvedValue({
      ...candidateTasks[0],
      title: "조직행동검사 5페이지 문구 수정",
      summary: "상담형 결과지 문장으로 수정합니다.",
      recommended_agents: ["crata_ceo", "report_editor", "quality_inspector"],
    });

    render(<RequestIntakePage />);

    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: "조직행동검사 5페이지 문구를 수정하자." },
    });
    fireEvent.click(screen.getByRole("button", { name: "작업 후보 추출" }));

    await screen.findByText("작업 후보 검토");
    fireEvent.click(screen.getAllByRole("button", { name: "후보 수정" })[0]);
    fireEvent.change(screen.getByLabelText("후보 제목"), {
      target: { value: "조직행동검사 5페이지 문구 수정" },
    });
    fireEvent.change(screen.getByLabelText("후보 요약"), {
      target: { value: "상담형 결과지 문장으로 수정합니다." },
    });
    expect(screen.queryByRole("textbox", { name: "추천 에이전트" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "CRATA CEO 선택" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "결과지 에디터 선택" })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "품질검수관 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "후보 저장" }));

    await waitFor(() =>
      expect(updateCandidateMock).toHaveBeenCalledWith("candidate-report", {
        title: "조직행동검사 5페이지 문구 수정",
        summary: "상담형 결과지 문장으로 수정합니다.",
        recommended_agents: ["crata_ceo", "report_editor", "quality_inspector"],
      }),
    );
    expect(await screen.findByText("후보를 저장했습니다.")).toBeInTheDocument();
    expect(screen.getByText("조직행동검사 5페이지 문구 수정")).toBeInTheDocument();
    expect(screen.getByText("상담형 결과지 문장으로 수정합니다.")).toBeInTheDocument();
    expect(screen.getByText("품질검수관")).toBeInTheDocument();
  });

  it("splits one candidate into reclassified draft candidates", async () => {
    createIntakeMock.mockResolvedValue({
      id: "intake-1",
      title: "회의록",
      input_type: "meeting_notes",
      raw_content: "원문",
      candidate_tasks: [candidateTasks[0]],
    });
    splitCandidateMock.mockResolvedValue({
      original_candidate: {
        ...candidateTasks[0],
        status: "split",
      },
      split_candidates: [
        {
          ...candidateTasks[0],
          id: "candidate-split-report",
          evidence_excerpt: "문구수정하고",
        },
        {
          id: "candidate-split-plan",
          task_type: "business_planning",
          title: "사업·프로그램 기획 후보",
          summary: "입력문에서 사업, 제안서, 상품, 프로그램 기획 요청을 발견했습니다.",
          evidence_excerpt: "기획서 작성해줘.",
          recommended_agents: ["crata_ceo", "business_designer"],
          status: "draft",
          rule_hint_task_type: "business_planning",
          ai_task_type: "business_planning",
          classification_source: "rule_assisted_ai",
          classification_status: "aligned",
          confidence: 0.8,
          classification_reason: "기획서 작성 요청이므로 사업 기획 산출물이 필요한 요청으로 판단했습니다.",
          approval_required: false,
          rule_hints: ["기획서", "기획"],
          review_flags: [],
        },
      ],
    });

    render(<RequestIntakePage />);

    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: "문구수정하고 기획서 작성해줘." },
    });
    fireEvent.click(screen.getByRole("button", { name: "작업 후보 추출" }));

    await screen.findByText("작업 후보 검토");
    fireEvent.click(screen.getByRole("button", { name: "후보 분할" }));
    fireEvent.change(screen.getByLabelText("분할 항목"), {
      target: { value: "문구수정하고\n기획서 작성해줘." },
    });
    fireEvent.click(screen.getByRole("button", { name: "분할 저장" }));

    await waitFor(() =>
      expect(splitCandidateMock).toHaveBeenCalledWith("candidate-report", [
        "문구수정하고",
        "기획서 작성해줘.",
      ]),
    );
    expect(await screen.findByText("후보를 2개로 분할했습니다.")).toBeInTheDocument();
    expect(screen.getByText("사업·프로그램 기획 후보")).toBeInTheDocument();
    expect(screen.getByText("실행 대상 2개 / 전체 2개")).toBeInTheDocument();
  });

  it("requires at least one selected agent before saving a candidate", async () => {
    createIntakeMock.mockResolvedValue({
      id: "intake-1",
      title: "회의록",
      input_type: "meeting_notes",
      raw_content: "원문",
      candidate_tasks: candidateTasks,
    });

    render(<RequestIntakePage />);

    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: "조직행동검사 5페이지 문구를 수정하자." },
    });
    fireEvent.click(screen.getByRole("button", { name: "작업 후보 추출" }));

    await screen.findByText("작업 후보 검토");
    fireEvent.click(screen.getAllByRole("button", { name: "후보 수정" })[0]);
    fireEvent.click(screen.getByRole("checkbox", { name: "CRATA CEO 선택" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "결과지 에디터 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "후보 저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("추천 에이전트를 1명 이상 선택하세요.");
    expect(updateCandidateMock).not.toHaveBeenCalled();
  });
});
