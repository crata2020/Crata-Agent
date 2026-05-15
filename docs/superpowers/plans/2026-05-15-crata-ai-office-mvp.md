# CRATA AI Office MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬에서 `http://localhost:3005`로 열리는 CRATA AI Office MVP를 만들고, 입력물 등록부터 작업 후보 추출, 작업 실행, 승인대기 표시까지 한 흐름을 작동시킨다.

**Architecture:** Next.js는 화면만 담당하고, FastAPI가 DB·LangGraph·AI 모델 호출을 담당한다. PostgreSQL + pgvector는 Docker로 띄우며, 1차 MVP에서는 OpenAI API가 없어도 deterministic fallback으로 데모 흐름이 통과해야 한다.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, lucide-react, FastAPI, SQLAlchemy, Alembic, PostgreSQL, pgvector, LangGraph, pytest, Vitest, Docker Compose.

---

## 범위 결정

이 계획은 전체 완성형 CRATA 시스템이 아니라 **얇은 세로 MVP**를 만든다.

포함하는 흐름:

```text
Request Intake 입력
-> 원문 저장
-> 작업 후보 카드 추출
-> 후보 실행 선택
-> 에이전트 작업 실행 그래프 실행
-> 산출물 생성
-> 승인대기 생성
-> Dashboard / Approval Inbox에서 확인
```

제외하는 것:

- 실제 고객용 상담 챗봇.
- 로그인.
- Neo4j.
- n8n, Telegram, Google Drive, YouTube API.
- PDF/DOCX 고급 파싱.
- 운영 배포.

---

## 파일 구조

```text
.
├─ .env.example
├─ .gitignore
├─ README.md
├─ docker-compose.yml
├─ backend/
│  ├─ alembic.ini
│  ├─ requirements.txt
│  ├─ app/
│  │  ├─ __init__.py
│  │  ├─ main.py
│  │  ├─ core/
│  │  │  ├─ __init__.py
│  │  │  ├─ config.py
│  │  │  └─ database.py
│  │  ├─ models/
│  │  │  ├─ __init__.py
│  │  │  ├─ agent.py
│  │  │  ├─ approval.py
│  │  │  ├─ artifact.py
│  │  │  ├─ intake.py
│  │  │  ├─ knowledge.py
│  │  │  ├─ settings.py
│  │  │  ├─ task.py
│  │  │  └─ workflow.py
│  │  ├─ schemas/
│  │  │  ├─ __init__.py
│  │  │  ├─ approval.py
│  │  │  ├─ dashboard.py
│  │  │  ├─ intake.py
│  │  │  └─ workflow.py
│  │  ├─ services/
│  │  │  ├─ __init__.py
│  │  │  ├─ agent_seed.py
│  │  │  ├─ intake_decomposition.py
│  │  │  ├─ model_gateway.py
│  │  │  └─ workflow_runner.py
│  │  └─ api/
│  │     ├─ __init__.py
│  │     ├─ approvals.py
│  │     ├─ dashboard.py
│  │     ├─ health.py
│  │     ├─ intake.py
│  │     └─ tasks.py
│  ├─ alembic/
│  │  ├─ env.py
│  │  └─ versions/
│  │     └─ 0001_initial.py
│  └─ tests/
│     ├─ conftest.py
│     ├─ test_approvals_api.py
│     ├─ test_health.py
│     ├─ test_intake_api.py
│     └─ test_workflow_runner.py
└─ frontend/
   ├─ package.json
   ├─ next.config.mjs
   ├─ tsconfig.json
   ├─ postcss.config.mjs
   ├─ tailwind.config.ts
   ├─ vitest.config.ts
   ├─ app/
   │  ├─ globals.css
   │  ├─ layout.tsx
   │  ├─ page.tsx
   │  ├─ request-intake/
   │  │  └─ page.tsx
   │  ├─ approvals/
   │  │  └─ page.tsx
   │  └─ agents/
   │     └─ page.tsx
   ├─ components/
   │  ├─ agent-card.tsx
   │  ├─ app-shell.tsx
   │  ├─ approval-card.tsx
   │  ├─ metric-card.tsx
   │  └─ status-pill.tsx
   ├─ lib/
   │  ├─ api.ts
   │  ├─ design-tokens.ts
   │  └─ types.ts
   └─ tests/
      ├─ agent-card.test.tsx
      └─ status-pill.test.tsx
```

---

## Task 1: 루트 프로젝트와 Docker 기본 구조

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`
- Create: `docker-compose.yml`

- [ ] **Step 1: `.gitignore` 작성**

Create `.gitignore`:

```gitignore
# Python
__pycache__/
.pytest_cache/
.venv/
*.pyc

# Node
node_modules/
.next/
coverage/

# Env
.env
.env.local

# OS
.DS_Store
Thumbs.db

# Local exports
exports/
knowledge/private/
```

- [ ] **Step 2: `.env.example` 작성**

Create `.env.example`:

```env
POSTGRES_DB=crata_ai_office
POSTGRES_USER=crata
POSTGRES_PASSWORD=crata_local_password
DATABASE_URL=postgresql+psycopg://crata:crata_local_password@localhost:5432/crata_ai_office
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
FRONTEND_ORIGIN=http://localhost:3005
BACKEND_PORT=8000
```

- [ ] **Step 3: `docker-compose.yml` 작성**

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: crata-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: crata_ai_office
      POSTGRES_USER: crata
      POSTGRES_PASSWORD: crata_local_password
    ports:
      - "5432:5432"
    volumes:
      - crata_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U crata -d crata_ai_office"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  crata_postgres_data:
```

- [ ] **Step 4: `README.md` 작성**

Create `README.md`:

```markdown
# CRATA AI Office

청하님 혼자 사용하는 로컬 CRATA 에이전트 운영센터입니다.

## 로컬 포트

- Frontend: http://localhost:3005
- Backend: http://localhost:8000
- PostgreSQL: localhost:5432

## 1차 MVP 흐름

```text
입력물 등록
-> 작업 후보 추출
-> 작업 실행
-> 승인대기 생성
-> 승인/거부
```

## DB 실행

```bash
docker compose up -d postgres
```
```

- [ ] **Step 5: Docker DB 실행 확인**

Run:

```powershell
docker compose up -d postgres
docker compose ps
```

Expected:

```text
crata-postgres ... healthy
```

- [ ] **Step 6: 커밋**

```bash
git add .gitignore .env.example README.md docker-compose.yml
git commit -m "chore: add project and database bootstrap"
```

---

## Task 2: FastAPI 백엔드 기본 골격과 health API

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/config.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/health.py`
- Create: `backend/tests/test_health.py`

- [ ] **Step 1: 백엔드 의존성 작성**

Create `backend/requirements.txt`:

```text
alembic==1.13.3
fastapi==0.115.6
httpx==0.27.2
langgraph==0.2.60
openai==1.59.7
psycopg[binary]==3.2.3
pydantic-settings==2.7.1
pytest==8.3.4
pytest-asyncio==0.25.0
sqlalchemy==2.0.36
uvicorn[standard]==0.34.0
```

- [ ] **Step 2: 설정 파일 작성**

Create `backend/app/core/config.py`:

```python
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://crata:crata_local_password@localhost:5432/crata_ai_office"
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    frontend_origin: str = "http://localhost:3005"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 3: health router 작성**

Create `backend/app/api/health.py`:

```python
from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "crata-ai-office-backend"}
```

- [ ] **Step 4: FastAPI 앱 작성**

Create `backend/app/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="CRATA AI Office API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    return app


app = create_app()
```

Create empty package files:

```python
# backend/app/__init__.py
```

```python
# backend/app/core/__init__.py
```

```python
# backend/app/api/__init__.py
```

- [ ] **Step 5: health 테스트 작성**

Create `backend/tests/test_health.py`:

```python
from fastapi.testclient import TestClient

from app.main import create_app


def test_health_returns_ok() -> None:
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "crata-ai-office-backend"}
```

- [ ] **Step 6: 테스트 실행**

Run:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m pytest tests/test_health.py -v
```

Expected:

```text
tests/test_health.py::test_health_returns_ok PASSED
```

- [ ] **Step 7: 커밋**

```bash
git add backend
git commit -m "feat: add fastapi backend health endpoint"
```

---

## Task 3: DB 연결, 모델, Alembic 초기 마이그레이션

**Files:**
- Create: `backend/app/core/database.py`
- Create: `backend/app/models/*.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/0001_initial.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: DB 연결 파일 작성**

Create `backend/app/core/database.py`:

```python
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


engine = create_engine(get_settings().database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 2: 모델 파일 작성**

Create `backend/app/models/agent.py`:

```python
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(40), default="idle", index=True)
    default_model_provider: Mapped[str] = mapped_column(String(40), default="openai")
    default_model_name: Mapped[str] = mapped_column(String(120), default="gpt-4.1-mini")
    prompt: Mapped[str] = mapped_column(Text, default="")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    color: Mapped[str] = mapped_column(String(16), default="#1F6B57")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def new_id() -> str:
    return uuid4().hex
```

Create `backend/app/models/intake.py`:

```python
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class IntakeItem(Base):
    __tablename__ = "intake_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    input_type: Mapped[str] = mapped_column(String(60), nullable=False)
    raw_content: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(120), default="manual")
    item_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateTask(Base):
    __tablename__ = "candidate_tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    intake_item_id: Mapped[str] = mapped_column(String(64), ForeignKey("intake_items.id"), nullable=False, index=True)
    task_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_excerpt: Mapped[str] = mapped_column(Text, default="")
    recommended_agents: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    item_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

Create `backend/app/models/task.py`:

```python
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    candidate_task_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("candidate_tasks.id"), nullable=True)
    task_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    priority: Mapped[str] = mapped_column(String(40), default="normal")
    assigned_agents: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

Create `backend/app/models/workflow.py`:

```python
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    workflow_type: Mapped[str] = mapped_column(String(80), nullable=False)
    task_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("tasks.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(40), default="running", index=True)
    current_step: Mapped[str] = mapped_column(String(120), default="")
    checkpoint: Mapped[dict] = mapped_column(JSON, default=dict)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error: Mapped[str] = mapped_column(Text, default="")


class WorkflowStep(Base):
    __tablename__ = "workflow_steps"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    workflow_run_id: Mapped[str] = mapped_column(String(64), ForeignKey("workflow_runs.id"), nullable=False, index=True)
    step_name: Mapped[str] = mapped_column(String(120), nullable=False)
    agent_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("agents.id"), nullable=True)
    input_summary: Mapped[str] = mapped_column(Text, default="")
    output_summary: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(40), default="completed")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    item_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
```

Create `backend/app/models/artifact.py`:

```python
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Artifact(Base):
    __tablename__ = "artifacts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    task_id: Mapped[str] = mapped_column(String(64), ForeignKey("tasks.id"), nullable=False, index=True)
    workflow_run_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("workflow_runs.id"), nullable=True)
    artifact_type: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    item_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

Create `backend/app/models/approval.py`:

```python
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    task_id: Mapped[str] = mapped_column(String(64), ForeignKey("tasks.id"), nullable=False, index=True)
    artifact_id: Mapped[str] = mapped_column(String(64), ForeignKey("artifacts.id"), nullable=False, index=True)
    approval_type: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="pending_approval", index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="")
    before_content: Mapped[str] = mapped_column(Text, default="")
    after_content: Mapped[str] = mapped_column(Text, default="")
    affected_area: Mapped[str] = mapped_column(String(200), default="")
    reviewer_note: Mapped[str] = mapped_column(Text, default="")
    decision_reason: Mapped[str] = mapped_column(Text, default="")
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

Create `backend/app/models/knowledge.py`:

```python
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    knowledge_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    source_artifact_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("artifacts.id"), nullable=True)
    source_approval_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("approvals.id"), nullable=True)
    item_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    document_type: Mapped[str] = mapped_column(String(80), nullable=False)
    path: Mapped[str] = mapped_column(String(500), default="")
    content_text: Mapped[str] = mapped_column(Text, default="")
    item_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Embedding(Base):
    __tablename__ = "embeddings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    owner_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    embedding: Mapped[list[float] | None] = mapped_column(JSON, nullable=True)
    text_chunk: Mapped[str] = mapped_column(Text, nullable=False)
    item_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

Create `backend/app/models/settings.py`:

```python
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AppSetting(Base):
    __tablename__ = "settings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: uuid4().hex)
    key: Mapped[str] = mapped_column(String(160), nullable=False, unique=True, index=True)
    value: Mapped[str] = mapped_column(Text, default="")
    is_secret: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

Create `backend/app/models/__init__.py`:

```python
from app.models.agent import Agent
from app.models.approval import Approval
from app.models.artifact import Artifact
from app.models.intake import CandidateTask, IntakeItem
from app.models.knowledge import Document, Embedding, KnowledgeItem
from app.models.settings import AppSetting
from app.models.task import Task
from app.models.workflow import WorkflowRun, WorkflowStep

__all__ = [
    "Agent",
    "Approval",
    "Artifact",
    "CandidateTask",
    "Document",
    "Embedding",
    "IntakeItem",
    "KnowledgeItem",
    "AppSetting",
    "Task",
    "WorkflowRun",
    "WorkflowStep",
]
```

- [ ] **Step 3: Alembic 파일 작성**

Create `backend/alembic.ini`:

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = postgresql+psycopg://crata:crata_local_password@localhost:5432/crata_ai_office

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
```

Create `backend/alembic/env.py`:

```python
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import get_settings
from app.core.database import Base
from app import models  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", get_settings().database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

Create `backend/alembic/versions/0001_initial.py`:

```python
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "agents",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("role", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(40), nullable=False, server_default="idle"),
        sa.Column("default_model_provider", sa.String(40), nullable=False, server_default="openai"),
        sa.Column("default_model_name", sa.String(120), nullable=False, server_default="gpt-4.1-mini"),
        sa.Column("prompt", sa.Text(), nullable=False, server_default=""),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("color", sa.String(16), nullable=False, server_default="#1F6B57"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_agents_status", "agents", ["status"])

    op.create_table(
        "intake_items",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("input_type", sa.String(60), nullable=False),
        sa.Column("raw_content", sa.Text(), nullable=False),
        sa.Column("source", sa.String(120), nullable=False, server_default="manual"),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "candidate_tasks",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("intake_item_id", sa.String(64), sa.ForeignKey("intake_items.id"), nullable=False),
        sa.Column("task_type", sa.String(80), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("evidence_excerpt", sa.Text(), nullable=False, server_default=""),
        sa.Column("recommended_agents", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="draft"),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_candidate_tasks_intake_item_id", "candidate_tasks", ["intake_item_id"])
    op.create_index("ix_candidate_tasks_status", "candidate_tasks", ["status"])
    op.create_index("ix_candidate_tasks_task_type", "candidate_tasks", ["task_type"])

    op.create_table(
        "tasks",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("candidate_task_id", sa.String(64), sa.ForeignKey("candidate_tasks.id"), nullable=True),
        sa.Column("task_type", sa.String(80), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(40), nullable=False, server_default="draft"),
        sa.Column("priority", sa.String(40), nullable=False, server_default="normal"),
        sa.Column("assigned_agents", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_tasks_status", "tasks", ["status"])
    op.create_index("ix_tasks_task_type", "tasks", ["task_type"])

    op.create_table(
        "workflow_runs",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("workflow_type", sa.String(80), nullable=False),
        sa.Column("task_id", sa.String(64), sa.ForeignKey("tasks.id"), nullable=True),
        sa.Column("status", sa.String(40), nullable=False, server_default="running"),
        sa.Column("current_step", sa.String(120), nullable=False, server_default=""),
        sa.Column("checkpoint", sa.JSON(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("error", sa.Text(), nullable=False, server_default=""),
    )
    op.create_index("ix_workflow_runs_status", "workflow_runs", ["status"])
    op.create_index("ix_workflow_runs_task_id", "workflow_runs", ["task_id"])

    op.create_table(
        "workflow_steps",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("workflow_run_id", sa.String(64), sa.ForeignKey("workflow_runs.id"), nullable=False),
        sa.Column("step_name", sa.String(120), nullable=False),
        sa.Column("agent_id", sa.String(64), sa.ForeignKey("agents.id"), nullable=True),
        sa.Column("input_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("output_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(40), nullable=False, server_default="completed"),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
    )
    op.create_index("ix_workflow_steps_workflow_run_id", "workflow_steps", ["workflow_run_id"])

    op.create_table(
        "artifacts",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("task_id", sa.String(64), sa.ForeignKey("tasks.id"), nullable=False),
        sa.Column("workflow_run_id", sa.String(64), sa.ForeignKey("workflow_runs.id"), nullable=True),
        sa.Column("artifact_type", sa.String(80), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="draft"),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_artifacts_status", "artifacts", ["status"])
    op.create_index("ix_artifacts_task_id", "artifacts", ["task_id"])

    op.create_table(
        "approvals",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("task_id", sa.String(64), sa.ForeignKey("tasks.id"), nullable=False),
        sa.Column("artifact_id", sa.String(64), sa.ForeignKey("artifacts.id"), nullable=False),
        sa.Column("approval_type", sa.String(80), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="pending_approval"),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("before_content", sa.Text(), nullable=False, server_default=""),
        sa.Column("after_content", sa.Text(), nullable=False, server_default=""),
        sa.Column("affected_area", sa.String(200), nullable=False, server_default=""),
        sa.Column("reviewer_note", sa.Text(), nullable=False, server_default=""),
        sa.Column("decision_reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("decided_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_approvals_artifact_id", "approvals", ["artifact_id"])
    op.create_index("ix_approvals_status", "approvals", ["status"])
    op.create_index("ix_approvals_task_id", "approvals", ["task_id"])

    op.create_table(
        "knowledge_items",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("knowledge_type", sa.String(80), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="draft"),
        sa.Column("source_artifact_id", sa.String(64), sa.ForeignKey("artifacts.id"), nullable=True),
        sa.Column("source_approval_id", sa.String(64), sa.ForeignKey("approvals.id"), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_knowledge_items_knowledge_type", "knowledge_items", ["knowledge_type"])
    op.create_index("ix_knowledge_items_status", "knowledge_items", ["status"])

    op.create_table(
        "documents",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("document_type", sa.String(80), nullable=False),
        sa.Column("path", sa.String(500), nullable=False, server_default=""),
        sa.Column("content_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "embeddings",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("owner_type", sa.String(80), nullable=False),
        sa.Column("owner_id", sa.String(64), nullable=False),
        sa.Column("embedding", sa.JSON(), nullable=True),
        sa.Column("text_chunk", sa.Text(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_embeddings_owner_id", "embeddings", ["owner_id"])
    op.create_index("ix_embeddings_owner_type", "embeddings", ["owner_type"])

    op.create_table(
        "settings",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("key", sa.String(160), nullable=False, unique=True),
        sa.Column("value", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_secret", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_settings_key", "settings", ["key"])


def downgrade() -> None:
    for table in [
        "settings",
        "embeddings",
        "documents",
        "knowledge_items",
        "approvals",
        "artifacts",
        "workflow_steps",
        "workflow_runs",
        "tasks",
        "candidate_tasks",
        "intake_items",
        "agents",
    ]:
        op.drop_table(table)
```

- [ ] **Step 4: 테스트용 DB 세션 fixture 작성**

Create `backend/tests/conftest.py`:

```python
from collections.abc import Generator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base, get_db
from app.main import create_app


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture()
def app_with_db(db_session: Session):
    app = create_app()

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    return app
```

- [ ] **Step 5: 마이그레이션 실행**

Run:

```powershell
docker compose up -d postgres
cd backend
.\.venv\Scripts\python -m alembic upgrade head
```

Expected:

```text
INFO  [alembic.runtime.migration] Running upgrade  -> 0001_initial
```

- [ ] **Step 6: 커밋**

```bash
git add backend
git commit -m "feat: add database models and initial migration"
```

---

## Task 4: 기본 에이전트 seed 서비스

**Files:**
- Create: `backend/app/services/agent_seed.py`
- Create: `backend/tests/test_agent_seed.py`

- [ ] **Step 1: 에이전트 seed 테스트 작성**

Create `backend/tests/test_agent_seed.py`:

```python
from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.services.agent_seed import seed_agents


def test_seed_agents_creates_ten_agents(db_session: Session) -> None:
    seed_agents(db_session)

    agents = db_session.query(Agent).order_by(Agent.id).all()

    assert len(agents) == 10
    assert db_session.get(Agent, "crata_ceo") is not None
    assert db_session.get(Agent, "concept_guardian").display_name == "개념수호자"
    assert db_session.get(Agent, "business_designer").status == "planned"
```

- [ ] **Step 2: 테스트 실패 확인**

Run:

```powershell
cd backend
.\.venv\Scripts\python -m pytest tests/test_agent_seed.py -v
```

Expected:

```text
ModuleNotFoundError: No module named 'app.services.agent_seed'
```

- [ ] **Step 3: seed 서비스 작성**

Create `backend/app/services/agent_seed.py`:

```python
from sqlalchemy.orm import Session

from app.models.agent import Agent


AGENT_SEEDS = [
    {
        "id": "crata_ceo",
        "name": "CRATA CEO",
        "display_name": "CRATA CEO",
        "role": "전체 라우팅과 작업 조율",
        "description": "요청을 분류하고 적절한 에이전트와 워크플로우를 결정한다.",
        "status": "idle",
        "color": "#1F6B57",
    },
    {
        "id": "concept_guardian",
        "name": "Concept Guardian",
        "display_name": "개념수호자",
        "role": "공식 지식과 개념 일관성 검토",
        "description": "검사 개념, 유형 정의, 공식 지식 충돌 여부를 검토한다.",
        "status": "idle",
        "color": "#6A5EA8",
    },
    {
        "id": "report_editor",
        "name": "Report Editor",
        "display_name": "결과지 에디터",
        "role": "검사 결과지 문구 작성과 수정",
        "description": "결과지 문구를 작성하고 대상별 톤을 조정한다.",
        "status": "idle",
        "color": "#34699A",
    },
    {
        "id": "counseling_coach",
        "name": "Counseling Coach",
        "display_name": "상담 코치",
        "role": "유형 기반 상담 답변 초안",
        "description": "유형과 관계 맥락을 바탕으로 상담형 답변을 만든다.",
        "status": "idle",
        "color": "#2F7D4E",
    },
    {
        "id": "case_learner",
        "name": "Case Learner",
        "display_name": "사례학습가",
        "role": "상담 사례 추출과 학습 후보 생성",
        "description": "상담 전사록을 익명화하고 사례 기반 학습 후보를 만든다.",
        "status": "idle",
        "color": "#C9852B",
    },
    {
        "id": "relationship_analyst",
        "name": "Relationship Analyst",
        "display_name": "관계분석가",
        "role": "유형 조합과 관계 패턴 분석",
        "description": "유형 조합, 관계 맥락, 반복 상호작용 루프를 분석한다.",
        "status": "idle",
        "color": "#4B7F83",
    },
    {
        "id": "quality_inspector",
        "name": "Quality Inspector",
        "display_name": "품질검수관",
        "role": "안전성, 톤, 승인 준비 상태 검수",
        "description": "낙인적 표현, 위험 표현, 공식 반영 여부를 검수한다.",
        "status": "idle",
        "color": "#B83A3A",
    },
    {
        "id": "business_designer",
        "name": "Business Designer",
        "display_name": "사업설계자",
        "role": "제안서, 상품, 프로그램 기획",
        "description": "2차 확장 예정 에이전트.",
        "status": "planned",
        "enabled": False,
        "color": "#7A5A2E",
    },
    {
        "id": "content_strategist",
        "name": "Content Strategist",
        "display_name": "콘텐츠전략가",
        "role": "홍보, 유튜브, 블로그, 홈페이지 문구",
        "description": "2차 확장 예정 에이전트.",
        "status": "planned",
        "enabled": False,
        "color": "#B35C3E",
    },
    {
        "id": "operations_secretary",
        "name": "Operations Secretary",
        "display_name": "운영비서",
        "role": "브리핑, 승인 요약, 자동화",
        "description": "2차 확장 예정 에이전트.",
        "status": "planned",
        "enabled": False,
        "color": "#5F6B64",
    },
]


def seed_agents(db: Session) -> None:
    for item in AGENT_SEEDS:
        existing = db.get(Agent, item["id"])
        if existing:
            continue
        db.add(
            Agent(
                id=item["id"],
                name=item["name"],
                display_name=item["display_name"],
                role=item["role"],
                description=item["description"],
                status=item["status"],
                enabled=item.get("enabled", True),
                color=item["color"],
                prompt="",
            )
        )
    db.commit()
```

- [ ] **Step 4: 테스트 통과 확인**

Run:

```powershell
cd backend
.\.venv\Scripts\python -m pytest tests/test_agent_seed.py -v
```

Expected:

```text
tests/test_agent_seed.py::test_seed_agents_creates_ten_agents PASSED
```

- [ ] **Step 5: 커밋**

```bash
git add backend/app/services/agent_seed.py backend/tests/test_agent_seed.py
git commit -m "feat: seed crata agents"
```

---

## Task 5: 입력물 분해 서비스와 API

**Files:**
- Create: `backend/app/schemas/intake.py`
- Create: `backend/app/services/intake_decomposition.py`
- Create: `backend/app/api/intake.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_intake_api.py`

- [ ] **Step 1: Intake API 테스트 작성**

Create `backend/tests/test_intake_api.py`:

```python
from fastapi.testclient import TestClient


def test_create_intake_extracts_candidate_tasks(app_with_db) -> None:
    client = TestClient(app_with_db)

    response = client.post(
        "/intake",
        json={
            "title": "5월 회의록",
            "input_type": "meeting_notes",
            "raw_content": "조직행동검사 5페이지 문구를 수정하자. A유형 B유형 상담 사례도 학습 후보로 저장하자.",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "5월 회의록"
    assert len(body["candidate_tasks"]) == 2
    assert {task["task_type"] for task in body["candidate_tasks"]} == {
        "report_phrase_revision",
        "counseling_case_learning",
    }
```

- [ ] **Step 2: 실패 확인**

Run:

```powershell
cd backend
.\.venv\Scripts\python -m pytest tests/test_intake_api.py -v
```

Expected:

```text
404 Not Found
```

- [ ] **Step 3: Intake schema 작성**

Create `backend/app/schemas/intake.py`:

```python
from pydantic import BaseModel, Field


class IntakeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    input_type: str = Field(default="memo", max_length=60)
    raw_content: str = Field(min_length=1)
    source: str = Field(default="manual", max_length=120)


class CandidateTaskRead(BaseModel):
    id: str
    task_type: str
    title: str
    summary: str
    evidence_excerpt: str
    recommended_agents: list[str]
    status: str


class IntakeRead(BaseModel):
    id: str
    title: str
    input_type: str
    raw_content: str
    candidate_tasks: list[CandidateTaskRead]
```

- [ ] **Step 4: 입력물 분해 서비스 작성**

Create `backend/app/services/intake_decomposition.py`:

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class CandidateTaskDraft:
    task_type: str
    title: str
    summary: str
    evidence_excerpt: str
    recommended_agents: list[str]


def decompose_input(raw_content: str) -> list[CandidateTaskDraft]:
    text = raw_content.strip()
    candidates: list[CandidateTaskDraft] = []

    if any(keyword in text for keyword in ["결과지", "문구", "페이지", "수정"]):
        candidates.append(
            CandidateTaskDraft(
                task_type="report_phrase_revision",
                title="결과지 문구 수정 후보",
                summary="입력물에서 검사 결과지 문구 수정 요청을 발견했습니다.",
                evidence_excerpt=_excerpt(text, ["결과지", "문구", "수정"]),
                recommended_agents=["crata_ceo", "concept_guardian", "report_editor", "quality_inspector"],
            )
        )

    if any(keyword in text for keyword in ["상담", "전사록", "사례", "학습"]):
        candidates.append(
            CandidateTaskDraft(
                task_type="counseling_case_learning",
                title="상담 사례 학습 후보",
                summary="입력물에서 상담 사례 저장 또는 학습 후보 요청을 발견했습니다.",
                evidence_excerpt=_excerpt(text, ["상담", "사례", "학습"]),
                recommended_agents=["crata_ceo", "case_learner", "relationship_analyst", "quality_inspector"],
            )
        )

    if any(keyword in text for keyword in ["제안서", "프로그램", "상품", "기획"]):
        candidates.append(
            CandidateTaskDraft(
                task_type="business_planning",
                title="사업·프로그램 기획 후보",
                summary="입력물에서 사업, 제안서, 상품, 프로그램 기획 요청을 발견했습니다.",
                evidence_excerpt=_excerpt(text, ["제안서", "프로그램", "상품", "기획"]),
                recommended_agents=["crata_ceo", "business_designer"],
            )
        )

    if any(keyword in text for keyword in ["유튜브", "홍보", "블로그", "콘텐츠"]):
        candidates.append(
            CandidateTaskDraft(
                task_type="content_marketing",
                title="콘텐츠·홍보 작업 후보",
                summary="입력물에서 콘텐츠, 홍보, 유튜브 관련 요청을 발견했습니다.",
                evidence_excerpt=_excerpt(text, ["유튜브", "홍보", "블로그", "콘텐츠"]),
                recommended_agents=["crata_ceo", "content_strategist"],
            )
        )

    if not candidates:
        candidates.append(
            CandidateTaskDraft(
                task_type="general_agent_task",
                title="일반 에이전트 작업 후보",
                summary="명확한 유형은 없지만 실행 가능한 일반 요청으로 분류했습니다.",
                evidence_excerpt=text[:160],
                recommended_agents=["crata_ceo"],
            )
        )

    return candidates


def _excerpt(text: str, keywords: list[str]) -> str:
    for keyword in keywords:
        idx = text.find(keyword)
        if idx >= 0:
            start = max(0, idx - 40)
            end = min(len(text), idx + 120)
            return text[start:end]
    return text[:160]
```

- [ ] **Step 5: Intake API 작성**

Create `backend/app/api/intake.py`:

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.intake import CandidateTask, IntakeItem
from app.schemas.intake import CandidateTaskRead, IntakeCreate, IntakeRead
from app.services.intake_decomposition import decompose_input

router = APIRouter(prefix="/intake", tags=["intake"])


@router.post("", response_model=IntakeRead, status_code=status.HTTP_201_CREATED)
def create_intake(payload: IntakeCreate, db: Session = Depends(get_db)) -> IntakeRead:
    item = IntakeItem(
        title=payload.title,
        input_type=payload.input_type,
        raw_content=payload.raw_content,
        source=payload.source,
        item_metadata={},
    )
    db.add(item)
    db.flush()

    candidates: list[CandidateTask] = []
    for draft in decompose_input(payload.raw_content):
        candidate = CandidateTask(
            intake_item_id=item.id,
            task_type=draft.task_type,
            title=draft.title,
            summary=draft.summary,
            evidence_excerpt=draft.evidence_excerpt,
            recommended_agents=draft.recommended_agents,
            status="draft",
            item_metadata={},
        )
        db.add(candidate)
        candidates.append(candidate)

    db.commit()
    for candidate in candidates:
        db.refresh(candidate)
    db.refresh(item)

    return IntakeRead(
        id=item.id,
        title=item.title,
        input_type=item.input_type,
        raw_content=item.raw_content,
        candidate_tasks=[
            CandidateTaskRead(
                id=c.id,
                task_type=c.task_type,
                title=c.title,
                summary=c.summary,
                evidence_excerpt=c.evidence_excerpt,
                recommended_agents=c.recommended_agents,
                status=c.status,
            )
            for c in candidates
        ],
    )
```

Modify `backend/app/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.intake import router as intake_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="CRATA AI Office API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(intake_router)
    return app


app = create_app()
```

- [ ] **Step 6: 테스트 통과 확인**

Run:

```powershell
cd backend
.\.venv\Scripts\python -m pytest tests/test_intake_api.py -v
```

Expected:

```text
tests/test_intake_api.py::test_create_intake_extracts_candidate_tasks PASSED
```

- [ ] **Step 7: 커밋**

```bash
git add backend
git commit -m "feat: add request intake decomposition"
```

---

## Task 6: 에이전트 작업 실행 그래프와 승인대기 생성

**Files:**
- Create: `backend/app/services/model_gateway.py`
- Create: `backend/app/services/workflow_runner.py`
- Create: `backend/app/schemas/workflow.py`
- Create: `backend/app/api/tasks.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_workflow_runner.py`

- [ ] **Step 1: workflow runner 테스트 작성**

Create `backend/tests/test_workflow_runner.py`:

```python
from sqlalchemy.orm import Session

from app.models.approval import Approval
from app.models.artifact import Artifact
from app.models.intake import CandidateTask, IntakeItem
from app.models.task import Task
from app.services.agent_seed import seed_agents
from app.services.workflow_runner import run_task_workflow


def test_run_task_workflow_creates_artifact_and_approval(db_session: Session) -> None:
    seed_agents(db_session)
    item = IntakeItem(title="회의록", input_type="meeting_notes", raw_content="결과지 문구를 수정하자", item_metadata={})
    db_session.add(item)
    db_session.flush()
    candidate = CandidateTask(
        intake_item_id=item.id,
        task_type="report_phrase_revision",
        title="결과지 문구 수정 후보",
        summary="문구 수정 요청",
        evidence_excerpt="결과지 문구를 수정하자",
        recommended_agents=["crata_ceo", "concept_guardian", "report_editor", "quality_inspector"],
        item_metadata={},
    )
    db_session.add(candidate)
    db_session.flush()
    task = Task(
        candidate_task_id=candidate.id,
        task_type=candidate.task_type,
        title=candidate.title,
        description=candidate.summary,
        status="draft",
        assigned_agents=candidate.recommended_agents,
    )
    db_session.add(task)
    db_session.commit()

    result = run_task_workflow(db_session, task.id)

    assert result.status == "pending_approval"
    artifact = db_session.query(Artifact).one()
    approval = db_session.query(Approval).one()
    assert artifact.status == "pending_approval"
    assert approval.status == "pending_approval"
    assert "결과지 문구 수정 후보" in approval.title
```

- [ ] **Step 2: 실패 확인**

Run:

```powershell
cd backend
.\.venv\Scripts\python -m pytest tests/test_workflow_runner.py -v
```

Expected:

```text
ModuleNotFoundError: No module named 'app.services.workflow_runner'
```

- [ ] **Step 3: 모델 게이트웨이 작성**

Create `backend/app/services/model_gateway.py`:

```python
from app.core.config import get_settings


class ModelGateway:
    def draft(self, *, task_title: str, task_type: str, context: str) -> str:
        settings = get_settings()
        if not settings.openai_api_key:
            return self._fallback_draft(task_title=task_title, task_type=task_type, context=context)
        return self._fallback_draft(task_title=task_title, task_type=task_type, context=context)

    def _fallback_draft(self, *, task_title: str, task_type: str, context: str) -> str:
        return (
            f"# {task_title}\n\n"
            f"## 작업 유형\n{task_type}\n\n"
            "## 초안\n"
            "이 항목은 CRATA AI Office MVP의 deterministic fallback으로 생성된 초안입니다.\n\n"
            "## 근거\n"
            f"{context[:500]}\n\n"
            "## 검수 메모\n"
            "공식 지식 또는 결과지 문구에 반영하기 전 청하님 승인이 필요합니다.\n"
        )
```

- [ ] **Step 4: workflow runner 작성**

Create `backend/app/services/workflow_runner.py`:

```python
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.approval import Approval
from app.models.artifact import Artifact
from app.models.task import Task
from app.models.workflow import WorkflowRun, WorkflowStep
from app.services.model_gateway import ModelGateway


@dataclass(frozen=True)
class WorkflowResult:
    workflow_run_id: str
    artifact_id: str
    approval_id: str
    status: str


def run_task_workflow(db: Session, task_id: str) -> WorkflowResult:
    task = db.get(Task, task_id)
    if task is None:
        raise ValueError(f"Task not found: {task_id}")

    run = WorkflowRun(
        workflow_type="agent_operation",
        task_id=task.id,
        status="running",
        current_step="ceo_routing",
        checkpoint={"task_type": task.task_type, "assigned_agents": task.assigned_agents},
    )
    db.add(run)
    db.flush()

    _add_step(db, run.id, "ceo_routing", "crata_ceo", task.title, "작업 성격과 담당 에이전트를 확인했습니다.")
    _add_step(db, run.id, "context_retrieval", "concept_guardian", task.description, "MVP에서는 입력 요약을 컨텍스트로 사용합니다.")

    draft = ModelGateway().draft(task_title=task.title, task_type=task.task_type, context=task.description)
    artifact = Artifact(
        task_id=task.id,
        workflow_run_id=run.id,
        artifact_type="draft",
        title=f"{task.title} 초안",
        content=draft,
        status="pending_approval",
        item_metadata={"generated_by": "workflow_runner"},
    )
    db.add(artifact)
    db.flush()

    _add_step(db, run.id, "specialist_draft", _primary_agent(task.task_type), task.description, "담당 에이전트가 초안을 작성했습니다.")
    _add_step(db, run.id, "quality_review", "quality_inspector", draft, "승인 전 검토가 필요합니다.")

    approval = Approval(
        task_id=task.id,
        artifact_id=artifact.id,
        approval_type=_approval_type(task.task_type),
        status="pending_approval",
        title=f"{task.title} 승인 요청",
        summary="에이전트 작업 결과가 승인대기 상태입니다.",
        before_content="",
        after_content=draft,
        affected_area=task.task_type,
        reviewer_note="공식 반영 전 청하님 검토가 필요합니다.",
    )
    db.add(approval)

    task.status = "pending_approval"
    run.status = "pending_approval"
    run.current_step = "approval_pending"
    run.completed_at = datetime.utcnow()
    db.commit()

    return WorkflowResult(
        workflow_run_id=run.id,
        artifact_id=artifact.id,
        approval_id=approval.id,
        status="pending_approval",
    )


def _add_step(db: Session, run_id: str, step_name: str, agent_id: str, input_summary: str, output_summary: str) -> None:
    db.add(
        WorkflowStep(
            workflow_run_id=run_id,
            step_name=step_name,
            agent_id=agent_id,
            input_summary=input_summary[:1000],
            output_summary=output_summary,
            status="completed",
            completed_at=datetime.utcnow(),
            item_metadata={},
        )
    )


def _primary_agent(task_type: str) -> str:
    return {
        "report_phrase_revision": "report_editor",
        "counseling_case_learning": "case_learner",
        "relationship_pattern_analysis": "relationship_analyst",
        "business_planning": "business_designer",
        "content_marketing": "content_strategist",
    }.get(task_type, "crata_ceo")


def _approval_type(task_type: str) -> str:
    if task_type == "report_phrase_revision":
        return "report_phrase_change"
    if task_type == "counseling_case_learning":
        return "learning_candidate"
    return "general_review"
```

- [ ] **Step 5: task API schema와 router 작성**

Create `backend/app/schemas/workflow.py`:

```python
from pydantic import BaseModel


class RunTaskResponse(BaseModel):
    task_id: str
    workflow_run_id: str
    artifact_id: str
    approval_id: str
    status: str
```

Create `backend/app/api/tasks.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.intake import CandidateTask
from app.models.task import Task
from app.schemas.workflow import RunTaskResponse
from app.services.workflow_runner import run_task_workflow

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/from-candidate/{candidate_id}/run", response_model=RunTaskResponse, status_code=status.HTTP_201_CREATED)
def run_candidate(candidate_id: str, db: Session = Depends(get_db)) -> RunTaskResponse:
    candidate = db.get(CandidateTask, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate task not found")

    task = Task(
        candidate_task_id=candidate.id,
        task_type=candidate.task_type,
        title=candidate.title,
        description=candidate.summary,
        status="running",
        assigned_agents=candidate.recommended_agents,
    )
    candidate.status = "running"
    db.add(task)
    db.commit()
    db.refresh(task)

    result = run_task_workflow(db, task.id)
    return RunTaskResponse(
        task_id=task.id,
        workflow_run_id=result.workflow_run_id,
        artifact_id=result.artifact_id,
        approval_id=result.approval_id,
        status=result.status,
    )
```

Modify `backend/app/main.py` to include `tasks_router`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.intake import router as intake_router
from app.api.tasks import router as tasks_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="CRATA AI Office API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(intake_router)
    app.include_router(tasks_router)
    return app


app = create_app()
```

- [ ] **Step 6: 테스트 통과 확인**

Run:

```powershell
cd backend
.\.venv\Scripts\python -m pytest tests/test_workflow_runner.py -v
```

Expected:

```text
tests/test_workflow_runner.py::test_run_task_workflow_creates_artifact_and_approval PASSED
```

- [ ] **Step 7: 커밋**

```bash
git add backend
git commit -m "feat: run agent workflow into approval queue"
```

---

## Task 7: 승인대기 API와 Dashboard API

**Files:**
- Create: `backend/app/schemas/approval.py`
- Create: `backend/app/schemas/dashboard.py`
- Create: `backend/app/api/approvals.py`
- Create: `backend/app/api/dashboard.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_approvals_api.py`

- [ ] **Step 1: 승인 API 테스트 작성**

Create `backend/tests/test_approvals_api.py`:

```python
from fastapi.testclient import TestClient


def test_approval_inbox_lists_pending_items(app_with_db) -> None:
    client = TestClient(app_with_db)
    intake = client.post(
        "/intake",
        json={
            "title": "회의록",
            "input_type": "meeting_notes",
            "raw_content": "결과지 문구를 수정하자.",
        },
    ).json()
    candidate_id = intake["candidate_tasks"][0]["id"]
    client.post(f"/tasks/from-candidate/{candidate_id}/run")

    response = client.get("/approvals")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["status"] == "pending_approval"


def test_approve_item_changes_status(app_with_db) -> None:
    client = TestClient(app_with_db)
    intake = client.post(
        "/intake",
        json={
            "title": "회의록",
            "input_type": "meeting_notes",
            "raw_content": "결과지 문구를 수정하자.",
        },
    ).json()
    candidate_id = intake["candidate_tasks"][0]["id"]
    run = client.post(f"/tasks/from-candidate/{candidate_id}/run").json()

    response = client.post(f"/approvals/{run['approval_id']}/decide", json={"decision": "approved", "reason": "확인 완료"})

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
```

- [ ] **Step 2: 실패 확인**

Run:

```powershell
cd backend
.\.venv\Scripts\python -m pytest tests/test_approvals_api.py -v
```

Expected:

```text
404 Not Found
```

- [ ] **Step 3: 승인 schema 작성**

Create `backend/app/schemas/approval.py`:

```python
from pydantic import BaseModel, Field


class ApprovalRead(BaseModel):
    id: str
    task_id: str
    artifact_id: str
    approval_type: str
    status: str
    title: str
    summary: str
    before_content: str
    after_content: str
    affected_area: str
    reviewer_note: str


class ApprovalDecision(BaseModel):
    decision: str = Field(pattern="^(approved|rejected|revise_requested)$")
    reason: str = ""
```

Create `backend/app/schemas/dashboard.py`:

```python
from pydantic import BaseModel


class DashboardSummary(BaseModel):
    agent_count: int
    active_agent_count: int
    candidate_task_count: int
    running_task_count: int
    pending_approval_count: int
    artifact_count: int
```

- [ ] **Step 4: 승인 router 작성**

Create `backend/app/api/approvals.py`:

```python
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.approval import Approval
from app.models.artifact import Artifact
from app.models.task import Task
from app.schemas.approval import ApprovalDecision, ApprovalRead

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("", response_model=list[ApprovalRead])
def list_approvals(db: Session = Depends(get_db)) -> list[ApprovalRead]:
    items = db.query(Approval).order_by(Approval.created_at.desc()).all()
    return [_read(item) for item in items]


@router.post("/{approval_id}/decide", response_model=ApprovalRead)
def decide_approval(approval_id: str, payload: ApprovalDecision, db: Session = Depends(get_db)) -> ApprovalRead:
    approval = db.get(Approval, approval_id)
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found")

    approval.status = payload.decision
    approval.decision_reason = payload.reason
    approval.decided_at = datetime.utcnow()

    artifact = db.get(Artifact, approval.artifact_id)
    if artifact is not None:
        artifact.status = payload.decision

    task = db.get(Task, approval.task_id)
    if task is not None:
        task.status = payload.decision

    db.commit()
    db.refresh(approval)
    return _read(approval)


def _read(item: Approval) -> ApprovalRead:
    return ApprovalRead(
        id=item.id,
        task_id=item.task_id,
        artifact_id=item.artifact_id,
        approval_type=item.approval_type,
        status=item.status,
        title=item.title,
        summary=item.summary,
        before_content=item.before_content,
        after_content=item.after_content,
        affected_area=item.affected_area,
        reviewer_note=item.reviewer_note,
    )
```

Create `backend/app/api/dashboard.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.agent import Agent
from app.models.approval import Approval
from app.models.artifact import Artifact
from app.models.intake import CandidateTask
from app.models.task import Task
from app.schemas.dashboard import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    return DashboardSummary(
        agent_count=db.query(Agent).count(),
        active_agent_count=db.query(Agent).filter(Agent.enabled.is_(True)).count(),
        candidate_task_count=db.query(CandidateTask).count(),
        running_task_count=db.query(Task).filter(Task.status == "running").count(),
        pending_approval_count=db.query(Approval).filter(Approval.status == "pending_approval").count(),
        artifact_count=db.query(Artifact).count(),
    )
```

Modify `backend/app/main.py` to include `approvals_router` and `dashboard_router`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.approvals import router as approvals_router
from app.api.dashboard import router as dashboard_router
from app.api.health import router as health_router
from app.api.intake import router as intake_router
from app.api.tasks import router as tasks_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="CRATA AI Office API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(intake_router)
    app.include_router(tasks_router)
    app.include_router(approvals_router)
    app.include_router(dashboard_router)
    return app


app = create_app()
```

- [ ] **Step 5: 테스트 통과 확인**

Run:

```powershell
cd backend
.\.venv\Scripts\python -m pytest tests/test_approvals_api.py -v
```

Expected:

```text
tests/test_approvals_api.py::test_approval_inbox_lists_pending_items PASSED
tests/test_approvals_api.py::test_approve_item_changes_status PASSED
```

- [ ] **Step 6: 커밋**

```bash
git add backend
git commit -m "feat: add approvals and dashboard APIs"
```

---

## Task 8: Next.js 프론트엔드 골격과 디자인 토큰

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/next.config.mjs`
- Create: `frontend/tsconfig.json`
- Create: `frontend/postcss.config.mjs`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/app/globals.css`
- Create: `frontend/app/layout.tsx`
- Create: `frontend/lib/design-tokens.ts`
- Create: `frontend/lib/types.ts`

- [ ] **Step 1: 프론트 package 작성**

Create `frontend/package.json`:

```json
{
  "name": "crata-ai-office-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3005",
    "build": "next build",
    "start": "next start -p 3005",
    "test": "vitest run"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "lucide-react": "latest",
    "next": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "autoprefixer": "latest",
    "jsdom": "latest",
    "postcss": "latest",
    "tailwindcss": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Next/Tailwind 설정 작성**

Create `frontend/next.config.mjs`:

```javascript
const nextConfig = {};

export default nextConfig;
```

Create `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `frontend/postcss.config.mjs`:

```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

Create `frontend/tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F6F7F4",
        surface: "#FFFFFF",
        surfaceAlt: "#EEF2EE",
        border: "#D8DED8",
        primary: "#1F6B57",
        approval: "#C9852B",
        analysis: "#34699A",
        danger: "#B83A3A",
        success: "#2F7D4E",
      },
      borderRadius: {
        card: "8px",
        button: "6px",
      },
      boxShadow: {
        panel: "0 8px 24px rgba(31, 39, 35, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
```

Create `frontend/vitest.config.ts`:

```typescript
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

- [ ] **Step 3: 전역 스타일 작성**

Create `frontend/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --app-background: #f6f7f4;
  --app-surface: #ffffff;
  --app-surface-alt: #eef2ee;
  --app-border: #d8ded8;
  --text-primary: #1f2723;
  --text-secondary: #5f6b64;
  --brand-primary: #1f6b57;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--app-background);
  color: var(--text-primary);
  font-family: Pretendard, Inter, system-ui, sans-serif;
  letter-spacing: 0;
}

button,
input,
textarea {
  font: inherit;
}
```

Create `frontend/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRATA AI Office",
  description: "CRATA 에이전트 로컬 운영센터",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: 타입과 토큰 작성**

Create `frontend/lib/design-tokens.ts`:

```typescript
export const statusColors = {
  idle: "#9AA3A0",
  working: "#1F6B57",
  reviewing: "#34699A",
  waiting_for_approval: "#C9852B",
  approved: "#2F7D4E",
  rejected: "#B83A3A",
  error: "#9F2F2F",
  disabled: "#B8C0BB",
  planned: "#6A5EA8",
} as const;

export type AgentStatus = keyof typeof statusColors;
```

Create `frontend/lib/types.ts`:

```typescript
import type { AgentStatus } from "./design-tokens";

export type Agent = {
  id: string;
  displayName: string;
  role: string;
  status: AgentStatus;
  enabled: boolean;
  color: string;
};

export type CandidateTask = {
  id: string;
  task_type: string;
  title: string;
  summary: string;
  evidence_excerpt: string;
  recommended_agents: string[];
  status: string;
};

export type IntakeResponse = {
  id: string;
  title: string;
  input_type: string;
  raw_content: string;
  candidate_tasks: CandidateTask[];
};

export type Approval = {
  id: string;
  title: string;
  summary: string;
  status: string;
  after_content: string;
  affected_area: string;
  reviewer_note: string;
};
```

- [ ] **Step 5: 설치와 빌드 확인**

Run:

```powershell
cd frontend
npm install
npm run build
```

Expected:

```text
Compiled successfully
```

- [ ] **Step 6: 커밋**

```bash
git add frontend
git commit -m "feat: scaffold nextjs frontend"
```

---

## Task 9: 프론트 공통 UI와 Dashboard

**Files:**
- Create: `frontend/components/status-pill.tsx`
- Create: `frontend/components/agent-card.tsx`
- Create: `frontend/components/metric-card.tsx`
- Create: `frontend/components/app-shell.tsx`
- Create: `frontend/tests/status-pill.test.tsx`
- Create: `frontend/tests/agent-card.test.tsx`
- Create: `frontend/app/page.tsx`

- [ ] **Step 1: 컴포넌트 테스트 작성**

Create `frontend/tests/status-pill.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusPill } from "../components/status-pill";

describe("StatusPill", () => {
  it("renders Korean status label", () => {
    render(<StatusPill status="working" />);
    expect(screen.getByText("작업중")).toBeTruthy();
  });
});
```

Create `frontend/tests/agent-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AgentCard } from "../components/agent-card";

describe("AgentCard", () => {
  it("renders agent display name and role", () => {
    render(
      <AgentCard
        agent={{
          id: "concept_guardian",
          displayName: "개념수호자",
          role: "공식 지식 검토",
          status: "idle",
          enabled: true,
          color: "#6A5EA8",
        }}
      />,
    );

    expect(screen.getByText("개념수호자")).toBeTruthy();
    expect(screen.getByText("공식 지식 검토")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:

```powershell
cd frontend
npm run test
```

Expected:

```text
Failed to resolve import "../components/status-pill"
```

- [ ] **Step 3: 공통 컴포넌트 작성**

Create `frontend/components/status-pill.tsx`:

```tsx
import { statusColors, type AgentStatus } from "@/lib/design-tokens";

const labels: Record<AgentStatus, string> = {
  idle: "대기",
  working: "작업중",
  reviewing: "검수중",
  waiting_for_approval: "승인대기",
  approved: "승인됨",
  rejected: "거부됨",
  error: "오류",
  disabled: "비활성",
  planned: "준비 중",
};

export function StatusPill({ status }: { status: AgentStatus }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white"
      style={{ backgroundColor: statusColors[status] }}
    >
      {labels[status]}
    </span>
  );
}
```

Create `frontend/components/agent-card.tsx`:

```tsx
import { Bot } from "lucide-react";

import { StatusPill } from "@/components/status-pill";
import type { Agent } from "@/lib/types";

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-panel" style={{ borderLeft: `5px solid ${agent.color}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surfaceAlt">
            <Bot size={20} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1F2723]">{agent.displayName}</h3>
            <p className="mt-1 text-xs text-[#5F6B64]">{agent.role}</p>
          </div>
        </div>
        <StatusPill status={agent.status} />
      </div>
    </article>
  );
}
```

Create `frontend/components/metric-card.tsx`:

```tsx
export function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-panel">
      <div className="text-xs font-semibold text-[#5F6B64]">{label}</div>
      <div className="mt-2 text-2xl font-bold text-[#1F2723]">{value}</div>
    </div>
  );
}
```

Create `frontend/components/app-shell.tsx`:

```tsx
import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/request-intake", label: "Request Intake" },
  { href: "/approvals", label: "Approval Inbox" },
  { href: "/agents", label: "Agents" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-border bg-surface px-5 py-6">
        <div className="text-lg font-bold text-[#1F2723]">CRATA AI Office</div>
        <nav className="mt-8 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-button px-3 py-2 text-sm font-semibold text-[#5F6B64] hover:bg-surfaceAlt">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="ml-64 px-6 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Dashboard 페이지 작성**

Create `frontend/app/page.tsx`:

```tsx
import { AgentCard } from "@/components/agent-card";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import type { Agent } from "@/lib/types";

const agents: Agent[] = [
  { id: "crata_ceo", displayName: "CRATA CEO", role: "전체 라우팅과 작업 조율", status: "idle", enabled: true, color: "#1F6B57" },
  { id: "concept_guardian", displayName: "개념수호자", role: "공식 지식과 개념 일관성 검토", status: "idle", enabled: true, color: "#6A5EA8" },
  { id: "report_editor", displayName: "결과지 에디터", role: "검사 결과지 문구 작성과 수정", status: "idle", enabled: true, color: "#34699A" },
  { id: "counseling_coach", displayName: "상담 코치", role: "유형 기반 상담 답변 초안", status: "idle", enabled: true, color: "#2F7D4E" },
  { id: "case_learner", displayName: "사례학습가", role: "상담 사례 추출과 학습 후보 생성", status: "idle", enabled: true, color: "#C9852B" },
  { id: "relationship_analyst", displayName: "관계분석가", role: "유형 조합과 관계 패턴 분석", status: "idle", enabled: true, color: "#4B7F83" },
  { id: "quality_inspector", displayName: "품질검수관", role: "안전성, 톤, 승인 준비 상태 검수", status: "idle", enabled: true, color: "#B83A3A" },
  { id: "business_designer", displayName: "사업설계자", role: "제안서, 상품, 프로그램 기획", status: "planned", enabled: false, color: "#7A5A2E" },
  { id: "content_strategist", displayName: "콘텐츠전략가", role: "홍보, 유튜브, 블로그, 홈페이지 문구", status: "planned", enabled: false, color: "#B35C3E" },
  { id: "operations_secretary", displayName: "운영비서", role: "브리핑, 승인 요약, 자동화", status: "planned", enabled: false, color: "#5F6B64" },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <section>
        <p className="text-sm font-semibold text-primary">Local AI Operations Center</p>
        <h1 className="mt-2 text-3xl font-bold text-[#1F2723]">CRATA AI Office</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#5F6B64]">회의록과 상담 전사록에서 작업 후보를 추출하고, 에이전트 실행과 승인 흐름을 관리합니다.</p>
      </section>

      <section className="mt-6 grid grid-cols-4 gap-4">
        <MetricCard label="활성 에이전트" value={7} />
        <MetricCard label="준비 중 에이전트" value={3} />
        <MetricCard label="작업 후보" value={0} />
        <MetricCard label="승인대기" value={0} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[#1F2723]">AI Office 상태판</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run:

```powershell
cd frontend
npm run test
npm run build
```

Expected:

```text
2 passed
Compiled successfully
```

- [ ] **Step 6: 커밋**

```bash
git add frontend
git commit -m "feat: add dashboard and agent cards"
```

---

## Task 10: Request Intake, Approval Inbox, API client 연결

**Files:**
- Create: `frontend/lib/api.ts`
- Create: `frontend/components/approval-card.tsx`
- Create: `frontend/app/request-intake/page.tsx`
- Create: `frontend/app/approvals/page.tsx`
- Create: `frontend/app/agents/page.tsx`

- [ ] **Step 1: API client 작성**

Create `frontend/lib/api.ts`:

```typescript
import type { Approval, IntakeResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function createIntake(payload: {
  title: string;
  input_type: string;
  raw_content: string;
}): Promise<IntakeResponse> {
  const response = await fetch(`${API_BASE}/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("입력물 저장에 실패했습니다.");
  return response.json();
}

export async function runCandidate(candidateId: string): Promise<{ status: string; approval_id: string }> {
  const response = await fetch(`${API_BASE}/tasks/from-candidate/${candidateId}/run`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("작업 실행에 실패했습니다.");
  return response.json();
}

export async function listApprovals(): Promise<Approval[]> {
  const response = await fetch(`${API_BASE}/approvals`, { cache: "no-store" });
  if (!response.ok) throw new Error("승인대기 목록을 불러오지 못했습니다.");
  return response.json();
}

export async function decideApproval(id: string, decision: "approved" | "rejected" | "revise_requested", reason = ""): Promise<Approval> {
  const response = await fetch(`${API_BASE}/approvals/${id}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, reason }),
  });
  if (!response.ok) throw new Error("승인 처리에 실패했습니다.");
  return response.json();
}
```

- [ ] **Step 2: 승인 카드 작성**

Create `frontend/components/approval-card.tsx`:

```tsx
"use client";

import { Check, X } from "lucide-react";

import { decideApproval } from "@/lib/api";
import type { Approval } from "@/lib/types";

export function ApprovalCard({ approval }: { approval: Approval }) {
  async function decide(decision: "approved" | "rejected") {
    await decideApproval(approval.id, decision, decision === "approved" ? "확인 완료" : "보류 또는 거부");
    window.location.reload();
  }

  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-approval">{approval.status}</div>
          <h3 className="mt-1 text-base font-bold text-[#1F2723]">{approval.title}</h3>
          <p className="mt-2 text-sm text-[#5F6B64]">{approval.summary}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => decide("approved")} className="inline-flex items-center gap-1 rounded-button bg-success px-3 py-2 text-sm font-semibold text-white">
            <Check size={16} /> 승인
          </button>
          <button onClick={() => decide("rejected")} className="inline-flex items-center gap-1 rounded-button bg-danger px-3 py-2 text-sm font-semibold text-white">
            <X size={16} /> 거부
          </button>
        </div>
      </div>
      <div className="mt-4 rounded-card bg-surfaceAlt p-3">
        <div className="text-xs font-bold text-[#5F6B64]">검토 의견</div>
        <p className="mt-1 text-sm text-[#1F2723]">{approval.reviewer_note}</p>
      </div>
      <pre className="mt-4 max-h-80 overflow-auto rounded-card border border-border bg-white p-3 text-xs text-[#1F2723]">{approval.after_content}</pre>
    </article>
  );
}
```

- [ ] **Step 3: Request Intake 페이지 작성**

Create `frontend/app/request-intake/page.tsx`:

```tsx
"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { createIntake, runCandidate } from "@/lib/api";
import type { CandidateTask } from "@/lib/types";

export default function RequestIntakePage() {
  const [title, setTitle] = useState("회의록");
  const [rawContent, setRawContent] = useState("");
  const [candidates, setCandidates] = useState<CandidateTask[]>([]);
  const [message, setMessage] = useState("");

  async function submit() {
    const result = await createIntake({ title, input_type: "meeting_notes", raw_content: rawContent });
    setCandidates(result.candidate_tasks);
    setMessage(`${result.candidate_tasks.length}개의 작업 후보를 추출했습니다.`);
  }

  async function run(id: string) {
    const result = await runCandidate(id);
    setMessage(`작업을 실행했고 승인대기 항목이 생성되었습니다: ${result.approval_id}`);
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-[#1F2723]">Request Intake</h1>
      <p className="mt-2 text-sm text-[#5F6B64]">회의록, 상담 전사록, 메모를 넣으면 작업 후보 카드로 분해합니다.</p>

      <section className="mt-6 rounded-card border border-border bg-surface p-4 shadow-panel">
        <label className="text-sm font-semibold text-[#1F2723]">제목</label>
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-button border border-border px-3 py-2" />

        <label className="mt-4 block text-sm font-semibold text-[#1F2723]">원문</label>
        <textarea
          value={rawContent}
          onChange={(event) => setRawContent(event.target.value)}
          rows={10}
          className="mt-2 w-full rounded-button border border-border px-3 py-2"
          placeholder="예: 조직행동검사 5페이지 문구를 수정하자. A유형 B유형 상담 사례도 학습 후보로 저장하자."
        />

        <button onClick={submit} className="mt-4 rounded-button bg-primary px-4 py-2 text-sm font-semibold text-white">작업 후보 추출</button>
        {message ? <p className="mt-3 text-sm font-semibold text-primary">{message}</p> : null}
      </section>

      <section className="mt-6 space-y-3">
        {candidates.map((candidate) => (
          <article key={candidate.id} className="rounded-card border border-border bg-surface p-4 shadow-panel">
            <div className="text-xs font-semibold text-analysis">{candidate.task_type}</div>
            <h2 className="mt-1 text-base font-bold text-[#1F2723]">{candidate.title}</h2>
            <p className="mt-2 text-sm text-[#5F6B64]">{candidate.summary}</p>
            <p className="mt-2 text-xs text-[#8A948E]">{candidate.evidence_excerpt}</p>
            <button onClick={() => run(candidate.id)} className="mt-4 rounded-button bg-primary px-3 py-2 text-sm font-semibold text-white">이 작업 실행</button>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
```

- [ ] **Step 4: Approval Inbox와 Agents 페이지 작성**

Create `frontend/app/approvals/page.tsx`:

```tsx
import { ApprovalCard } from "@/components/approval-card";
import { AppShell } from "@/components/app-shell";
import { listApprovals } from "@/lib/api";

export default async function ApprovalsPage() {
  const approvals = await listApprovals();

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-[#1F2723]">Approval Inbox</h1>
      <p className="mt-2 text-sm text-[#5F6B64]">공식 반영 전 검토가 필요한 항목입니다.</p>
      <section className="mt-6 space-y-4">
        {approvals.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-6 text-sm text-[#5F6B64]">승인대기 항목이 없습니다.</div>
        ) : (
          approvals.map((approval) => <ApprovalCard key={approval.id} approval={approval} />)
        )}
      </section>
    </AppShell>
  );
}
```

Create `frontend/app/agents/page.tsx`:

```tsx
import { AgentCard } from "@/components/agent-card";
import { AppShell } from "@/components/app-shell";
import type { Agent } from "@/lib/types";

const agents: Agent[] = [
  { id: "crata_ceo", displayName: "CRATA CEO", role: "전체 라우팅과 작업 조율", status: "idle", enabled: true, color: "#1F6B57" },
  { id: "concept_guardian", displayName: "개념수호자", role: "공식 지식과 개념 일관성 검토", status: "idle", enabled: true, color: "#6A5EA8" },
  { id: "report_editor", displayName: "결과지 에디터", role: "검사 결과지 문구 작성과 수정", status: "idle", enabled: true, color: "#34699A" },
  { id: "counseling_coach", displayName: "상담 코치", role: "유형 기반 상담 답변 초안", status: "idle", enabled: true, color: "#2F7D4E" },
  { id: "case_learner", displayName: "사례학습가", role: "상담 사례 추출과 학습 후보 생성", status: "idle", enabled: true, color: "#C9852B" },
  { id: "relationship_analyst", displayName: "관계분석가", role: "유형 조합과 관계 패턴 분석", status: "idle", enabled: true, color: "#4B7F83" },
  { id: "quality_inspector", displayName: "품질검수관", role: "안전성, 톤, 승인 준비 상태 검수", status: "idle", enabled: true, color: "#B83A3A" },
  { id: "business_designer", displayName: "사업설계자", role: "제안서, 상품, 프로그램 기획", status: "planned", enabled: false, color: "#7A5A2E" },
  { id: "content_strategist", displayName: "콘텐츠전략가", role: "홍보, 유튜브, 블로그, 홈페이지 문구", status: "planned", enabled: false, color: "#B35C3E" },
  { id: "operations_secretary", displayName: "운영비서", role: "브리핑, 승인 요약, 자동화", status: "planned", enabled: false, color: "#5F6B64" },
];

export default function AgentsPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-[#1F2723]">Agents</h1>
      <p className="mt-2 text-sm text-[#5F6B64]">1차 활성 에이전트와 2차 확장 예정 에이전트입니다.</p>
      <section className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </section>
    </AppShell>
  );
}
```

- [ ] **Step 5: 프론트 빌드 확인**

Run:

```powershell
cd frontend
npm run build
```

Expected:

```text
Compiled successfully
```

- [ ] **Step 6: 커밋**

```bash
git add frontend
git commit -m "feat: connect intake and approvals UI"
```

---

## Task 11: 로컬 실행 검증과 개발 문서 정리

**Files:**
- Modify: `README.md`
- Create: `docs/runbook.md`

- [ ] **Step 1: runbook 작성**

Create `docs/runbook.md`:

```markdown
# CRATA AI Office 로컬 실행 Runbook

## 1. DB 실행

```powershell
docker compose up -d postgres
```

## 2. 백엔드 실행

```powershell
cd backend
.\.venv\Scripts\python -m alembic upgrade head
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

확인:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

## 3. 프론트 실행

```powershell
cd frontend
npm run dev
```

접속:

```text
http://localhost:3005
```

## 4. MVP 수동 검증

1. `Request Intake`로 이동한다.
2. 원문에 `조직행동검사 5페이지 문구를 수정하자. A유형 B유형 상담 사례도 학습 후보로 저장하자.`를 입력한다.
3. 작업 후보 2개가 나오는지 확인한다.
4. 결과지 문구 후보를 실행한다.
5. `Approval Inbox`에서 승인대기 항목이 보이는지 확인한다.
6. 승인 버튼을 누른 뒤 상태가 `approved`가 되는지 확인한다.
```

- [ ] **Step 2: README 업데이트**

Modify `README.md`:

```markdown
# CRATA AI Office

청하님 혼자 사용하는 로컬 CRATA 에이전트 운영센터입니다.

## 로컬 포트

- Frontend: http://localhost:3005
- Backend: http://localhost:8000
- PostgreSQL: localhost:5432

## 1차 MVP 흐름

```text
입력물 등록
-> 작업 후보 추출
-> 작업 실행
-> 승인대기 생성
-> 승인/거부
```

## 빠른 실행

```powershell
docker compose up -d postgres

cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m alembic upgrade head
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

새 터미널:

```powershell
cd frontend
npm install
npm run dev
```

접속:

```text
http://localhost:3005
```

자세한 검증 절차는 `docs/runbook.md`를 확인합니다.
```

- [ ] **Step 3: 전체 테스트 실행**

Run:

```powershell
cd backend
.\.venv\Scripts\python -m pytest -v
cd ..\frontend
npm run test
npm run build
```

Expected:

```text
backend tests passed
frontend tests passed
Compiled successfully
```

- [ ] **Step 4: 수동 실행 검증**

Run backend:

```powershell
cd backend
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Run frontend in a second terminal:

```powershell
cd frontend
npm run dev
```

Open:

```text
http://localhost:3005
```

Expected manual result:

```text
Request Intake에서 후보 카드가 생성되고, 후보 실행 후 Approval Inbox에 승인대기 항목이 보인다.
```

- [ ] **Step 5: 커밋**

```bash
git add README.md docs/runbook.md
git commit -m "docs: add local runbook"
```

---

## Self-Review

### Spec coverage

- 로컬 Next.js 웹앱 `localhost:3005`: Task 8-10.
- FastAPI 백엔드 `localhost:8000`: Task 2, Task 5-7.
- PostgreSQL + pgvector: Task 1, Task 3.
- Request Intake: Task 5, Task 10.
- 입력물 분해 그래프: Task 5.
- 에이전트 작업 실행 그래프: Task 6.
- Approval Inbox / Diff Viewer 기초: Task 7, Task 10.
- Agents / Agent Workbench 기초: Task 4, Task 9, Task 10.
- Dashboard: Task 7, Task 9.
- 디자인 토큰: Task 8.
- 실행 문서: Task 11.

### Intentional MVP gaps

- OpenAI API는 인터페이스 자리만 만들고 fallback으로 동작시킨다. 실제 OpenAI 호출은 다음 계획에서 붙인다.
- pgvector extension은 생성하지만, 실제 vector column과 임베딩 검색은 다음 계획에서 붙인다.
- LangGraph 의존성은 추가하지만, MVP runner는 DB 추적 가능한 deterministic workflow로 먼저 구현한다. 실제 `StateGraph` 구성은 다음 계획에서 확장한다.
- Agent Workbench는 상세 편집이 아니라 카드/상태 표시까지 구현한다.

### Placeholder scan

이 계획에는 자리표시자나 비어 있는 작업 지시를 남기지 않는다. 다음 단계로 미룬 항목은 “Intentional MVP gaps”에 명시했고, 현재 MVP 동작에는 필요하지 않다.

### Type consistency

백엔드 상태값은 `draft`, `running`, `pending_approval`, `approved`, `rejected`, `failed`를 사용한다. 프론트 에이전트 상태값은 `idle`, `working`, `reviewing`, `waiting_for_approval`, `approved`, `rejected`, `error`, `disabled`, `planned`를 사용한다.
