import os
import re
from pathlib import Path
from typing import TypedDict

from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from langgraph.graph import END, START, StateGraph

from app.core.config import get_settings


class AgentState(TypedDict):
    task_title: str
    task_type: str
    context: str
    retrieved_docs: str
    draft: str


_vector_store = None
REFERENCE_PATTERN = re.compile(r"^## 참조 파일:\s*(knowledge/[^\r\n]+?\.md)\s*$", re.MULTILINE)


def get_vector_store() -> Chroma:
    global _vector_store
    if _vector_store is not None:
        return _vector_store

    settings = get_settings()
    embeddings = OpenAIEmbeddings(openai_api_key=settings.openai_api_key)
    persist_directory = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../chroma_db"))

    if os.path.exists(persist_directory) and os.listdir(persist_directory):
        _vector_store = Chroma(persist_directory=persist_directory, embedding_function=embeddings)
        return _vector_store

    knowledge_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../knowledge"))
    
    # Load markdown files safely
    loader = DirectoryLoader(
        knowledge_dir, 
        glob="**/*.md", 
        loader_cls=TextLoader, 
        loader_kwargs={'encoding': 'utf-8'}
    )
    docs = loader.load()

    headers_to_split_on = [
        ("#", "Header 1"),
        ("##", "Header 2"),
        ("###", "Header 3"),
    ]
    markdown_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)

    md_header_splits = []
    for doc in docs:
        splits = markdown_splitter.split_text(doc.page_content)
        for split in splits:
            split.metadata["source"] = doc.metadata.get("source", "Unknown")
        md_header_splits.extend(splits)

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    final_splits = text_splitter.split_documents(md_header_splits)

    if not final_splits:
        _vector_store = Chroma.from_texts(["비어있음"], embedding=embeddings, persist_directory=persist_directory)
        return _vector_store

    _vector_store = Chroma.from_documents(documents=final_splits, embedding=embeddings, persist_directory=persist_directory)
    return _vector_store


def retrieve_node(state: AgentState) -> dict:
    explicit_evidence = _explicit_evidence_from_context(state["context"])
    if explicit_evidence:
        return {"retrieved_docs": explicit_evidence}

    query = _retrieval_query(state)
    vs = get_vector_store()
    references = _knowledge_references_from_context(state["context"])

    if references:
        docs = []
        for reference in references:
            docs.extend(
                vs.similarity_search(
                    query,
                    k=2,
                    filter={"source": _source_path_for_reference(reference)},
                )
            )
        docs = _dedupe_docs(docs)[:6]
        if not docs:
            return {
                "retrieved_docs": "선택된 지식 파일에서 관련 근거를 찾지 못했습니다."
            }
        return {"retrieved_docs": _format_docs(docs)}

    docs = vs.similarity_search(query, k=3)
    return {"retrieved_docs": _format_docs(docs)}


def _retrieval_query(state: AgentState) -> str:
    query = " ".join(
        part
        for part in (
            state["task_type"],
            state["task_title"],
            _request_context_for_retrieval(state["context"]),
        )
        if part
    ).strip()
    return query[:1200]


def _request_context_for_retrieval(context: str) -> str:
    request_context = context.split("# CRATA 지식 컨텍스트", 1)[0].strip()
    if request_context:
        return " ".join(request_context.split())

    if context.lstrip().startswith("## 참조 파일:"):
        return ""

    return " ".join(context.split())


def _knowledge_references_from_context(context: str) -> list[str]:
    references = []
    for match in REFERENCE_PATTERN.finditer(context):
        reference = match.group(1).strip()
        if reference not in references:
            references.append(reference)
    return references


def _explicit_evidence_from_context(context: str) -> str:
    marker = "# 공식 근거 조각"
    if marker not in context:
        return ""

    evidence_block = context.split(marker, 1)[1]
    next_heading_index = evidence_block.find("\n# ")
    if next_heading_index >= 0:
        evidence_block = evidence_block[:next_heading_index]

    evidence_block = evidence_block.strip()
    if not evidence_block:
        return ""

    return f"{marker}\n\n{evidence_block}"[:6000]


def _source_path_for_reference(reference: str) -> str:
    return str((_repo_root() / reference).resolve())


def _dedupe_docs(docs) -> list:
    seen = set()
    unique_docs = []
    for doc in docs:
        key = (doc.metadata.get("source", "Unknown"), doc.page_content)
        if key in seen:
            continue
        seen.add(key)
        unique_docs.append(doc)
    return unique_docs


def _format_docs(docs) -> str:
    return "\n\n".join(
        f"[Source: {doc.metadata.get('source', 'Unknown')}]\n{doc.page_content}"
        for doc in docs
    )


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def generate_node(state: AgentState) -> dict:
    settings = get_settings()
    llm = ChatOpenAI(model=settings.openai_model, openai_api_key=settings.openai_api_key, temperature=0.2)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """당신은 CRATA의 사용자-facing AI 어시스턴트입니다.
공식 지식을 참고하되, 사용자가 바로 읽을 수 있는 답변만 작성하세요.

출력 규칙:
- 한국어로 자연스럽게 답변합니다.
- 작업 유형, 배정 에이전트, 승인 상태, 내부 컨텍스트, 참조 파일, 검수 메모를 노출하지 않습니다.
- '작업 정리', '검수 메모', '참조한 컨텍스트 요약' 같은 내부 섹션을 만들지 않습니다.
- 개념 설명, 요약, 정리 요청은 일반 AI 채팅처럼 바로 답합니다.
- 정보가 부족하면 답을 지어내지 말고 '## 먼저 확인할 질문' 아래에 1~3개의 짧은 질문만 남깁니다.
- 수정요청 사유나 이전 피드백이 있으면 그 내용을 최우선으로 반영합니다.
- 공식 지식과 충돌하는 내용은 만들지 않습니다."""),
        ("human", """[공식 지식]
{retrieved_docs}

[작업 요청]
유형: {task_type}
제목: {task_title}
내용:
{context}""")
    ])
    
    chain = prompt | llm
    res = chain.invoke({
        "retrieved_docs": state["retrieved_docs"],
        "task_type": state["task_type"],
        "task_title": state["task_title"],
        "context": state["context"]
    })
    
    return {"draft": str(res.content)}


builder = StateGraph(AgentState)
builder.add_node("retrieve", retrieve_node)
builder.add_node("generate", generate_node)
builder.add_edge(START, "retrieve")
builder.add_edge("retrieve", "generate")
builder.add_edge("generate", END)
graph = builder.compile()


def run_agent_workflow(task_title: str, task_type: str, context: str) -> str:
    initial_state = {
        "task_title": task_title,
        "task_type": task_type,
        "context": context,
        "retrieved_docs": "",
        "draft": ""
    }
    result = graph.invoke(initial_state)
    return result["draft"]
