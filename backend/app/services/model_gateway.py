from app.core.config import get_settings


class ModelGateway:
    def __init__(self) -> None:
        self.settings = get_settings()

    def draft(self, *, task_title: str, task_type: str, context: str) -> str:
        return self._fallback_draft(task_title=task_title, task_type=task_type, context=context)

    def _fallback_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        evidence = context[:500]
        return (
            f"# {task_title}\n\n"
            "## 작업 유형\n"
            f"{task_type}\n\n"
            "## 초안\n"
            "MVP 에이전트 워크플로우가 생성한 결정론적 초안입니다.\n\n"
            "## 근거\n"
            f"{evidence}\n\n"
            "## 검토 메모\n"
            "공식 지식과 결과지 문구에 반영하기 전에 사용자 승인이 필요합니다."
        )
