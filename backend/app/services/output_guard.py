from dataclasses import dataclass
from typing import Any


INTERNAL_MARKERS = (
    "작업 유형",
    "배정 에이전트",
    "primary_agent",
    "knowledge_gate",
    "quality_gate",
    "action_policy",
    "참조한 컨텍스트",
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

ANONYMIZATION_MARKERS = ("익명", "개인정보", "식별")
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
        issues.append("내부 메타데이터가 사용자 답변에 노출되었습니다.")

    if workflow_plan.get("approval_required") and _contains_any(draft, PERSISTED_CLAIM_MARKERS):
        issues.append("승인 전 저장 또는 공식 반영을 완료한 것처럼 표현했습니다.")

    canonical_task_type = str(workflow_plan.get("task_type") or task_type)
    if enforce_case_learning_requirements and canonical_task_type == "case_learning":
        if workflow_plan.get("requires_anonymization") and not _contains_any(draft, ANONYMIZATION_MARKERS):
            issues.append("상담 사례 학습 후보에 익명화 또는 개인정보 제거 기준이 없습니다.")
        if workflow_plan.get("approval_required") and not _contains_any(draft, APPROVAL_MARKERS):
            issues.append("상담 사례 저장 전 승인 필요성이 드러나지 않습니다.")

    return GuardResult(
        passed=not issues,
        issues=issues,
        rewrite_required=bool(issues),
    )


def _contains_any(text: str, markers: tuple[str, ...]) -> bool:
    normalized = text.casefold()
    return any(marker.casefold() in normalized for marker in markers)
