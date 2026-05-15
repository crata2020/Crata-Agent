# CRATA AI Office Design Spec

Date: 2026-05-15

## Decision Summary

Build a local internal web app named CRATA AI Office.

The first version is for Cheongha's personal use only. It will be a local operating center for managing CRATA AI agents, decomposing mixed inputs into actionable tasks, running selected tasks through LangGraph workflows, reviewing outputs, and saving approved results.

## Reference Material

- Connect AI GitHub: https://github.com/wonseokjung/connect-ai
- Reference video: https://www.youtube.com/watch?v=jpd7gYchCbQ

Adopt from Connect AI:

- AI employee/team metaphor.
- Agent dashboard.
- Agent-specific workspaces.
- Approval queue.
- Session and artifact history.
- Local-first knowledge and settings mindset.

Adapt for CRATA:

- Stronger approval gates.
- Clear separation between official knowledge and AI candidates.
- Professional counseling/assessment tone.
- Less playful UI for core knowledge and approval screens.

## Product Scope

First MVP includes:

- Local Next.js web app on `http://localhost:3005`.
- FastAPI backend on `http://localhost:8000`.
- PostgreSQL + pgvector.
- OpenAI API as default model provider.
- Future model slots for Ollama and LM Studio.
- Dashboard.
- Request Intake.
- Workflow Timeline.
- Agents / Agent Workbench.
- Approval Inbox / Diff Viewer.
- Knowledge Center.
- Sessions / Artifacts.
- Sandbox.
- Settings.
- Design and system documents.

First MVP excludes:

- Public customer chatbot.
- Login and multi-user permissions.
- Payment.
- Mobile app.
- Neo4j.
- n8n automation.
- Telegram.
- Google Drive.
- YouTube API.
- Full PDF/DOCX parser.
- Production deployment.

## Core User Flow

```text
Cheongha enters meeting notes, transcript, memo, or direct request
-> system preserves raw input
-> input decomposition extracts candidate task cards
-> Cheongha reviews candidates
-> selected candidates become executable tasks
-> CEO routes task to agents
-> agents draft and review
-> approval gate stops risky changes
-> Cheongha approves, rejects, or requests revision
-> system saves artifact, logs, and approved knowledge if applicable
```

## Screens

### Dashboard

Shows the AI office status board, active tasks, approval summary, recent artifacts, and system health.

### Request Intake

Accepts direct requests, meeting notes, counseling transcripts, memos, and files. It creates candidate task cards rather than executing everything automatically.

Candidate task card actions:

- run
- edit then run
- hold
- delete
- split
- merge

### Workflow Timeline

Shows workflow progress and current step for each running or paused task.

### Agents / Agent Workbench

Shows active and planned agents, role, prompt, model, status, recent work, memory, and tools.

### Approval Inbox / Diff Viewer

Shows pending approval items with before/after content, affected area, evidence, reviewer notes, and approve/reject/revise actions.

### Knowledge Center

Shows official knowledge, candidate knowledge, counseling cases, report phrases, and saved artifacts.

### Sessions / Artifacts

Shows LangGraph runs, generated outputs, logs, and reports.

### Sandbox

Allows testing an agent without saving output as official knowledge or a candidate.

### Settings

Manages OpenAI API, future local model settings, database status, Git/Markdown export path, and defaults.

## Agents

Active MVP agents:

1. CRATA CEO
2. Concept Guardian / 개념수호자
3. Report Editor / 결과지 에디터
4. Counseling Coach / 상담 코치
5. Case Learner / 사례학습가
6. Relationship Analyst / 관계분석가
7. Quality Inspector / 품질검수관

Planned expansion agents:

8. Business Designer / 사업설계자
9. Content Strategist / 콘텐츠전략가
10. Operations Secretary / 운영비서

The UI should show all ten agents. The first seven are active; the last three are marked as planned or preparation status.

## Workflows

### 입력물 분해 그래프

```text
입력물 받기
-> 원문 그대로 저장
-> 입력물 종류 판단
-> 요청 후보 추출
-> 비슷한 후보 병합
-> 작업 후보 카드 생성
-> 청하님 선택 대기
```

This workflow only creates candidate tasks.

### 에이전트 작업 실행 그래프

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

This workflow executes selected tasks and stops at approval when needed.

## Data Model

Initial database tables:

- agents
- intake_items
- candidate_tasks
- tasks
- workflow_runs
- workflow_steps
- approvals
- artifacts
- knowledge_items
- documents
- embeddings
- settings

Core statuses:

- draft
- pending_approval
- approved
- rejected
- archived
- running
- failed

Mandatory separation:

```text
Raw input
!= candidate task
!= executable task
!= AI artifact
!= approved official knowledge
```

## Architecture

```text
Next.js frontend
-> FastAPI backend
-> LangGraph workflows
-> AI model gateway
-> PostgreSQL + pgvector
-> optional Git/Markdown export
```

Ports:

```text
frontend: http://localhost:3005
backend:  http://localhost:8000
postgres: localhost:5432
```

Docker services:

- frontend
- backend
- postgres-pgvector

Neo4j is not in the first MVP. PostgreSQL metadata fields should preserve enough structure to migrate relationship data later if needed.

## Safety and Approval Rules

- Preserve raw inputs before AI processing.
- Mark AI outputs as draft or candidate until reviewed.
- Do not let counseling cases automatically update official CRATA knowledge.
- Require approval for official knowledge, report phrases, reusable counseling rules, and learning candidates.
- Avoid diagnostic, stigmatizing, deterministic, or shaming counseling language.
- Keep all generated outputs traceable to task, workflow, agent, artifact, and approval records.

## Success Criteria

The MVP is successful when this works end to end:

```text
Paste meeting notes or transcript
-> system extracts multiple candidate tasks
-> user selects one
-> LangGraph routes and runs the task
-> agents produce draft and review notes
-> approval inbox shows result
-> user approves or rejects
-> system saves history and artifact
```
