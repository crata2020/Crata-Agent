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
- `relationship_pattern_analysis`: 유형 조합·관계 패턴 분석.
- `business_planning`: 사업·제안서·프로그램 기획.
- `content_marketing`: 콘텐츠·홍보·유튜브 관련 작업.
- `general_agent_task`: 일반 에이전트 작업.

공식 지식 반영 후보와 운영·자동화 작업은 2차 확장 유형으로 둔다. 현재 MVP에서는 개념수호자, 사례학습가, 품질검수관의 검토 메모와 승인함 상태로 먼저 관리한다.

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
같은 유형의 요청이 여러 개 들어오면 하나로 합치지 않는다. 예를 들어 “개인행동검사 3페이지 문구 수정”과 “집단행동검사 5페이지 문구 수정”은 둘 다 결과지 문구 수정이지만 별도 후보로 유지한다.

각 후보의 먼저 확인할 질문은 입력문에 이미 있는 정보를 제외하고 만든다. 에이전트가 항상 같은 질문을 반복하는 것이 아니라, 빠진 대상, 문제, 목적, 제약, 검사 활용 방식만 묻는다.
```

## 워크플로우 2: 에이전트 작업 실행 그래프

목적: 선택된 작업 하나를 CRATA 에이전트 팀이 처리하게 한다.

현재 구현 위치:

- `backend/app/services/agent_operation_graph.py`
- 그래프 이름: `agent_operation_graph`
- 실행 기록 저장 위치: `workflow_runs.checkpoint.graph_name`, `workflow_runs.checkpoint.node_trace`, `workflow_steps`

흐름:

```text
선택된 작업 받기
-> ceo_routing: CEO가 작업 성격과 담당 에이전트 판단
-> context_retrieval: 공식 지식과 에이전트 작업 가이드 연결
-> question_gate: 담당 에이전트가 먼저 확인할 질문과 입력된 답변 반영 여부 확인
-> specialist_draft: 담당 에이전트 초안 작성
-> quality_review: 품질검수관이 개념, 톤, 안전성 검수
-> approval_pending: 승인함으로 이동
```

현재 MVP에서는 모든 실행 결과를 승인함으로 보내고, 승인함에서 `승인`, `거절`, `수정요청`을 결정한다. 수정요청을 선택하면 수정 사유가 포함된 재작업 후보가 요청 콘솔에 다시 나타난다.

후보 카드 안의 대화는 실행 작업이 아니다. 후보 대화에서는 승인함을 만들지 않고, 후보 요약·근거 발췌·최근 대화·필요한 공식 근거 조각만 사용해 답변한다. 사용자가 저장, 공식 반영, 학습 반영, 결과지 반영을 명시하거나 후보를 실행할 때만 실행 워크플로우로 넘어간다.

기본 에이전트 경로:

```text
결과지 문구 작업
-> CRATA CEO
-> 개념수호자
-> 결과지 에디터 질문/답변 확인
-> 결과지 에디터
-> 품질검수관
-> 승인대기함

상담 전사록 작업
-> CRATA CEO
-> 사례학습가
-> 사례학습가 질문/답변 확인
-> 관계분석가
-> 품질검수관
-> 승인대기함

상담 답변 테스트
-> CRATA CEO
-> 개념수호자
-> 상담 코치 질문/답변 확인
-> 상담 코치
-> 품질검수관
-> 산출물 저장

공식 지식 반영 후보
-> CRATA CEO
-> 개념수호자
-> 개념수호자 질문/답변 확인
-> 품질검수관
-> 승인대기함
```

지식 컨텍스트 구성:

```text
1. Task Registry: 작업 유형, 담당 실행 모듈, gate, action policy를 정한다.
2. Knowledge Scope Planner: 작업에 필요한 검사 지식 범위를 정한다.
3. Evidence Retriever: 공식 문서 전체가 아니라 evidence key에 해당하는 조각만 가져온다.
4. Task Playbook: 산출물 섹션과 작성 규칙을 붙인다.
5. Application Map: 기획안처럼 응용 산출물일 때 검사 특징을 프로그램 요소로 변환한다.
6. Quality Guard: 내부 메타데이터 노출, 승인 전 저장/반영 단정, 익명화 누락을 점검한다.
```

MASTER 문서는 사람이 읽는 공식 원문으로 보존한다. 모델 호출에는 MASTER 전문을 넣지 않고, `knowledge/evidence/*.json`의 짧은 근거 조각과 필요한 reference만 넣는다. 관련 검사를 찾지 못하면 전체 MASTER를 fallback으로 넣지 않고, 먼저 확인할 질문을 남긴다.

작업별 추가 지식:

- `backend/app/config/task_registry.json`: 작업 유형 라우팅 설정.
- `backend/app/config/task_playbooks/*.json`: 기획안, 결과지 문구, 상담 사례, 콘텐츠 등 산출물 구조.
- `knowledge/concept_maps/*.json`: 검사·축·유형·signal·confused_with 구조.
- `knowledge/evidence/*.json`: 답변에 넣을 공식 근거 조각.
- `knowledge/application_maps/*.json`: 검사 특징을 학교 프로그램 같은 응용 산출물로 전환하는 지도.

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
