from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Approval, Artifact, CandidateTask, IntakeItem, Task, WorkflowRun, WorkflowStep
from app.services.agent_seed import seed_agents
from app.services.workflow_runner import run_task_workflow


def test_run_task_workflow_creates_artifact_and_approval(db_session: Session) -> None:
    seed_agents(db_session)
    intake_item = IntakeItem(
        title="결과지 문구 회의록",
        input_type="memo",
        raw_content="결과지 공식 문구를 더 부드럽게 수정하고 승인 후 반영한다.",
    )
    db_session.add(intake_item)
    db_session.flush()
    candidate_task = CandidateTask(
        intake_item_id=intake_item.id,
        task_type="report_phrase_revision",
        title="결과지 문구 수정",
        summary="결과지 문구를 수정한다.",
        evidence_excerpt="결과지 공식 문구",
        recommended_agents=["report_editor"],
    )
    db_session.add(candidate_task)
    db_session.flush()
    task = Task(
        candidate_task_id=candidate_task.id,
        task_type=candidate_task.task_type,
        title=candidate_task.title,
        description=candidate_task.summary,
        status="running",
        assigned_agents=candidate_task.recommended_agents,
    )
    db_session.add(task)
    db_session.commit()

    result = run_task_workflow(db_session, task.id)

    assert result.status == "pending_approval"

    artifacts = db_session.scalars(select(Artifact)).all()
    approvals = db_session.scalars(select(Approval)).all()
    assert len(artifacts) == 1
    assert len(approvals) == 1

    artifact = artifacts[0]
    approval = approvals[0]
    db_session.refresh(task)
    workflow_run = db_session.get(WorkflowRun, result.workflow_run_id)

    assert artifact.id == result.artifact_id
    assert approval.id == result.approval_id
    assert artifact.status == "pending_approval"
    assert approval.status == "pending_approval"
    assert task.status == "pending_approval"
    assert workflow_run is not None
    assert workflow_run.status == "pending_approval"
    assert workflow_run.current_step == "approval_pending"
    assert workflow_run.checkpoint["graph_name"] == "agent_operation_graph"
    assert [node["name"] for node in workflow_run.checkpoint["node_trace"]] == [
        "ceo_routing",
        "context_retrieval",
        "question_gate",
        "specialist_draft",
        "quality_review",
        "approval_pending",
    ]

    steps = db_session.scalars(
        select(WorkflowStep)
        .where(WorkflowStep.workflow_run_id == workflow_run.id)
        .order_by(WorkflowStep.started_at)
    ).all()
    assert [(step.step_name, step.agent_id) for step in steps] == [
        ("ceo_routing", "crata_ceo"),
        ("context_retrieval", "concept_guardian"),
        ("question_gate", "report_editor"),
        ("specialist_draft", "report_editor"),
        ("quality_review", "quality_inspector"),
    ]
    assert [(step.step_name, step.output_summary) for step in steps] == [
        ("ceo_routing", "작업 유형과 담당 에이전트 실행 순서를 정했습니다."),
        ("context_retrieval", "공식 지식과 에이전트 작업 가이드를 연결했습니다."),
        ("question_gate", "전문가 질문과 입력된 답변 반영 여부를 확인했습니다."),
        ("specialist_draft", "담당 에이전트가 초안을 작성했습니다."),
        ("quality_review", "개념, 톤, 안전성 검수 단계가 완료되었습니다."),
    ]
    assert task.title in approval.title


def test_run_task_workflow_passes_knowledge_context_to_model(
    db_session: Session, monkeypatch
) -> None:
    captured_context = {}

    def capture_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        captured_context["value"] = context
        return "# 사업 기획 초안"

    monkeypatch.setattr("app.services.model_gateway.ModelGateway.draft", capture_draft)
    seed_agents(db_session)
    task = Task(
        task_type="business_planning",
        title="공공기관 회복 프로그램 제안서",
        description="공공기관 연수 프로그램에 CRATA 검사를 넣는 기획서를 만든다.",
        status="running",
        assigned_agents=["crata_ceo", "business_designer", "quality_inspector"],
    )
    db_session.add(task)
    db_session.commit()

    result = run_task_workflow(db_session, task.id)

    assert result.status == "pending_approval"
    context_text = captured_context["value"]
    assert "CRATA 지식 컨텍스트" in context_text
    assert "knowledge/official/personal-behavior-motivation/MASTER.md" not in context_text
    assert "knowledge/official/group-behavior/MASTER.md" not in context_text
    assert "knowledge/official/organizational-behavior/MASTER.md" not in context_text
    assert "knowledge/agent-guides/agent-operating-guides.md" in context_text
    assert "어떤 검사나 유형 기준으로 볼지" in context_text

    workflow_run = db_session.get(WorkflowRun, result.workflow_run_id)
    assert workflow_run is not None
    context_step = db_session.scalar(
        select(WorkflowStep).where(
            WorkflowStep.workflow_run_id == workflow_run.id,
            WorkflowStep.step_name == "context_retrieval",
        )
    )
    assert context_step is not None
    assert context_step.item_metadata["knowledge_references"] == [
        "knowledge/agent-guides/agent-operating-guides.md",
    ]


def test_run_task_workflow_passes_candidate_clarifying_questions_to_model(
    db_session: Session, monkeypatch
) -> None:
    captured_context = {}

    def capture_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        captured_context["value"] = context
        return "# 사업 기획 초안"

    monkeypatch.setattr("app.services.model_gateway.ModelGateway.draft", capture_draft)
    seed_agents(db_session)
    intake_item = IntakeItem(
        title="기획 요청",
        input_type="memo",
        raw_content="공공기관 연수 프로그램 제안서를 기획해줘.",
    )
    db_session.add(intake_item)
    db_session.flush()
    candidate_task = CandidateTask(
        intake_item_id=intake_item.id,
        task_type="business_planning",
        title="사업·프로그램 기획 후보",
        summary="공공기관 연수 프로그램 제안서 기획 요청입니다.",
        evidence_excerpt="공공기관 연수 프로그램 제안서를 기획해줘.",
        recommended_agents=["crata_ceo", "business_designer"],
        item_metadata={
            "clarifying_questions": [
                "대상 기관 또는 고객은 누구인가요?",
                "예산, 일정, 운영 형태의 제한은 무엇인가요?",
            ]
        },
    )
    db_session.add(candidate_task)
    db_session.flush()
    task = Task(
        candidate_task_id=candidate_task.id,
        task_type=candidate_task.task_type,
        title=candidate_task.title,
        description=candidate_task.summary,
        status="running",
        assigned_agents=candidate_task.recommended_agents,
    )
    db_session.add(task)
    db_session.commit()

    result = run_task_workflow(db_session, task.id)

    assert result.status == "pending_approval"
    assert "먼저 확인할 질문" in captured_context["value"]
    assert "대상 기관 또는 고객은 누구인가요?" in captured_context["value"]
    assert "예산, 일정, 운영 형태의 제한은 무엇인가요?" in captured_context["value"]


def test_run_task_workflow_passes_candidate_clarifying_answers_to_model(
    db_session: Session, monkeypatch
) -> None:
    captured_context = {}

    def capture_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        captured_context["value"] = context
        return "# 사업 기획 초안"

    monkeypatch.setattr("app.services.model_gateway.ModelGateway.draft", capture_draft)
    seed_agents(db_session)
    intake_item = IntakeItem(
        title="기획 요청",
        input_type="memo",
        raw_content="공공기관 연수 프로그램 제안서를 기획해줘.",
    )
    db_session.add(intake_item)
    db_session.flush()
    candidate_task = CandidateTask(
        intake_item_id=intake_item.id,
        task_type="business_planning",
        title="사업·프로그램 기획 후보",
        summary="공공기관 연수 프로그램 제안서 기획 요청입니다.",
        evidence_excerpt="공공기관 연수 프로그램 제안서를 기획해줘.",
        recommended_agents=["crata_ceo", "business_designer"],
        item_metadata={
            "clarifying_questions": [
                "대상 기관 또는 고객은 누구인가요?",
            ],
            "clarifying_answers": "대상은 지방 공공기관 신규 관리자이며, 성과는 조직 적응과 회복 탄력성 강화입니다.",
        },
    )
    db_session.add(candidate_task)
    db_session.flush()
    task = Task(
        candidate_task_id=candidate_task.id,
        task_type=candidate_task.task_type,
        title=candidate_task.title,
        description=candidate_task.summary,
        status="running",
        assigned_agents=candidate_task.recommended_agents,
    )
    db_session.add(task)
    db_session.commit()

    result = run_task_workflow(db_session, task.id)

    assert result.status == "pending_approval"
    assert "질문 답변 / 추가 메모" in captured_context["value"]
    assert "지방 공공기관 신규 관리자" in captured_context["value"]


def test_run_task_workflow_stores_quality_guard_result(
    db_session: Session, monkeypatch
) -> None:
    def draft_with_internal_metadata(self, *, task_title: str, task_type: str, context: str) -> str:
        return "# 결과지 문구 수정\n\n## 작업 유형\nreport_phrase_revision\n\n공식 지식에 반영했습니다."

    monkeypatch.setattr("app.services.model_gateway.ModelGateway.draft", draft_with_internal_metadata)
    seed_agents(db_session)
    task = Task(
        task_type="report_phrase_revision",
        title="결과지 문구 수정",
        description="비교형 결과지 문구를 수정한다.",
        status="running",
        assigned_agents=["report_editor"],
    )
    db_session.add(task)
    db_session.commit()

    result = run_task_workflow(db_session, task.id)

    artifact = db_session.get(Artifact, result.artifact_id)
    approval = db_session.get(Approval, result.approval_id)
    assert artifact is not None
    assert approval is not None
    guard = artifact.item_metadata["quality_guard"]
    assert guard["passed"] is False
    assert guard["rewrite_required"] is True
    assert any("내부 메타데이터" in issue for issue in guard["issues"])
    assert any("승인 전 저장" in issue for issue in guard["issues"])
    assert "검수 이슈" in approval.reviewer_note
