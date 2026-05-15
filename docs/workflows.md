# CRATA LangGraph 워크플로우

## 워크플로우 1: 입력물 분해 그래프

목적: 길거나 여러 의도가 섞인 입력물을 작업 후보 카드로 나눈다.

이 워크플로우는 회의록, 상담 전사록, 메모, 붙여넣은 텍스트, 업로드 파일을 처리한다. 추출된 작업을 바로 실행하지 않는다. 청하님이 검토할 수 있는 작업 후보만 만든다.

흐름:

```text
입력물 받기
-> preserve_input: 원문 보존 및 공백 정리
-> split_semantic_units: 문장·문맥 단위 분리
-> collect_rule_hints: 키워드 기반 분류 힌트 수집
-> judge_with_ai_context: 문맥 기준 최종 분류 판단
-> build_candidates: 작업 후보 카드 생성
-> prepare_human_review: 청하님 검토 대기 상태로 준비
```

현재 구현 위치:

- `backend/app/services/intake_decomposition_graph.py`
- 그래프 이름: `intake_decomposition_graph`
- 요청 메타데이터 저장값: `graph_name`, `human_review_required`, `node_trace`
- 후보 메타데이터 저장값: `origin_graph`, `origin_node`

작업 후보 유형:

- `report_phrase_revision`: 결과지 문구 수정.
- `counseling_case_learning`: 상담 사례 학습.
- `official_knowledge_candidate`: 공식 지식 반영 후보.
- `relationship_pattern_analysis`: 유형 조합·관계 패턴 분석.
- `business_planning`: 사업·제안서·프로그램 기획.
- `content_marketing`: 콘텐츠·홍보·유튜브 관련 작업.
- `operations_task`: 운영·브리핑·자동화 작업.
- `general_agent_task`: 일반 에이전트 작업.

작업 후보 액션:

- `run`: 실행.
- `edit_then_run`: 수정 후 실행.
- `hold`: 보류.
- `delete`: 삭제.
- `split`: 분할.
- `merge`: 병합.

핵심 규칙:

```text
입력물은 작업이 아니다.
작업 후보는 실행된 작업이 아니다.
청하님이 선택한 작업 후보만 실행 작업이 된다.
```

## 워크플로우 2: 에이전트 작업 실행 그래프

목적: 선택된 작업 하나를 CRATA 에이전트 팀이 처리하게 한다.

흐름:

```text
선택된 작업 받기
-> CEO가 작업 성격 판단
-> 필요한 지식 검색
-> 담당 에이전트 초안 작성
-> 개념수호자/품질검수관 검토
-> 승인 필요 여부 판단
-> 승인대기 또는 저장
-> 결과물/로그 저장
```

기본 에이전트 경로:

```text
결과지 문구 작업
-> CRATA CEO
-> 개념수호자
-> 결과지 에디터
-> 품질검수관
-> 승인대기함

상담 전사록 작업
-> CRATA CEO
-> 사례학습가
-> 관계분석가
-> 품질검수관
-> 승인대기함

상담 답변 테스트
-> CRATA CEO
-> 개념수호자
-> 상담 코치
-> 품질검수관
-> 산출물 저장

공식 지식 반영 후보
-> CRATA CEO
-> 개념수호자
-> 품질검수관
-> 승인대기함
```

## 승인 게이트

공식 지식, 결과지 문구, 재사용 상담 원칙, 학습 후보에 영향을 주는 작업은 반드시 승인 단계에서 멈춘다.

승인 결과:

- `approved`: 승인된 산출물로 저장하고 필요하면 Git/Markdown으로 내보낸다.
- `rejected`: 거부 사유를 저장하고 원본 초안은 추적용으로 보존한다.
- `revise_requested`: 검토 의견과 함께 적절한 에이전트에게 되돌린다.

## 체크포인트

각 워크플로우 실행은 다음 정보를 저장해야 한다.

- 입력물 id.
- 작업 후보 id 또는 실행 작업 id.
- 현재 단계.
- 선택된 에이전트.
- 프롬프트 컨텍스트 참조.
- 모델 호출 기록.
- 생성 결과.
- 검토 의견.
- 승인 상태.
- 산출물 id.

이렇게 저장해야 승인 후 이어서 실행할 수 있고, 과거 결정을 점검하거나 실패한 실행을 디버깅할 수 있다.
