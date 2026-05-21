from pathlib import Path

from app.services import llm_graph


REPO_ROOT = Path(__file__).resolve().parents[2]
GROUP_MASTER = "knowledge/official/group-behavior/MASTER.md"
REQUEST_CONTEXT_WITH_SELECTED_REFERENCE = (
    "# 사용자 작업\n\n"
    "설명: 집단검사가 무엇인지 설명\n\n"
    "# CRATA 지식 컨텍스트\n\n"
    f"## 참조 파일: {GROUP_MASTER}\n\n"
    "전문"
)


class FakeDoc:
    def __init__(self, page_content: str, source: str) -> None:
        self.page_content = page_content
        self.metadata = {"source": source}


class FakeVectorStore:
    def __init__(self, docs: list[FakeDoc]) -> None:
        self.docs = docs
        self.calls = []

    def similarity_search(self, query: str, k: int, filter: dict | None = None) -> list[FakeDoc]:
        self.calls.append({"query": query, "k": k, "filter": filter})
        return self.docs[:k]


def test_retrieve_node_filters_vector_search_to_selected_knowledge_files(monkeypatch) -> None:
    source = str((REPO_ROOT / GROUP_MASTER).resolve())
    fake_store = FakeVectorStore([FakeDoc("집단검사 관련 조각", source)])
    monkeypatch.setattr(llm_graph, "get_vector_store", lambda: fake_store)

    result = llm_graph.retrieve_node(
        {
            "task_title": "집단검사 설명",
            "task_type": "general_agent_task",
            "context": REQUEST_CONTEXT_WITH_SELECTED_REFERENCE,
            "retrieved_docs": "",
            "draft": "",
        }
    )

    assert result["retrieved_docs"].startswith(f"[Source: {source}]")
    assert fake_store.calls == [
        {
            "query": "general_agent_task 집단검사 설명 # 사용자 작업 설명: 집단검사가 무엇인지 설명",
            "k": 2,
            "filter": {"source": source},
        }
    ]


def test_retrieve_node_prefers_explicit_evidence_bundle_without_vector_search(monkeypatch) -> None:
    def fail_vector_store():
        raise AssertionError("explicit evidence bundle should skip vector search")

    monkeypatch.setattr(llm_graph, "get_vector_store", fail_vector_store)

    result = llm_graph.retrieve_node(
        {
            "task_title": "집단검사 기획",
            "task_type": "planning",
            "context": (
                "# CRATA 지식 컨텍스트\n\n"
                "# 공식 근거 조각\n\n"
                "## evidence: group_behavior.definition\n"
                "source: knowledge/evidence/group_behavior.json\n"
                "heading: 검사 정의\n"
                "집단검사는 의사결정 경로와 자기 신뢰가 높아지는 관계 환경을 봅니다.\n\n"
                "# 작업 플레이북\n"
                "이 뒤의 내용은 검색 근거가 아닙니다."
            ),
            "retrieved_docs": "",
            "draft": "",
        }
    )

    assert "group_behavior.definition" in result["retrieved_docs"]
    assert "의사결정 경로" in result["retrieved_docs"]
    assert "작업 플레이북" not in result["retrieved_docs"]


def test_retrieve_node_does_not_fall_back_to_global_vector_search_when_selected_file_has_no_hits(
    monkeypatch,
) -> None:
    fake_store = FakeVectorStore([])
    monkeypatch.setattr(llm_graph, "get_vector_store", lambda: fake_store)

    result = llm_graph.retrieve_node(
        {
            "task_title": "집단검사 설명",
            "task_type": "general_agent_task",
            "context": REQUEST_CONTEXT_WITH_SELECTED_REFERENCE,
            "retrieved_docs": "",
            "draft": "",
        }
    )

    assert "선택된 지식 파일에서 관련 근거를 찾지 못했습니다." in result["retrieved_docs"]
    assert len(fake_store.calls) == 1
    assert fake_store.calls[0]["filter"] == {"source": str((REPO_ROOT / GROUP_MASTER).resolve())}


def test_retrieve_node_uses_global_vector_search_without_selected_references(monkeypatch) -> None:
    fake_store = FakeVectorStore([FakeDoc("공식 지식 조각", "source.md")])
    monkeypatch.setattr(llm_graph, "get_vector_store", lambda: fake_store)

    result = llm_graph.retrieve_node(
        {
            "task_title": "기획",
            "task_type": "business_planning",
            "context": "참조 파일이 없는 컨텍스트",
            "retrieved_docs": "",
            "draft": "",
        }
    )

    assert "[Source: source.md]" in result["retrieved_docs"]
    assert fake_store.calls == [
        {
            "query": "business_planning 기획 참조 파일이 없는 컨텍스트",
            "k": 3,
            "filter": None,
        }
    ]
