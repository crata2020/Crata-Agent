# CRATA AI Office 디자인 스펙

작성일: 2026-05-15

## 결정 요약

CRATA AI Office라는 로컬 내부 웹앱을 만든다.

1차 버전은 청하님 혼자 사용하는 운영센터다. 주요 목적은 CRATA 에이전트를 관리하고, 여러 의도가 섞인 입력물을 작업 후보로 분해하고, 선택된 작업을 LangGraph 워크플로우로 실행하고, 결과를 검토·승인·저장하는 것이다.

## 참고 자료

- Connect AI GitHub: https://github.com/wonseokjung/connect-ai
- 참고 영상: https://www.youtube.com/watch?v=jpd7gYchCbQ

Connect AI에서 참고할 요소:

- AI 직원 팀 은유.
- 에이전트 대시보드.
- 에이전트별 작업 공간.
- 승인 큐.
- 세션과 산출물 이력.
- 로컬 우선 지식·설정 관리.

CRATA에 맞게 바꿀 요소:

- 더 강한 승인 게이트.
- 공식 지식과 AI 후보의 명확한 분리.
- 상담·검사에 맞는 전문적 문체.
- 핵심 지식·승인 화면에서는 과한 게임 느낌을 줄인다.

## 제품 범위

1차 MVP 포함:

- `http://localhost:3005`에서 실행되는 로컬 Next.js 웹앱.
- `http://localhost:8000`에서 실행되는 FastAPI 백엔드.
- PostgreSQL + pgvector.
- 기본 모델 제공자로 OpenAI API 사용.
- 향후 Ollama와 LM Studio를 붙일 수 있는 모델 슬롯.
- Dashboard.
- Request Intake.
- Workflow Timeline.
- Agents / Agent Workbench.
- Approval Inbox / Diff Viewer.
- Knowledge Center.
- Sessions / Artifacts.
- Sandbox.
- Settings.
- 디자인 및 시스템 문서.

1차 MVP 제외:

- 외부 고객용 상담 챗봇.
- 로그인과 다중 사용자 권한.
- 결제.
- 모바일 앱.
- Neo4j.
- n8n 자동화.
- Telegram.
- Google Drive.
- YouTube API.
- 고도화된 PDF/DOCX 파서.
- 운영 배포 서버.

## 핵심 사용자 흐름

```text
청하님이 회의록, 전사록, 메모, 직접 요청을 입력
-> 시스템이 원문을 보존
-> 입력물 분해가 작업 후보 카드를 추출
-> 청하님이 후보를 검토
-> 선택된 후보가 실행 작업으로 전환
-> CEO가 작업을 에이전트에게 라우팅
-> 에이전트가 초안과 검토 의견 생성
-> 위험하거나 공식 반영이 필요한 항목은 승인 게이트에서 멈춤
-> 청하님이 승인, 거부, 수정 요청 중 하나를 선택
-> 시스템이 산출물, 로그, 승인된 지식을 저장
```

## 화면

### Dashboard

AI 사무실 상태판, 활성 작업, 승인 요약, 최근 산출물, 시스템 상태를 보여준다.

### Request Intake

직접 요청, 회의록, 상담 전사록, 메모, 파일을 받는다. 모든 내용을 바로 실행하지 않고 작업 후보 카드로 만든다.

작업 후보 카드 액션:

- `run`: 실행.
- `edit_then_run`: 수정 후 실행.
- `hold`: 보류.
- `delete`: 삭제.
- `split`: 분할.
- `merge`: 병합.

### Workflow Timeline

실행 중이거나 승인대기 중인 작업의 현재 단계를 보여준다.

### Agents / Agent Workbench

활성 에이전트와 준비 중인 에이전트, 역할, 프롬프트, 모델, 상태, 최근 작업, 메모리, 도구를 보여준다.

### Approval Inbox / Diff Viewer

승인 대기 항목을 수정 전/후 내용, 영향 영역, 근거, 검토 의견, 승인/거부/수정 요청 액션과 함께 보여준다.

### Knowledge Center

공식 지식, 후보 지식, 상담 사례, 결과지 문구, 저장된 산출물을 보여준다.

### Sessions / Artifacts

LangGraph 실행, 생성 결과물, 로그, 보고서를 보여준다.

### Sandbox

에이전트 결과를 공식 지식이나 후보로 저장하지 않고 테스트할 수 있다.

### Settings

OpenAI API, 향후 로컬 모델 설정, DB 상태, Git/Markdown 내보내기 경로, 기본값을 관리한다.

## 디자인 토큰

기본 방향은 전문 운영센터 70%, AI 사무실 상태판 30%다. 색상은 CRATA의 상담·검사 신뢰감을 위해 뉴트럴 배경과 딥그린을 중심으로 하고, 분석·승인·위험 상태는 별도 색으로 분리한다.

### 기본 색상

```text
app.background        #F6F7F4
app.surface           #FFFFFF
app.surfaceAlt        #EEF2EE
app.border            #D8DED8
text.primary          #1F2723
text.secondary        #5F6B64
text.muted            #8A948E
brand.primary         #1F6B57
brand.primaryHover    #195846
brand.soft            #DCEBE5
accent.analysis       #34699A
accent.approval       #C9852B
accent.knowledge      #6A5EA8
danger.primary        #B83A3A
danger.soft           #F4DADA
success.primary       #2F7D4E
success.soft          #DDF0E5
```

### 상태 색상

```text
idle                  #9AA3A0
working               #1F6B57
reviewing             #34699A
waiting_for_approval  #C9852B
approved              #2F7D4E
rejected              #B83A3A
error                 #9F2F2F
disabled              #B8C0BB
planned               #6A5EA8
```

### 에이전트 포인트 색상

```text
CRATA CEO             #1F6B57
개념수호자            #6A5EA8
결과지 에디터         #34699A
상담 코치             #2F7D4E
사례학습가            #C9852B
관계분석가            #4B7F83
품질검수관            #B83A3A
사업설계자            #7A5A2E
콘텐츠전략가          #B35C3E
운영비서              #5F6B64
```

### 타이포그래피와 형태

```text
font.sans             Pretendard, Inter, system-ui, sans-serif
font.mono             JetBrains Mono, Consolas, monospace
heading.weight        700
body.weight           400
button.weight         600
letter.spacing        0
radius.card           8px
radius.button         6px
radius.input          6px
shadow.panel          0 8px 24px rgba(31, 39, 35, 0.08)
spacing.pageX         24px
spacing.sectionY      20px
spacing.card          16px
```

컴포넌트 원칙:

- 주요 버튼은 딥그린 배경과 흰색 텍스트를 사용한다.
- 보조 버튼은 흰색 배경, 회색 테두리, 진한 텍스트를 사용한다.
- 승인대기 액션은 앰버를 사용하되, 승인 버튼 자체는 성공색을 사용한다.
- 삭제, 거부, 위험 표현은 레드 계열을 사용한다.
- 아이콘은 가능한 경우 `lucide-react`를 사용한다.
- 승인 Diff 화면은 색보다 구조와 전/후 비교 가독성을 우선한다.
- 에이전트 포인트 색상은 카드 전체 배경이 아니라 좌측 라인, 상태 점, 작은 배지에 사용한다.

## 에이전트

1차 활성 에이전트:

1. CRATA CEO
2. 개념수호자
3. 결과지 에디터
4. 상담 코치
5. 사례학습가
6. 관계분석가
7. 품질검수관

2차 확장 예정 에이전트:

8. 사업설계자
9. 콘텐츠전략가
10. 운영비서

UI에는 10개 에이전트를 모두 보여준다. 앞의 7개는 활성 상태, 뒤의 3개는 준비 중 상태로 표시한다.

## 워크플로우

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

이 워크플로우는 작업 후보만 만든다.

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

이 워크플로우는 선택된 작업을 실행하고, 승인이 필요한 경우 승인대기에서 멈춘다.

## 데이터 모델

초기 DB 테이블:

- `agents`
- `intake_items`
- `candidate_tasks`
- `tasks`
- `workflow_runs`
- `workflow_steps`
- `approvals`
- `artifacts`
- `knowledge_items`
- `documents`
- `embeddings`
- `settings`

핵심 상태값:

- `draft`
- `pending_approval`
- `approved`
- `rejected`
- `archived`
- `running`
- `failed`

반드시 지킬 분리 원칙:

```text
원문 입력물
!= 작업 후보
!= 실행 작업
!= AI 산출물
!= 승인된 공식 지식
```

## 기술 아키텍처

```text
Next.js 프론트엔드
-> FastAPI 백엔드
-> LangGraph 워크플로우
-> AI 모델 게이트웨이
-> PostgreSQL + pgvector
-> 선택적 Git/Markdown 내보내기
```

포트:

```text
frontend: http://localhost:3005
backend:  http://localhost:8000
postgres: localhost:5432
```

Docker 서비스:

- `frontend`
- `backend`
- `postgres-pgvector`

Neo4j는 1차 MVP에 포함하지 않는다. 대신 PostgreSQL의 `metadata` 필드에 관계 분석으로 확장 가능한 구조를 남겨둔다.

## 안전 및 승인 규칙

- AI 처리 전에 원문을 보존한다.
- AI 산출물은 검토 전까지 초안 또는 후보로 표시한다.
- 상담 사례가 자동으로 공식 CRATA 지식을 바꾸지 않게 한다.
- 공식 지식, 결과지 문구, 재사용 상담 원칙, 학습 후보는 승인 절차를 거친다.
- 진단적, 낙인적, 단정적, 비난적으로 들리는 상담 표현을 피한다.
- 모든 생성 결과는 작업, 워크플로우, 에이전트, 산출물, 승인 기록까지 추적 가능해야 한다.

## 성공 기준

MVP는 아래 흐름이 끝까지 작동하면 성공이다.

```text
회의록이나 전사록 붙여넣기
-> 시스템이 여러 작업 후보 추출
-> 사용자가 하나 선택
-> LangGraph가 작업을 라우팅하고 실행
-> 에이전트가 초안과 검토 의견 생성
-> 승인대기함에 결과 표시
-> 사용자가 승인 또는 거부
-> 시스템이 이력과 산출물 저장
```
