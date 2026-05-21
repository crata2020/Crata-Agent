from dataclasses import dataclass
from typing import Any


INTERNAL_MARKERS = (
    "작업 유형",
    "배정 에이전트",
    "primary_agent",
    "knowledge_gate",
    "quality_gate",
    "action_policy",
    "참조된 컨텍스트",
    "검수 메모",
)

PERSISTED_CLAIM_MARKERS = (
    "저장했습니다",
    "저장 완료",
    "반영했습니다",
    "공식 지식에 반영",
    "MASTER를 수정",
    "학습에 반영했습니다",
)

ANONYMIZATION_MARKERS = ("익명화", "개인정보", "비식별")
APPROVAL_MARKERS = ("승인", "검토")


@dataclass(frozen=True)
class GuardResult:
    passed: bool
    issues: list[str]
    rewrite_required: bool

    def to_dict(self) -> dict[str, Any]:
        return {
            "passed": self.passed,
            "issues": self.issues,
            "rewrite_required": self.rewrite_required,
        }


def validate_output(
    *,
    task_type: str,
    workflow_plan: dict[str, Any] | None,
    draft: str,
    enforce_case_learning_requirements: bool = True,
) -> GuardResult:
    workflow_plan = workflow_plan or {}
    issues: list[str] = []

    if _contains_any(draft, INTERNAL_MARKERS):
        issues.append("내부 메타데이터가 사용자 응답에 노출되었습니다.")

    if workflow_plan.get("approval_required") and _contains_any(draft, PERSISTED_CLAIM_MARKERS):
        issues.append("승인 전 저장 또는 공식 반영이 완료된 것처럼 표현했습니다.")

    canonical_task_type = str(workflow_plan.get("task_type") or task_type)
    if enforce_case_learning_requirements and canonical_task_type == "case_learning":
        if workflow_plan.get("requires_anonymization") and not _contains_any(draft, ANONYMIZATION_MARKERS):
            issues.append("상담 사례 학습 후보에 익명화 또는 개인정보 제거 기준이 없습니다.")
        if workflow_plan.get("approval_required") and not _contains_any(draft, APPROVAL_MARKERS):
            issues.append("상담 사례 저장의 승인 필요성이 드러나지 않았습니다.")

    if canonical_task_type == "planning" and workflow_plan.get("exam") == "personal_behavior_motivation":
        issues.extend(_personal_behavior_planning_issues(draft=draft, workflow_plan=workflow_plan))

    return GuardResult(
        passed=not issues,
        issues=issues,
        rewrite_required=bool(issues),
    )


def _personal_behavior_planning_issues(*, draft: str, workflow_plan: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    normalized = draft.casefold()
    constraints = workflow_plan.get("planning_constraints") or {}

    if "동기위치" not in normalized:
        issues.append("개인행동 동기검사 기반 기획안인데 동기위치(행동 시작 조건)가 반영되지 않았습니다.")
    if "동기성향" not in normalized:
        issues.append("개인행동 동기검사 기반 기획안인데 동기성향(행동 지속 조건)이 반영되지 않았습니다.")
    if "고유/현재" not in normalized and not ("고유" in normalized and "현재" in normalized):
        issues.append("개인행동 동기검사 기반 기획안인데 고유/현재 비교가 반영되지 않았습니다.")

    if workflow_plan.get("planning_topic") == "career":
        if "시작" not in normalized:
            issues.append("진로 기획안인데 진로 행동의 시작 조건이 드러나지 않았습니다.")
        if "지속" not in normalized:
            issues.append("진로 기획안인데 진로 탐색의 지속 조건이 드러나지 않았습니다.")

    duration_minutes = constraints.get("duration_minutes")
    if duration_minutes:
        duration_markers = [f"{duration_minutes}분"]
        if duration_minutes % 60 == 0:
            duration_markers.append(f"{duration_minutes // 60}시간")
        if not _contains_any(draft, tuple(duration_markers)):
            issues.append(f"사용자가 요청한 시간 조건({duration_minutes}분)이 세부 운영표에 반영되지 않았습니다.")

    if constraints.get("budget_requested") and "예산" not in normalized:
        issues.append("사용자가 예산 제안을 요청했지만 예산안이 포함되지 않았습니다.")

    return issues


def _contains_any(text: str, markers: tuple[str, ...]) -> bool:
    normalized = text.casefold()
    return any(marker.casefold() in normalized for marker in markers)
