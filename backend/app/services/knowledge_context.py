from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


OFFICIAL_MASTER_REFERENCES = [
    "knowledge/official/personal-behavior-motivation/MASTER.md",
    "knowledge/official/group-behavior/MASTER.md",
]
AGENT_GUIDE_REFERENCE = "knowledge/agent-guides/agent-operating-guides.md"


@dataclass(frozen=True)
class KnowledgeContext:
    text: str
    references: list[str]


def load_task_knowledge_context(
    *,
    task_type: str,
    assigned_agents: Sequence[str],
) -> KnowledgeContext:
    references = [
        *OFFICIAL_MASTER_REFERENCES,
        AGENT_GUIDE_REFERENCE,
    ]
    blocks = [
        "# CRATA 지식 컨텍스트",
        "",
        "이 컨텍스트는 작업 실행 시 공식 검사 지식과 에이전트 작업 절차를 함께 제공하기 위한 자료다.",
        f"작업 유형: {task_type}",
        f"배정 에이전트: {', '.join(assigned_agents) if assigned_agents else '미지정'}",
        "",
    ]

    for reference in references:
        content = _read_knowledge_file(reference)
        blocks.extend(
            [
                f"## 참조 파일: {reference}",
                "",
                content.strip(),
                "",
            ]
        )

    return KnowledgeContext(text="\n".join(blocks).strip(), references=references)


def _read_knowledge_file(reference: str) -> str:
    path = _repo_root() / reference
    if not path.exists():
        return f"[누락된 지식 파일: {reference}]"

    return path.read_text(encoding="utf-8")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]
