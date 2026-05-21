# CRATA AI Office 로컬 실행 런북

이 문서는 `.worktrees/crata-ai-office-mvp` worktree의 `crata-ai-office-mvp` 브랜치에서 로컬 CRATA AI Office MVP를 실행하고 수동 검증하는 절차입니다.

CRATA AI Office MVP는 한 명의 내부 사용자, 즉 청하님이 로컬에서 사용하는 내부 운영센터입니다. 회의 메모, 상담 사례, 결과지 문구 수정 요청, 사업 기획 요청처럼 여러 의도가 섞인 입력물을 작업 후보로 나누고, 선택한 후보를 실행한 뒤 승인대기함에서 승인 또는 거절하는 흐름을 확인하는 데 초점을 둡니다.

## 현재 아키텍처

- Frontend: Next.js, `http://localhost:3005`
- Backend: FastAPI, `http://localhost:8000`
- Workflow: 입력 분해는 `intake_decomposition_graph`, 에이전트 실행은 `agent_operation_graph` LangGraph 흐름으로 기록합니다.
- Database: PostgreSQL + pgvector 컨테이너, `localhost:5432`
- 테스트 DB: 자동화 테스트는 SQLite 기반 테스트 세션으로도 실행됩니다.

## MVP 흐름

```text
입력물 등록 -> 작업 후보 추출 -> 후보 대화/수정 -> 후보 실행 -> 산출물 생성 -> 필요 시 승인/거절
```

핵심 규칙은 입력물과 작업 후보, 실행 작업, 승인된 결과를 분리하는 것입니다. 입력물을 붙여넣는 것만으로 공식 지식이나 결과지 문구가 바로 바뀌지 않고, 사용자가 후보를 실행하고 승인해야 최종 상태로 잠깁니다.

후보 대화는 실행이 아니므로 승인대기함을 만들지 않습니다. 후보 대화 단계에서는 회의록 원문 전체 대신 후보 요약, 직접 근거 발췌, 최근 대화, task playbook, evidence bundle만 모델 컨텍스트에 넣습니다.

## 로컬 포트

- Frontend: `http://localhost:3005`
- Backend: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

## 사전 조건

- Windows PowerShell
- Python 3.11 이상 권장
- Node.js와 npm
- Docker Desktop

Docker Desktop이 실행 중이어야 실제 PostgreSQL 컨테이너에 대해 마이그레이션을 적용하고 라이브 DB 실행을 검증할 수 있습니다. Docker Desktop의 Linux engine이 꺼져 있으면 백엔드 테스트는 SQLite로 계속 실행될 수 있지만, PostgreSQL 컨테이너 실행과 라이브 DB 마이그레이션은 검증할 수 없습니다.

## 실행 절차

모든 명령은 PowerShell 기준입니다. 먼저 저장소 루트로 이동합니다.

```powershell
cd "C:\Users\wnsdu\Desktop\CRATA 에이전트\.worktrees\crata-ai-office-mvp"
```

### 1. DB 실행

```powershell
docker compose up -d postgres
```

상태 확인이 필요하면 다음 명령을 사용합니다.

```powershell
docker compose ps
```

### 2. Backend 가상환경, 설치, 마이그레이션, 서버 실행

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m alembic upgrade head
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

이미 `.venv`가 있고 의존성이 설치되어 있으면 venv 생성과 설치는 다시 하지 않아도 됩니다.

### 3. Frontend 설치와 서버 실행

새 PowerShell 창에서 저장소 루트로 이동한 뒤 실행합니다.

```powershell
cd frontend
npm install
npm run dev
```

### 4. 앱 열기

브라우저에서 다음 주소를 엽니다.

```text
http://localhost:3005
```

첫 화면은 요청 콘솔입니다. 에이전트 운영 맵은 왼쪽 메뉴의 `운영 맵` 또는 `http://localhost:3005/map`에서 확인합니다.

## 수동 검증 절차

1. 첫 화면의 요청 콘솔을 엽니다.
2. 입력창에 다음 문장을 붙여넣습니다.

```text
조직행동검사 5페이지 문구를 수정하자. A유형 B유형 상담 사례는 학습 후보로 저장하자. 공공기관 제안서 프로그램도 기획해보자.
```

3. `작업 후보 추출`을 누르고 다음 후보 카드가 나타나는지 확인합니다.
   - 결과지 문구 수정 후보
   - 상담 사례 학습 후보
   - 사업·프로그램 기획 후보
4. 상단의 진행 중 작업 흐름에서 `CEO -> 담당 에이전트 -> 검수 -> 승인함` 흐름이 후보별로 보이는지 확인합니다.
5. 후보 중 하나에서 `작업 실행`을 누릅니다.
6. 실행된 후보 카드에 `실행 흐름`과 `승인 카드` 링크가 생기는지 확인합니다.
7. `실행 흐름`을 눌러 활동 로그에서 해당 작업의 LangGraph 단계가 보이는지 확인합니다.
8. 왼쪽 내비게이션에서 `승인함`을 엽니다.
9. 승인대기 항목이 왼쪽 칸반 목록에 간략 카드로 보이고, 선택한 항목이 오른쪽 승인 인스펙터에 자세히 표시되는지 확인합니다.
10. `승인`을 누릅니다.
11. 카드의 의사결정 버튼이 사라지고 최종 상태가 승인됨으로 고정되는지 확인합니다.

수정요청 흐름을 확인하려면 새 후보를 다시 실행한 뒤 `수정요청`을 누르고 사유를 입력합니다. 이후 승인 인스펙터에서 `재작업 후보 열기`를 눌러 요청 콘솔로 돌아가고, 수정 사유가 질문 답변/추가 메모에 반영되어 있는지 확인합니다.

스케줄 화면의 `파이프라인` 탭은 운영 맵과 다르게 예약/반복 실행 관점에서 현재 작업 큐를 보여줍니다. 백엔드 연결이 가능하면 에이전트 작업 큐를 읽고, 작업 큐가 비어 있으면 기본 운영 흐름 예시를 보여줍니다.

## 지식 컨텍스트 검증 포인트

다음 조건은 수동 검증 때 함께 확인합니다.

- 후보 대화 컨텍스트에 회의록 원문 전체가 반복 주입되지 않아야 합니다.
- 관련 검사를 못 찾는 경우 개인/집단/조직 MASTER 전체를 fallback으로 넣지 않아야 합니다.
- 기획 작업에는 `task_playbooks/planning.json`의 산출물 섹션이 반영되어야 합니다.
- 학교 학생 프로그램 기획처럼 응용 산출물에는 `knowledge/application_maps/group_behavior_school_program.json`의 전환 포인트가 반영되어야 합니다.
- 결과지 문구, 공식 지식 수정, 상담 사례 저장은 승인 전 “저장/반영 완료”처럼 단정하면 안 됩니다.

## 자동화 검증 명령

### Backend 테스트

저장소 루트에서 실행합니다.

```powershell
.\backend\.venv\Scripts\python.exe -m pytest -q backend\tests
```

### Alembic SQL 렌더

`backend` 디렉터리에서 실행합니다.

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head --sql
```

이 명령은 마이그레이션 SQL을 렌더링합니다. 실제 PostgreSQL에 적용하려면 Docker Desktop과 `postgres` 컨테이너가 실행 중인 상태에서 `.\.venv\Scripts\python -m alembic upgrade head`를 실행합니다.

### Frontend 테스트

`frontend` 디렉터리에서 실행합니다.

```powershell
npm run test
```

### Frontend 빌드

`frontend` 디렉터리에서 실행합니다.

```powershell
npm run build
```

## Git 상태

이 worktree는 `.worktrees/crata-ai-office-mvp`이고 브랜치는 `crata-ai-office-mvp`입니다. 이 런북의 검증 범위는 로컬 커밋까지입니다. 사용자가 명시적으로 push하지 않는 한 GitHub push는 발생하지 않았다고 봅니다.
