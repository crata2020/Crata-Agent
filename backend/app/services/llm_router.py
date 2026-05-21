from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import get_settings

class TaskDecompositionItem(BaseModel):
    task_type: str = Field(description="The category of the task. Must be one of: 'report_phrase_revision', 'counseling_case_learning', 'relationship_pattern_analysis', 'business_planning', 'content_marketing', 'general_agent_task'")
    title: str = Field(description="A short, clear title for this specific task.")
    summary: str = Field(description="A 1-2 sentence summary of what this task aims to achieve.")
    evidence_excerpt: str = Field(description="The exact part of the user's input that triggered this task.")
    clarifying_questions: list[str] = Field(description="Questions to ask the user if more information is needed before starting.", default_factory=list)

class TaskDecompositionResult(BaseModel):
    tasks: list[TaskDecompositionItem] = Field(description="List of identified tasks.")

def decompose_intake_with_llm(user_input: str) -> list[dict]:
    try:
        settings = get_settings()
        llm = ChatOpenAI(model=settings.openai_model, openai_api_key=settings.openai_api_key, temperature=0.1)

        prompt = ChatPromptTemplate.from_messages([
            ("system", """당신은 CRATA AI 오피스의 '작업 분류 에이전트(Router)'입니다.
사용자의 요청을 읽고, 의미상 독립적인 여러 개의 작업으로 정밀하게 분리하세요.
예를 들어 "집단검사를 설명하고 기획안을 만들어줘"라면 "설명(일반 작업)"과 "기획안(사업 기획)" 2개로 분리해야 합니다.

사용 가능한 task_type 목록:
- report_phrase_revision: 검사 결과지 문구 수정 요청
- counseling_case_learning: 상담 사례 분석 및 학습
- relationship_pattern_analysis: 두 명 이상의 유형 간 관계 패턴 분석
- business_planning: 사업, 프로그램 기획, 제안서 작성
- content_marketing: 마케팅 콘텐츠, 블로그, SNS 작성
- general_agent_task: 기타 일반적인 지식 탐색, 개념 설명, 요약 등의 요청

각 작업이 실행되기 전 사용자에게 물어봐야 할 필수 정보가 있다면 clarifying_questions에 포함하세요.
모든 출력(title, summary, evidence_excerpt, clarifying_questions)은 반드시 한국어로 작성하세요."""),
            ("human", "{user_input}")
        ])

        structured_llm = llm.with_structured_output(TaskDecompositionResult)
        chain = prompt | structured_llm
        result = chain.invoke({"user_input": user_input})
        return [task.model_dump() for task in result.tasks]
    except Exception as e:
        print(f"Error in LLM routing: {e}")
        return []
