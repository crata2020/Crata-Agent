# CRATA AI Office 디자인 문서

## 제품 방향

CRATA AI Office는 청하님 혼자 사용하는 로컬 웹앱이다. 1차 버전은 외부 고객용 서비스가 아니라, CRATA 에이전트를 관리하고 실행 결과를 검수하는 내부 운영센터다.

첫 번째 목표는 아래 흐름이 실제로 작동하게 만드는 것이다.

```text
회의록, 상담 전사록, 메모, 직접 요청 입력
-> 작업 후보 추출
-> 실행할 작업 선택
-> 에이전트에게 작업 배정
-> 결과 검토 및 승인
-> 결과물과 이력 저장
```

## UX 방향

화면은 전문적인 AI 사무실처럼 느껴져야 한다. 실무 대시보드가 중심이고, 에이전트가 직원처럼 일하는 느낌은 보조적으로 사용한다.

권장 비율은 다음과 같다.

- 70% 운영 대시보드: 작업 큐, 승인대기, 실행 로그, 상태, 산출물.
- 30% AI 사무실: 에이전트를 직원처럼 보여주고 대기, 작업중, 검수중, 승인대기, 오류 상태를 표현.

사무실 은유는 “누가 어떤 일을 하고 있는지” 이해하기 쉽게 만들기 위한 장치다. 상담·검사 지식의 신뢰감을 떨어뜨릴 정도로 게임처럼 보여서는 안 된다.

## 주요 화면

### Dashboard

첫 화면이다. 다음 정보를 보여준다.

- AI Office 상태판.
- 오늘의 작업 큐.
- 승인 대기 요약.
- 최근 산출물.
- 시스템 상태.

### Request Intake

가장 중요한 입력 화면이다. 다음 입력을 받는다.

- 직접 요청.
- 회의록.
- 상담 전사록.
- 메모.
- 업로드 파일.

원문을 먼저 저장한 뒤, 여러 개의 작업 후보를 추출하고, 청하님이 실행할 작업을 선택할 때까지 기다린다.

### Workflow Timeline

선택된 작업이 현재 어느 단계에 있는지 보여준다.

```text
CEO 라우팅
-> 관련 지식 검색
-> 담당 에이전트 초안 작성
-> 개념 및 품질 검수
-> 승인대기
-> 저장
```

### Agents / Agent Workbench

활성 에이전트와 준비 중인 에이전트를 보여준다. 각 에이전트의 역할, 프롬프트, 배정 모델, 최근 작업, 메모리, 도구, 활성화 상태를 관리한다.

### Approval Inbox / Diff Viewer

승인 대기 항목을 보여준다. 수정 전/후 비교, 영향을 받는 지식 영역, 근거, 승인/거부 액션을 명확하게 제공한다.

### Knowledge Center

공식 CRATA 지식, 후보 지식, 상담 사례, 결과지 문구, 저장된 산출물을 탐색하는 화면이다.

### Sessions / Artifacts

LangGraph 실행 기록, 에이전트 산출물, 보고서, 초안, 실행 로그를 저장하고 보여준다.

### Sandbox

에이전트 답변을 공식 산출물이나 후보 지식으로 저장하지 않고 테스트하는 화면이다.

### Settings

OpenAI API, 로컬 모델 옵션, DB 상태, Git/Markdown 내보내기 경로, 기본 에이전트 설정을 관리한다.

## 핵심 디자인 원칙

- AI 처리 전에 원문을 반드시 보존한다.
- 공식 지식과 AI가 추출한 후보를 분리한다.
- 상담 사례가 자동으로 공식 CRATA 지식이 되지 않게 한다.
- 공식 지식, 결과지 문구, 재사용 상담 원칙을 바꾸기 전에는 반드시 승인 절차를 거친다.
- 모든 결과물은 작업, 에이전트, 워크플로우 실행, 승인 기록까지 추적 가능해야 한다.
- 시각 디자인은 전문적이고 차분하며 신뢰감이 있어야 한다.
- 사무실 은유는 에이전트 업무 이해에 도움이 되는 범위에서만 사용한다.

## 시각 스타일

- 전문 운영센터에 절제된 AI 사무실 레이어를 더한다.
- 상태 색상은 대기, 작업중, 검수중, 승인대기, 승인됨, 거부됨, 오류를 명확히 구분한다.
- 상담·검사 핵심 화면에는 과한 게임 UI를 쓰지 않는다.
- 비교 화면과 승인 화면은 장식보다 가독성을 우선한다.
- 에이전트 카드는 개성을 줄 수 있지만, 텍스트와 조작 요소는 명확하고 작게 유지한다.

## 디자인 토큰

### 기본 색상

CRATA의 기본 화면은 신뢰감 있는 뉴트럴 배경과 딥그린 중심으로 잡는다. 승인, 분석, 위험 상태는 별도 색으로 분리해 한 가지 색만 반복되는 느낌을 피한다.

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

### 에이전트 상태 색상

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

### 에이전트별 포인트 색상

각 에이전트 카드는 전체 배경을 강하게 칠하지 않고, 좌측 라인·상태 점·작은 배지에만 포인트 색상을 사용한다.

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

### 타이포그래피

```text
font.sans             Pretendard, Inter, system-ui, sans-serif
font.mono             JetBrains Mono, Consolas, monospace
heading.weight        700
body.weight           400
button.weight         600
letter.spacing        0
```

화면 제목은 크게 쓰되, 카드와 패널 안의 제목은 작고 촘촘하게 유지한다. 버튼 안 텍스트가 줄바꿈 없이 넘치지 않게 최소 너비와 반응형 처리를 둔다.

### 레이아웃과 형태

```text
radius.card           8px
radius.button         6px
radius.input          6px
shadow.panel          0 8px 24px rgba(31, 39, 35, 0.08)
spacing.pageX         24px
spacing.sectionY      20px
spacing.card          16px
```

카드는 개별 항목, 승인 항목, 에이전트 항목에만 사용한다. 페이지 전체 섹션을 카드처럼 겹겹이 감싸지 않는다.

### 컴포넌트 원칙

- 주요 버튼은 딥그린 배경과 흰색 텍스트를 사용한다.
- 보조 버튼은 흰색 배경, 회색 테두리, 진한 텍스트를 사용한다.
- 승인대기 액션은 앰버를 사용하되, 승인 버튼 자체는 성공색을 사용한다.
- 삭제, 거부, 위험 표현은 레드 계열을 사용한다.
- 아이콘은 가능한 경우 `lucide-react`를 사용한다.
- 익숙한 기능은 텍스트보다 아이콘+툴팁을 우선한다.
- 승인 Diff 화면은 색보다 구조와 전/후 비교 가독성을 우선한다.

## 안전 규칙

- 상담·검사 결과물은 진단적, 낙인적, 단정적, 비난적으로 들리는 표현을 피한다.
- AI 생성 내용은 검토 전까지 초안 또는 후보로 표시한다.
- 공식 CRATA 지식 변경은 개념 검토와 사용자 승인을 통과해야 한다.
- 사용자가 제공한 전사록과 메모는 원문 기록까지 추적 가능해야 한다.
- 민감 정보는 명시적 승인 없이는 Git/Markdown으로 내보내지 않는다.

## 참고 자료

- Connect AI GitHub: https://github.com/wonseokjung/connect-ai
- 참고 영상: https://www.youtube.com/watch?v=jpd7gYchCbQ
