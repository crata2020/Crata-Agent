# CRATA Agent Structure

## First MVP: Active Agents

### 1. CRATA CEO

Owns routing and orchestration.

Responsibilities:

- Classify user requests and extracted candidate tasks.
- Decide which agents should work on a task.
- Select the correct workflow.
- Decide whether approval is required.
- Summarize final outputs.
- Keep task history understandable.

### 2. Concept Guardian

Owns official CRATA knowledge and conceptual consistency.

Responsibilities:

- Manage assessment concepts and type definitions.
- Provide evidence from official CRATA knowledge.
- Check whether a draft conflicts with official knowledge.
- Distinguish official knowledge from counseling-case observations.
- Review proposed updates before approval.

Korean display name: 개념수호자.

### 3. Report Editor

Owns assessment report wording.

Responsibilities:

- Draft and revise assessment result phrases.
- Adjust tone for adult, youth, child, parent, organization, or institution use.
- Create before/after wording.
- Keep report phrases aligned with official concepts.
- Prepare output for approval.

Korean display name: 결과지 에디터.

### 4. Counseling Coach

Owns type-based counseling answer drafts and chatbot testing.

Responsibilities:

- Draft counseling-style responses from type, counterpart type, and relationship context.
- Suggest practical conversation phrases.
- Test chatbot-like responses internally.
- Avoid making official knowledge updates directly.

Korean display name: 상담 코치.

### 5. Case Learner

Owns counseling transcript processing and learning candidates.

Responsibilities:

- Preserve and anonymize counseling transcripts.
- Extract case facts, type information, emotions, behaviors, relationship context, and patterns.
- Save counseling cases as cases, not official knowledge.
- Generate learning candidates for review.

Korean display name: 사례학습가.

### 6. Relationship Analyst

Owns type-pair and interaction-pattern analysis.

Responsibilities:

- Analyze type combinations.
- Identify relationship context patterns.
- Extract repeated interaction loops.
- Connect observed patterns to candidate interventions.
- Prepare future graph-style relationship data.

Korean display name: 관계분석가.

### 7. Quality Inspector

Owns safety, tone, structure, and approval readiness.

Responsibilities:

- Check for stigmatizing, diagnostic, deterministic, or unsafe language.
- Check answer format and length.
- Check whether approval is required.
- Block official updates that have not been approved.
- Produce review notes for the approval inbox.

Korean display name: 품질검수관.

## Planned Expansion Agents

### 8. Business Designer

Planned agent for proposals, products, programs, workshops, pricing, institutional plans, and service packaging.

Korean display name: 사업설계자.

### 9. Content Strategist

Planned agent for marketing, YouTube, blog, homepage copy, campaign ideas, and content reporting.

Korean display name: 콘텐츠전략가.

### 10. Operations Secretary

Planned agent for daily briefing, approval summaries, task priority, automation, and future Telegram/n8n integration.

Korean display name: 운영비서.

## Agent Statuses

Agents can have these runtime states:

- idle
- working
- reviewing
- waiting_for_approval
- approved
- rejected
- error
- disabled
- planned

## Agent Design Rule

Agents are not allowed to silently modify official knowledge. They can produce drafts, candidates, and review notes. Only an approved workflow can change official CRATA knowledge or report wording.
