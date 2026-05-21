# CRATA AI Office

청하님 혼자 사용하는 로컬 CRATA 에이전트 내부 운영센터입니다. 입력물을 작업 후보로 분해하고, 선택한 후보를 실행한 뒤 승인대기함에서 승인/수정요청/거절하는 1차 MVP입니다.

자세한 실행과 수동 검증 절차는 [docs/runbook.md](docs/runbook.md)를 확인하세요.

## 빠른 시작

PowerShell에서 저장소 루트 기준으로 실행합니다.

```powershell
docker compose up -d postgres
```

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m alembic upgrade head
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

새 PowerShell 창에서:

```powershell
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3005`를 엽니다. 첫 화면은 요청 콘솔이며, 운영 맵은 `http://localhost:3005/map`에서 확인합니다.

## 로컬 포트

- Frontend: `http://localhost:3005`
- Backend: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

## MVP 흐름

```text
요청 콘솔 입력 -> 작업 후보 추출 -> 후보별 처리 흐름 확인 -> 후보 검토/분할 -> 후보 실행 -> 실행 로그/승인카드 확인 -> 승인/수정요청/거절
```

입력물 분해는 `intake_decomposition_graph`, 에이전트 실행은 `agent_operation_graph` LangGraph 흐름으로 기록합니다. 실행 그래프는 `ceo_routing -> context_retrieval -> question_gate -> specialist_draft -> quality_review -> approval_pending` 순서로 남습니다. 수정요청을 선택하면 수정 사유가 포함된 재작업 후보가 생성되고, 요청 콘솔에서 다시 실행할 수 있습니다.

## 지식 파일

CRATA 검사 지식과 에이전트 작업 가이드는 `knowledge/` 폴더에 둡니다.

- 원본 추출 자료: `knowledge/_sources/`
- 공식 MASTER 지식: `knowledge/official/`
- 에이전트 작업 가이드: `knowledge/agent-guides/`

현재 반영된 검사 지식은 개인행동 동기검사와 집단행동검사입니다. 색채검사와 조직행동검사는 추후 지식 파일을 받으면 같은 구조로 추가합니다.

## 현재 상태

- Worktree: `.worktrees/crata-ai-office-mvp`
- Branch: `crata-ai-office-mvp`
- 상태: 로컬 커밋 기준이며, 사용자가 명시적으로 push하지 않는 한 GitHub에는 push되지 않았습니다.
