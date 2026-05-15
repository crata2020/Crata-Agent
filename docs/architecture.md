# CRATA AI Office Architecture

## Stack

```text
Next.js frontend
-> FastAPI backend
-> LangGraph workflows
-> AI model gateway
-> PostgreSQL + pgvector
-> optional Git/Markdown export
```

## Local Ports

```text
frontend: http://localhost:3005
backend:  http://localhost:8000
postgres: localhost:5432
```

## Frontend

Use Next.js for the local web app UI.

Responsibilities:

- Dashboard
- Request Intake
- Workflow Timeline
- Agents / Agent Workbench
- Approval Inbox / Diff Viewer
- Knowledge Center
- Sessions / Artifacts
- Sandbox
- Settings

The frontend should communicate with the backend through HTTP APIs and use SSE or polling for workflow progress.

## Backend

Use FastAPI for the AI and workflow backend.

Responsibilities:

- Persist raw intake items.
- Run input decomposition.
- Create candidate task cards.
- Convert selected candidates into executable tasks.
- Run LangGraph workflows.
- Call the model gateway.
- Save artifacts, workflow logs, and approval records.
- Serve dashboard and settings data.

## LangGraph

Use LangGraph to control workflow order and approval stops.

Initial workflows:

- 입력물 분해 그래프.
- 에이전트 작업 실행 그래프.

LangGraph should checkpoint workflow state so approval pauses and failures can be resumed or inspected.

## AI Model Gateway

Default provider:

- OpenAI API.

Future providers:

- Ollama.
- LM Studio.

Each agent should eventually be able to use a different model provider and model name.

## Database

Use PostgreSQL with pgvector.

Responsibilities:

- App data.
- Workflow state.
- Agent run logs.
- Artifacts.
- Approval records.
- Semantic search embeddings.

## Git/Markdown Export

Use Git/Markdown for human-readable official knowledge and approved history exports.

Initial export areas:

- approved official knowledge
- approved report phrase changes
- approval history
- design and system documents

Do not export sensitive raw transcripts by default.

## Docker

Target final local startup:

```text
docker compose up
```

Expected services:

- frontend
- backend
- postgres-pgvector

Neo4j is intentionally excluded from the MVP. It can be added later if type-pair relationship analysis becomes a core product layer.
