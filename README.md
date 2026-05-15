# CRATA AI Office

청하님 혼자 사용하는 로컬 CRATA 에이전트 내부 운영센터입니다. 입력물을 작업 후보로 분해하고, 선택한 후보를 실행한 뒤 승인대기함에서 승인/거절하는 1차 MVP입니다.

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

브라우저에서 `http://localhost:3005`를 엽니다.

## 로컬 포트

- Frontend: `http://localhost:3005`
- Backend: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

## MVP 흐름

```text
입력물 등록 -> 작업 후보 추출 -> 후보 실행 -> 승인대기 생성 -> 승인/거절
```

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
