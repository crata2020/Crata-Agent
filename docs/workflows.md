# CRATA LangGraph Workflows

## Workflow 1: 입력물 분해 그래프

Purpose: turn long or mixed input into candidate task cards.

This workflow handles meeting notes, counseling transcripts, memos, pasted text, and uploaded files. It does not execute the extracted tasks. It only creates candidate tasks for Cheongha to review.

Steps:

```text
입력물 받기
-> 원문 그대로 저장
-> 입력물 종류 판단
-> 요청 후보 추출
-> 비슷한 후보 병합
-> 작업 후보 카드 생성
-> 청하님 선택 대기
```

Candidate task types:

- report_phrase_revision
- counseling_case_learning
- official_knowledge_candidate
- relationship_pattern_analysis
- business_planning
- content_marketing
- operations_task
- general_agent_task

Candidate task actions:

- run
- edit_then_run
- hold
- delete
- split
- merge

Key rule: an input item is not a task. A candidate task is not an executed task. Only user-selected candidate tasks become executable tasks.

## Workflow 2: 에이전트 작업 실행 그래프

Purpose: run one selected task through the CRATA agent team.

Steps:

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

Default agent paths:

```text
Report phrase task
-> CRATA CEO
-> Concept Guardian
-> Report Editor
-> Quality Inspector
-> Approval Inbox

Counseling transcript task
-> CRATA CEO
-> Case Learner
-> Relationship Analyst
-> Quality Inspector
-> Approval Inbox

Counseling answer test
-> CRATA CEO
-> Concept Guardian
-> Counseling Coach
-> Quality Inspector
-> Artifact

Official knowledge update candidate
-> CRATA CEO
-> Concept Guardian
-> Quality Inspector
-> Approval Inbox
```

## Approval Gate

Tasks that affect official knowledge, report phrases, reusable counseling rules, or learning candidates must stop at approval.

Approval outcomes:

- approved: save as approved artifact and optionally export to Git/Markdown.
- rejected: save rejection reason and keep original draft for traceability.
- revise_requested: return to the appropriate agent with review notes.

## Checkpointing

Each workflow run should persist:

- input item id
- candidate task id or task id
- current step
- selected agents
- prompt context references
- model calls
- generated output
- review notes
- approval state
- artifact ids

This allows the workflow to resume after approval, inspect past decisions, and debug failed runs.
