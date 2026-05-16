import re

from app.core.config import get_settings


class ModelGateway:
    def __init__(self) -> None:
        self.settings = get_settings()

    def draft(self, *, task_title: str, task_type: str, context: str) -> str:
        return self._fallback_draft(task_title=task_title, task_type=task_type, context=context)

    def _fallback_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        if task_type == "business_planning":
            return self._business_planning_draft(task_title=task_title, task_type=task_type, context=context)
        if task_type == "content_marketing":
            return self._content_marketing_draft(task_title=task_title, task_type=task_type, context=context)
        if task_type == "report_phrase_revision":
            return self._report_phrase_revision_draft(task_title=task_title, task_type=task_type, context=context)
        if task_type == "counseling_case_learning":
            return self._case_learning_draft(task_title=task_title, task_type=task_type, context=context)
        if task_type == "relationship_pattern_analysis":
            return self._relationship_analysis_draft(task_title=task_title, task_type=task_type, context=context)

        return self._general_draft(task_title=task_title, task_type=task_type, context=context)

    def _business_planning_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        return "\n".join(
            [
                self._header(task_title, task_type),
                "## 먼저 확인할 질문",
                "- 대상: 참여자, 구매자, 승인권자는 누구인가?",
                "- 문제: 지금 개선하려는 핵심 장면은 무엇인가?",
                "- 목적: 이해, 회복, 의사결정 개선, 팀빌딩 중 무엇이 우선인가?",
                "- 성과: 어떤 변화가 생기면 성공이라고 볼 것인가?",
                "- 예산: 강사비, 자료비, 장소비, 운영비 범위가 있는가?",
                "- 일정: 1회, 3시간, 1박2일, 다회기 중 어떤 형식인가?",
                "- 검사 활용: CRATA 검사를 진단, 해석, 활동, 후속관리 중 어디에 넣을 것인가?",
                "",
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
                "",
                "## 추가 리서치 후보",
                "- 공공기관 또는 기업 현장의 소통 비용, 의사결정 지연, 회복 프로그램 필요성.",
                "- 대상 기관의 최근 사업 방향, 교육 목표, 복지/조직문화 과제.",
                "",
                "## 검수 메모",
                "검사를 치료나 진단처럼 표현하지 않는다. 제안서에는 '이해와 의사결정 지원 도구'로 설명한다.",
                self._reference_excerpt(context),
            ]
        )

    def _content_marketing_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        return "\n".join(
            [
                self._header(task_title, task_type),
                "## 먼저 확인할 질문",
                "- 채널: 유튜브, 블로그, 홈페이지, 카드뉴스, 안내문 중 어디에 쓸 것인가?",
                "- 타깃: 개인, 부모, 부부, 기업 담당자, 공공기관 담당자, 상담사 중 누구인가?",
                "- 전환 목표: 이해, 문의, 신청, 신뢰 형성, 공유 중 무엇인가?",
                "- 금지 표현: 자극적이거나 진단처럼 보이면 안 되는 표현이 있는가?",
                "",
                "## 핵심 메시지 후보",
                "CRATA는 사람을 유형으로 가두는 검사가 아니라, 행동이 시작되고 지속되는 방식과 집단 안에서 결정이 정리되는 경로를 이해하게 돕는 도구다.",
                "",
                "## 채널별 전개",
                "- 유튜브: 문제 장면 훅 -> 오해 깨기 -> CRATA 관점 -> 사례형 설명 -> 다음 행동.",
                "- 블로그: 검색 의도 -> 문제 정의 -> 검사 개념 -> 사례 -> 실천 팁 -> 안내.",
                "- 홈페이지: 대상 -> 해결 문제 -> 검사 흐름 -> 결과물 -> 문의 행동.",
                "",
                "## 검수 메모",
                "검사를 만능 해결책처럼 말하지 않고, 유형을 낙인찍지 않는다.",
                self._reference_excerpt(context),
            ]
        )

    def _report_phrase_revision_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        return "\n".join(
            [
                self._header(task_title, task_type),
                "## 문구 수정 작업 절차",
                "1. 원문이 설명하려는 검사 축과 유형을 확인한다.",
                "2. 공식 MASTER 정의와 충돌하는 표현이 있는지 개념수호자가 확인한다.",
                "3. 부정적, 낙인적, 진단적, 과잉 단정 표현을 줄인다.",
                "4. 대상자가 읽어도 방어감이 덜 생기는 상담형 문장으로 바꾼다.",
                "5. 품질검수관이 길이, 톤, 승인 필요 여부를 확인한다.",
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
                "## 승인 메모",
                "결과지 문구 변경은 공식 반영 전 청하님 승인대기함에 올린다.",
                self._reference_excerpt(context),
            ]
        )

    def _case_learning_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        return "\n".join(
            [
                self._header(task_title, task_type),
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
                "## 검수 메모",
                "단일 상담 사례를 공식 정의로 승격하지 않는다.",
                self._reference_excerpt(context),
            ]
        )

    def _relationship_analysis_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        return "\n".join(
            [
                self._header(task_title, task_type),
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
                "## 검수 메모",
                "관계 패턴은 공식 지식과 사례 관찰을 구분해서 표시한다.",
                self._reference_excerpt(context),
            ]
        )

    def _general_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        return "\n".join(
            [
                self._header(task_title, task_type),
                "## 작업 정리",
                "입력 요청을 기준으로 필요한 에이전트 절차와 공식 지식을 확인한 뒤 초안을 만든다.",
                "",
                "## 다음 확인 질문",
                "- 최종 산출물 형식은 무엇인가?",
                "- 공식 지식 반영이 필요한가, 단순 초안인가?",
                "- 어느 에이전트의 전문 프로세스를 우선할 것인가?",
                "",
                "## 검수 메모",
                "공식 지식이나 결과지 문구에 영향을 주면 승인대기함에서 청하님 검토가 필요하다.",
                self._reference_excerpt(context),
            ]
        )

    def _header(self, task_title: str, task_type: str) -> str:
        return f"# {task_title}\n\n## 작업 유형\n{task_type}\n"

    def _reference_excerpt(self, context: str) -> str:
        compact = " ".join(context.split())
        excerpt = compact[:900]
        blocks = []
        context_questions = self._context_clarifying_questions(context)
        if context_questions:
            blocks.extend(
                [
                    "## 입력에서 넘어온 확인 질문",
                    *[f"- {question}" for question in context_questions],
                    "",
                ]
            )

        blocks.extend(["## 참조한 컨텍스트 요약", excerpt])
        return "\n" + "\n".join(blocks)

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
