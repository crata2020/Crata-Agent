import re

from app.core.config import get_settings
from app.services.exam_knowledge_router import (
    GROUP_MASTER_REFERENCE,
    PERSONAL_MASTER_REFERENCE,
    infer_primary_official_reference,
)


class ModelGateway:
    def __init__(self) -> None:
        self.settings = get_settings()

    def draft(self, *, task_title: str, task_type: str, context: str) -> str:
        from app.services.llm_graph import run_agent_workflow
        
        try:
            return run_agent_workflow(task_title=task_title, task_type=task_type, context=context)
        except Exception as e:
            # Fallback for debugging if API fails
            print(f"Error in LangGraph: {e}")
            return self._fallback_draft(task_title=task_title, task_type=task_type, context=context)

    def fallback_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        return self._fallback_draft(task_title=task_title, task_type=task_type, context=context)

    def _fallback_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        if task_type in {"business_planning", "planning"}:
            return self._business_planning_draft(task_title=task_title, task_type=task_type, context=context)
        if task_type in {"content_marketing", "content_strategy"}:
            return self._content_marketing_draft(task_title=task_title, task_type=task_type, context=context)
        if task_type == "report_phrase_revision":
            return self._report_phrase_revision_draft(task_title=task_title, task_type=task_type, context=context)
        if task_type in {"counseling_case_learning", "case_learning"}:
            return self._case_learning_draft(task_title=task_title, task_type=task_type, context=context)
        if task_type == "relationship_pattern_analysis":
            return self._relationship_analysis_draft(task_title=task_title, task_type=task_type, context=context)

        return self._general_draft(task_title=task_title, task_type=task_type, context=context)

    def _business_planning_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        structure_lines = self._planning_structure_lines(context)
        return "\n".join(
            [
                self._header(task_title, task_type),
                *self._questions_section(
                    context,
                    [
                        "대상: 참여자, 구매자, 승인권자는 누구인가?",
                        "문제: 지금 개선하려는 핵심 장면은 무엇인가?",
                        "목적: 이해, 회복, 의사결정 개선, 팀빌딩 중 무엇이 우선인가?",
                        "성과: 어떤 변화가 생기면 성공이라고 볼 것인가?",
                        "예산: 강사비, 자료비, 장소비, 운영비 범위가 있는가?",
                        "일정: 1회, 3시간, 1박2일, 다회기 중 어떤 형식인가?",
                        "검사 활용: CRATA 검사를 진단, 해석, 활동, 후속관리 중 어디에 넣을 것인가?",
                    ],
                ),
                "## 문제 정의 초안",
                "현재 입력만으로는 최종 제안서를 바로 확정하기보다, 기관이 겪는 불편과 기대성과를 먼저 좁혀야 한다.",
                "초기 가설은 '참여자의 자기이해와 집단 내 의사결정/소통 비용을 줄이는 프로그램'이다.",
                "",
                "## CRATA 검사 활용 방향",
                "- 개인행동 동기검사: 행동의 시작점, 지속 에너지, 고유/현재 연결을 통해 개인별 동기 작동 방식을 설명한다.",
                "- 집단행동검사: 의사결정 경로와 자기 신뢰가 올라가는 관계 환경을 통해 회의, 합의, 관계 속 결정 지연 문제를 설명한다.",
                "- 색채검사와 조직행동검사는 공식 MASTER가 들어오기 전까지 단정적으로 쓰지 않는다.",
                "",
                "## 제안서 기본 구조",
                *structure_lines,
                "",
                "## 추가 리서치 후보",
                "- 공공기관 또는 기업 현장의 소통 비용, 의사결정 지연, 회복 프로그램 필요성.",
                "- 대상 기관의 최근 사업 방향, 교육 목표, 복지/조직문화 과제.",
                "",
                "## 작성 시 주의점",
                "검사를 치료나 진단처럼 표현하지 않는다. 제안서에는 '이해와 의사결정 지원 도구'로 설명한다.",
            ]
        )

    def _content_marketing_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        return "\n".join(
            [
                self._header(task_title, task_type),
                *self._questions_section(
                    context,
                    [
                        "채널: 유튜브, 블로그, 홈페이지, 카드뉴스, 안내문 중 어디에 쓸 것인가?",
                        "타깃: 개인, 부모, 부부, 기업 담당자, 공공기관 담당자, 상담사 중 누구인가?",
                        "전환 목표: 이해, 문의, 신청, 신뢰 형성, 공유 중 무엇인가?",
                        "금지 표현: 자극적이거나 진단처럼 보이면 안 되는 표현이 있는가?",
                    ],
                ),
                "## 핵심 메시지 후보",
                "CRATA는 사람을 유형으로 가두는 검사가 아니라, 행동이 시작되고 지속되는 방식과 집단 안에서 결정이 정리되는 경로를 이해하게 돕는 도구다.",
                "",
                "## 채널별 전개",
                "- 유튜브: 문제 장면 훅 -> 오해 깨기 -> CRATA 관점 -> 사례형 설명 -> 다음 행동.",
                "- 블로그: 검색 의도 -> 문제 정의 -> 검사 개념 -> 사례 -> 실천 팁 -> 안내.",
                "- 홈페이지: 대상 -> 해결 문제 -> 검사 흐름 -> 결과물 -> 문의 행동.",
                "",
                "## 작성 시 주의점",
                "검사를 만능 해결책처럼 말하지 않고, 유형을 낙인찍지 않는다.",
            ]
        )

    def _report_phrase_revision_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        return "\n".join(
            [
                self._header(task_title, task_type),
                *self._questions_section(context, []),
                "## 문구 수정 작업 절차",
                "1. 원문이 설명하려는 검사 축과 유형을 확인한다.",
                "2. 공식 정의와 충돌하는 표현이 있는지 확인한다.",
                "3. 부정적, 낙인적, 진단적, 과잉 단정 표현을 줄인다.",
                "4. 대상자가 읽어도 방어감이 덜 생기는 상담형 문장으로 바꾼다.",
                "5. 길이, 톤, 승인 필요 여부를 확인한다.",
                "",
                "## Before / After 초안",
                "- Before: 기존 문구를 여기에 붙이면 개념 오류, 낙인 표현, 길이 문제를 분리해 검토한다.",
                "- After: 공식 개념은 유지하되 '문제'가 아니라 '작동 방식과 조절 포인트'로 설명한다.",
                "",
                "## 수정 방향",
                "- '항상', '절대', '문제다' 같은 표현은 줄인다.",
                "- 유형을 결함처럼 쓰지 않고 상황에 따라 나타날 수 있는 반응으로 쓴다.",
                "- 집단행동검사는 실행력보다 의사결정 경로, 자기 신뢰, 결정 타이밍을 중심으로 설명한다.",
                "",
                "## 반영 기준",
                "결과지 문구 변경은 최종 반영 전 승인 절차를 거친다.",
            ]
        )

    def _case_learning_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        return "\n".join(
            [
                self._header(task_title, task_type),
                *self._questions_section(context, []),
                "## 사례 학습 절차",
                "1. 원문을 보존한다.",
                "2. 개인정보와 식별 정보를 제거한다.",
                "3. 유형, 관계 맥락, 감정, 행동, 반복 패턴을 추출한다.",
                "4. 공식 지식이 아니라 상담 사례로 저장한다.",
                "5. 반복되거나 중요한 관찰만 공식 반영 후보로 분리한다.",
                "",
                "## 추출 틀",
                "- 사례 요약:",
                "- 유형 정보:",
                "- 관계 맥락:",
                "- 핵심 감정:",
                "- 핵심 행동:",
                "- 상호작용 루프:",
                "- 공식 반영 후보 여부:",
                "",
                "## 저장 시 주의점",
                "단일 상담 사례를 공식 정의로 승격하지 않는다.",
            ]
        )

    def _relationship_analysis_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        return "\n".join(
            [
                self._header(task_title, task_type),
                *self._questions_section(context, []),
                "## 관계 패턴 분석 절차",
                "1. 각자의 검사 축과 유형을 확인한다.",
                "2. 관계 맥락을 확인한다.",
                "3. 촉발 행동, 해석, 감정, 반응을 분리한다.",
                "4. 한 사람의 문제로 몰지 않고 상호작용 루프로 정리한다.",
                "5. 도움이 되는 개입 후보를 제안한다.",
                "",
                "## 출력 틀",
                "- 유형 조합:",
                "- 관계 맥락:",
                "- 촉발 행동:",
                "- 해석 차이:",
                "- 반복 루프:",
                "- 도움이 되는 개입:",
                "- 공식 반영 가능성:",
                "",
                "## 작성 시 주의점",
                "관계 패턴은 공식 지식과 사례 관찰을 구분해서 표시한다.",
            ]
        )

    def _general_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        request_text = self._user_request_from_context(context) or task_title
        primary_reference = infer_primary_official_reference(request_text)

        if primary_reference == GROUP_MASTER_REFERENCE:
            return self._group_behavior_exam_answer()

        if primary_reference == PERSONAL_MASTER_REFERENCE:
            return self._personal_behavior_exam_answer()

        cleaned_request = self._clean_user_request(request_text)
        if cleaned_request:
            return (
                "요청하신 내용은 이렇게 정리할 수 있습니다.\n\n"
                f"{cleaned_request}\n\n"
                "더 구체적인 문서 형식이나 대상 독자가 정해져 있다면, 그 기준에 맞춰 바로 다시 다듬겠습니다."
            )

        return (
            "요청을 확인했습니다. 바로 답변을 확정하기에는 핵심 정보가 조금 부족합니다.\n\n"
            "어떤 결과물이 필요한지, 누가 읽을 답변인지, 반드시 반영해야 할 기준이 있는지 알려주시면 "
            "그에 맞춰 정리하겠습니다."
        )

    def _group_behavior_exam_answer(self) -> str:
        return (
            "집단검사는 개인이 혼자 있을 때의 성향만 보는 검사가 아니라, "
            "동료나 집단 안에서 어떻게 판단하고 상호작용하는지를 이해하기 위한 검사입니다.\n\n"
            "CRATA 관점에서 핵심은 사람을 좋고 나쁜 유형으로 나누는 것이 아닙니다. "
            "집단 상황에서 의사결정이 어떤 경로로 이뤄지는지, 자기 확신이 어떤 환경에서 높아지거나 낮아지는지, "
            "합의와 소통이 어디서 막히는지를 보는 데 초점이 있습니다.\n\n"
            "목적은 팀이나 조직 안에서 불필요한 소통 비용과 감정 비용을 줄이고, "
            "각 사람이 자신에게 맞는 방식으로 더 합리적이고 상황에 맞는 결정을 하도록 돕는 것입니다. "
            "그래서 결과는 누가 맞고 틀린지를 판단하기보다, 함께 일할 때 어떤 조건이 필요하고 "
            "어떤 방식으로 조율하면 좋은지를 찾는 데 사용됩니다."
        )

    def _personal_behavior_exam_answer(self) -> str:
        return (
            "이 경우에는 개인행동 동기검사부터 보는 것이 맞습니다.\n\n"
            "말씀하신 어려움은 집단 안에서의 의사결정이나 관계 조율 문제라기보다, "
            "행동을 어떻게 시작하고 무엇이 있어야 오래 유지되는지를 보는 쪽에 가깝습니다. "
            "개인행동 동기검사는 행동이 어디서 시작되는지 보는 동기위치와, "
            "그 행동을 무엇으로 지속하는지 보는 동기성향을 함께 확인합니다.\n\n"
            "예를 들어 책상에 앉는 것 자체가 어렵다면 시작 조건을 봐야 하고, "
            "앉아도 오래 유지가 어렵다면 지속 에너지의 방향을 봐야 합니다. "
            "그래서 지금 질문에는 집단검사보다 개인행동 동기검사가 먼저 연결됩니다."
        )

    def _user_request_from_context(self, context: str) -> str:
        for label in ("설명", "내용", "요청", "제목"):
            match = re.search(
                rf"^{label}\s*:\s*(.+?)(?=\n(?:설명|내용|요청|제목|작업 유형|배정 에이전트)\s*:|\n# |\Z)",
                context,
                flags=re.MULTILINE | re.DOTALL,
            )
            if match:
                value = match.group(1).strip()
                if value and not self._is_generic_task_title(value):
                    return value
        return ""

    def _clean_user_request(self, text: str) -> str:
        text = text.strip()
        if self._is_generic_task_title(text):
            return ""
        return text

    def _is_generic_task_title(self, text: str) -> bool:
        generic_markers = [
            "일반 에이전트 작업 후보",
            "일반 작업 후보",
            "general_agent_task",
        ]
        return any(marker in text for marker in generic_markers)

    def _header(self, task_title: str, task_type: str) -> str:
        return f"# {task_title}\n"

    def _reference_excerpt(self, context: str) -> str:
        compact = " ".join(self._remove_section(context, "# 먼저 확인할 질문").split())
        excerpt = compact[:900]
        return "\n" + "\n".join(["## 참조한 컨텍스트 요약", excerpt])

    def _planning_structure_lines(self, context: str) -> list[str]:
        sections = self._context_playbook_sections(context)
        if sections:
            return [f"{index}. {section}" for index, section in enumerate(sections, start=1)]

        return [
            "1. 요약 제안",
            "2. 현황과 문제",
            "3. 프로그램 목적과 목표",
            "4. CRATA 검사 활용 근거",
            "5. 대상자와 운영 방식",
            "6. 세부 프로그램 구성",
            "7. 성과 측정과 피드백",
            "8. 운영 일정",
            "9. 예산과 산출물",
            "10. 기대효과",
        ]

    def _context_playbook_sections(self, context: str) -> list[str]:
        marker = "## 출력 섹션"
        if marker not in context:
            return []

        section_block = context.split(marker, 1)[1]
        next_heading_index = section_block.find("\n## ")
        next_top_heading_index = section_block.find("\n# ")
        heading_indexes = [index for index in (next_heading_index, next_top_heading_index) if index >= 0]
        if heading_indexes:
            section_block = section_block[: min(heading_indexes)]

        sections: list[str] = []
        for line in section_block.splitlines():
            value = line.strip()
            if not value.startswith("-"):
                continue
            value = re.sub(r"^[-*]\s+", "", value).strip()
            if value:
                sections.append(value)
        return sections[:12]

    def _questions_section(
        self,
        context: str,
        default_questions: list[str],
        *,
        heading: str = "## 먼저 확인할 질문",
    ) -> list[str]:
        answers = self._context_clarifying_answers(context)
        candidate_questions = self._context_clarifying_questions(context)
        questions = [] if answers else candidate_questions or self._filter_known_questions(default_questions, context)

        blocks: list[str] = []
        if answers:
            blocks.extend(
                [
                    "## 질문 답변 반영",
                    "사용자가 제공한 답변과 추가 메모를 초안의 전제로 반영한다.",
                    "",
                    answers,
                    "",
                ]
            )

        if questions:
            blocks.extend(
                [
                    heading,
                    *[f"- {question}" for question in questions],
                    "",
                ]
            )

        return blocks

    def _context_clarifying_questions(self, context: str) -> list[str]:
        marker = "# 먼저 확인할 질문"
        if marker not in context:
            return []

        question_block = context.split(marker, 1)[1]
        next_heading_index = question_block.find("\n# ")
        if next_heading_index >= 0:
            question_block = question_block[:next_heading_index]

        questions: list[str] = []
        for line in question_block.splitlines():
            question = line.strip()
            if not question:
                continue

            question = re.sub(r"^[-*]\s+", "", question)
            question = re.sub(r"^\d+[\.)]\s+", "", question)
            if question:
                questions.append(question)

        return questions[:6]

    def _context_clarifying_answers(self, context: str) -> str:
        marker = "# 질문 답변 / 추가 메모"
        if marker not in context:
            return ""

        answer_block = context.split(marker, 1)[1]
        next_heading_index = answer_block.find("\n# ")
        if next_heading_index >= 0:
            answer_block = answer_block[:next_heading_index]

        return answer_block.strip()

    def _remove_section(self, context: str, marker: str) -> str:
        if marker not in context:
            return context

        before, after = context.split(marker, 1)
        next_heading_index = after.find("\n# ")
        if next_heading_index < 0:
            return before.strip()

        return f"{before}{after[next_heading_index:]}"

    def _filter_known_questions(self, questions: list[str], context: str) -> list[str]:
        if not questions:
            return []

        compact_context = " ".join(context.split()).lower()
        known_markers = {
            "대상": ["대상으로", "대상은", "참여자", "대상자", "신규 관리자", "부모", "교사", "상담사"],
            "문제": ["문제", "개선", "불편", "갈등", "회복", "동기 저하", "의사결정 지연"],
            "목적": ["목적", "목표", "이해", "회복", "팀빌딩", "문의", "신청"],
            "성과": ["성과", "기대효과", "성공", "변화", "측정"],
            "예산": ["예산", "만원", "원 안쪽", "강사비", "운영비"],
            "일정": ["일정", "1박2일", "3시간", "회기", "주간", "월간"],
            "검사 활용": ["검사 활용", "진단", "해석", "활동", "후속관리"],
            "채널": ["유튜브", "블로그", "홈페이지", "인스타그램", "카드뉴스", "안내문"],
            "타깃": ["타깃", "독자", "청중", "고객", "담당자"],
            "전환 목표": ["전환", "문의", "신청", "공유", "신뢰 형성"],
            "금지 표현": ["금지 표현", "민감", "자극적", "진단처럼"],
        }

        filtered: list[str] = []
        for question in questions:
            label = question.split(":", 1)[0].strip()
            markers = known_markers.get(label, [])
            if markers and any(marker in compact_context for marker in markers):
                continue
            filtered.append(question)

        return filtered
