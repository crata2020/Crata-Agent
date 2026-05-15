# CRATA 데이터 모델 초안

이 문서는 1차 MVP를 위한 초기 데이터 모델이다. 처음부터 완벽한 스키마를 목표로 하지 않고, 작동하는 MVP를 만들면서 나중에 구조를 바꿀 수 있게 설계한다.

## 저장 전략

```text
PostgreSQL + pgvector
= 운영 데이터, 워크플로우 상태, 산출물, 의미 검색

Git/Markdown
= 사람이 읽을 수 있는 공식 지식 내보내기와 승인된 변경 이력

Neo4j
= 1차 MVP에는 포함하지 않음. 나중에 유형 관계 그래프가 중요해지면 추가 가능
```

## 핵심 테이블

### agents

에이전트 정의, 역할, 상태, 모델 라우팅, 설정을 저장한다.

주요 필드:

- `id`
- `name`
- `display_name`
- `role`
- `description`
- `status`
- `default_model_provider`
- `default_model_name`
- `prompt`
- `enabled`
- `created_at`
- `updated_at`

### intake_items

회의록, 상담 전사록, 메모, 파일 같은 원문 입력물을 저장한다.

주요 필드:

- `id`
- `title`
- `input_type`
- `raw_content`
- `source`
- `metadata`
- `created_at`

### candidate_tasks

입력물에서 추출된 작업 후보를 저장한다.

주요 필드:

- `id`
- `intake_item_id`
- `task_type`
- `title`
- `summary`
- `evidence_excerpt`
- `recommended_agents`
- `status`
- `metadata`
- `created_at`
- `updated_at`

### tasks

청하님이 실행하기로 선택한 실제 작업을 저장한다.

주요 필드:

- `id`
- `candidate_task_id`
- `task_type`
- `title`
- `description`
- `status`
- `priority`
- `assigned_agents`
- `created_at`
- `updated_at`

### workflow_runs

LangGraph 실행 단위를 저장한다.

주요 필드:

- `id`
- `workflow_type`
- `task_id`
- `status`
- `current_step`
- `checkpoint`
- `started_at`
- `completed_at`
- `error`

### workflow_steps

단계별 실행 이력을 저장한다.

주요 필드:

- `id`
- `workflow_run_id`
- `step_name`
- `agent_id`
- `input_summary`
- `output_summary`
- `status`
- `started_at`
- `completed_at`
- `metadata`

### approvals

승인대기, 승인, 거부, 수정 요청 기록을 저장한다.

주요 필드:

- `id`
- `task_id`
- `artifact_id`
- `approval_type`
- `status`
- `title`
- `summary`
- `before_content`
- `after_content`
- `affected_area`
- `reviewer_note`
- `decision_reason`
- `decided_at`
- `created_at`

### artifacts

에이전트가 만든 산출물을 저장한다.

주요 필드:

- `id`
- `task_id`
- `workflow_run_id`
- `artifact_type`
- `title`
- `content`
- `status`
- `metadata`
- `created_at`
- `updated_at`

### knowledge_items

공식 지식, 후보 지식, 결과지 문구, 상담 원칙, 사례 기반 후보를 저장한다.

주요 필드:

- `id`
- `knowledge_type`
- `title`
- `content`
- `status`
- `source_artifact_id`
- `source_approval_id`
- `metadata`
- `created_at`
- `updated_at`

### documents

업로드 파일과 내보낸 Markdown 기록을 저장한다.

주요 필드:

- `id`
- `title`
- `document_type`
- `path`
- `content_text`
- `metadata`
- `created_at`

### embeddings

pgvector 검색용 임베딩을 저장한다.

주요 필드:

- `id`
- `owner_type`
- `owner_id`
- `embedding`
- `text_chunk`
- `metadata`
- `created_at`

### settings

애플리케이션 설정을 저장한다.

주요 필드:

- `id`
- `key`
- `value`
- `is_secret`
- `updated_at`

## 핵심 상태값

작업 후보, 작업, 산출물, 승인, 지식 항목에 공통으로 사용할 수 있는 상태값:

- `draft`: 초안.
- `pending_approval`: 승인대기.
- `approved`: 승인됨.
- `rejected`: 거부됨.
- `archived`: 보관됨.
- `running`: 실행중.
- `failed`: 실패.

## 핵심 분리 규칙

다음 항목은 반드시 별도 엔티티로 분리한다.

```text
원문 입력물
!= 작업 후보
!= 실행 작업
!= AI 산출물
!= 승인된 공식 지식
```

이 규칙은 회의록, 상담 관찰, AI 요약이 검토 없이 공식 CRATA 지식이 되는 일을 막기 위한 것이다.

## 향후 정규화 방향

1차 MVP에서는 유형, 감정, 행동, 맥락, 패턴, 개입법 정보를 `metadata` JSON에 저장해도 된다. 반복 패턴이 분명해지면 이 항목들을 정규 테이블로 분리하거나 Neo4j로 옮길 수 있다.
