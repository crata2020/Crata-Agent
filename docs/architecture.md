# CRATA AI Office 기술 아키텍처

## 기술 스택

```text
Next.js 프론트엔드
-> FastAPI 백엔드
-> LangGraph 워크플로우
-> AI 모델 게이트웨이
-> PostgreSQL + pgvector
-> 선택적 Git/Markdown 내보내기
```

## 로컬 포트

```text
frontend: http://localhost:3005
backend:  http://localhost:8000
postgres: localhost:5432
```

## 프론트엔드

로컬 웹앱 UI는 Next.js로 만든다.

담당 화면:

- Dashboard.
- Request Intake.
- Workflow Timeline.
- Agents / Agent Workbench.
- Approval Inbox / Diff Viewer.
- Knowledge Center.
- Sessions / Artifacts.
- Sandbox.
- Settings.

프론트엔드는 HTTP API로 백엔드와 통신한다. 워크플로우 진행 상태는 SSE 또는 polling으로 표시한다.

## 백엔드

AI와 워크플로우 처리는 FastAPI가 담당한다.

담당 업무:

- 원문 입력물 저장.
- 입력물 분해 실행.
- 작업 후보 카드 생성.
- 선택된 후보를 실행 작업으로 전환.
- LangGraph 워크플로우 실행.
- 모델 게이트웨이 호출.
- 산출물, 워크플로우 로그, 승인 기록 저장.
- 대시보드와 설정 데이터 제공.

## LangGraph

LangGraph는 작업 순서와 승인 중단 지점을 통제한다.

초기 워크플로우:

- 입력물 분해 그래프.
- 에이전트 작업 실행 그래프.

현재 입력물 분해 그래프는 실제 LangGraph `StateGraph`로 구현되어 있으며, 회의록이나 상담 전사록이 들어오면 의미 단위 분리, 규칙 힌트 수집, AI 문맥 판단, 후보 생성, 사람 검토 준비 순서로 실행된다.

LangGraph는 워크플로우 상태를 체크포인트로 저장해야 한다. 그래야 승인대기 후 이어서 실행하거나, 실패한 실행을 점검할 수 있다.

## AI 모델 게이트웨이

기본 제공자:

- OpenAI API.

향후 제공자:

- Ollama.
- LM Studio.

에이전트별로 서로 다른 모델 제공자와 모델명을 사용할 수 있게 설계한다.

## 데이터베이스

PostgreSQL과 pgvector를 사용한다.

담당 업무:

- 앱 운영 데이터.
- 워크플로우 상태.
- 에이전트 실행 로그.
- 산출물.
- 승인 기록.
- 의미 검색 임베딩.

## Git/Markdown 내보내기

Git/Markdown은 사람이 읽을 수 있는 공식 지식과 승인된 변경 이력을 남기기 위해 사용한다.

초기 내보내기 대상:

- 승인된 공식 지식.
- 승인된 결과지 문구 변경.
- 승인 이력.
- 디자인 및 시스템 문서.

민감한 원문 전사록은 기본적으로 내보내지 않는다.

## Docker

최종 로컬 실행 목표:

```text
docker compose up
```

예상 서비스:

- `frontend`
- `backend`
- `postgres-pgvector`

Neo4j는 1차 MVP에서 제외한다. 유형 조합과 관계 패턴 분석이 핵심 상품층으로 커지면 나중에 추가할 수 있다.
