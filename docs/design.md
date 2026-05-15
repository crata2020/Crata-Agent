# CRATA AI Office Design

## Product Direction

CRATA AI Office is a local web app for Cheongha's internal use. It is an operating center for managing CRATA AI agents, not a public customer-facing service in the first version.

The first product goal is to make this loop work:

```text
Meeting notes, counseling transcripts, memos, or direct requests
-> extract candidate tasks
-> choose what to run
-> route work to agents
-> review and approve outputs
-> save the result and history
```

## UX Direction

The interface should feel like a professional AI office: practical dashboard first, visual agent presence second.

Use a mixed style:

- 70% operational dashboard: queues, approvals, logs, statuses, artifacts.
- 30% AI office: agents shown as employees with states such as idle, working, reviewing, waiting for approval, and error.

The office metaphor should help the user understand who is working on what. It should not make CRATA feel like a game or reduce trust in counseling and assessment knowledge.

## Main Screens

### Dashboard

The first screen shows:

- AI Office status board.
- Today's task queue.
- Approval summary.
- Recent artifacts.
- System health.

### Request Intake

The central input screen. It accepts:

- Direct requests.
- Meeting notes.
- Counseling transcripts.
- Memos.
- Uploaded files.

It preserves the original input, extracts multiple candidate tasks, and waits for Cheongha to choose which tasks to run.

### Workflow Timeline

Shows where a selected task is in the process:

```text
CEO routing
-> context retrieval
-> specialist draft
-> concept and quality review
-> approval pending
-> saved
```

### Agents / Agent Workbench

Shows active and planned agents, their roles, prompts, assigned model, recent work, memory, tools, and enabled state.

### Approval Inbox / Diff Viewer

Shows pending approval items with clear before/after comparison, affected knowledge area, evidence, and approve/reject actions.

### Knowledge Center

Lets the user browse official CRATA knowledge, candidate knowledge, counseling cases, report phrases, and saved artifacts.

### Sessions / Artifacts

Stores and displays LangGraph runs, agent outputs, reports, generated drafts, and execution logs.

### Sandbox

Allows testing an agent response without saving it as an official artifact or candidate knowledge.

### Settings

Manages OpenAI API, local model options, database status, Git/Markdown export paths, and default agent settings.

## Core Design Principles

- Preserve raw inputs before any AI processing.
- Separate official knowledge from AI-extracted candidates.
- Do not let counseling cases automatically become official CRATA knowledge.
- Require approval before changing official knowledge, report phrases, or reusable counseling rules.
- Make every output traceable to a task, agent, workflow run, and approval record.
- Keep visual design professional, calm, and trustworthy.
- Use the office metaphor only where it improves understanding of agent work.

## Visual Style

- Professional operations dashboard with a restrained AI office layer.
- Clear status colors for idle, working, reviewing, approval pending, approved, rejected, and error.
- No heavy game UI for core counseling or assessment screens.
- Diff views and approval screens should prioritize readability over decoration.
- Agent cards can be visually distinctive, but text and controls must remain clear and compact.

## Safety Rules

- Counseling and assessment outputs must avoid diagnostic, stigmatizing, deterministic, or shaming language.
- AI-generated claims must be marked as draft or candidate until reviewed.
- Official CRATA knowledge updates must pass concept review and user approval.
- User-provided transcripts and notes must remain traceable to raw input records.
- Sensitive data should not be exported to Git/Markdown unless explicitly approved.

## References

- Connect AI GitHub: https://github.com/wonseokjung/connect-ai
- Reference video: https://www.youtube.com/watch?v=jpd7gYchCbQ
