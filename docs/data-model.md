# CRATA Data Model Draft

This is intentionally a first-pass model. It should support a working MVP while leaving room for later schema changes.

## Storage Strategy

```text
PostgreSQL + pgvector
= operating data, workflow state, artifacts, and semantic search

Git/Markdown
= human-readable official knowledge exports and approved change history

Neo4j
= not included in MVP; possible future addition for advanced type relationship graphs
```

## Core Tables

### agents

Stores agent definitions, role, status, model routing, and configuration.

Important fields:

- id
- name
- display_name
- role
- description
- status
- default_model_provider
- default_model_name
- prompt
- enabled
- created_at
- updated_at

### intake_items

Stores raw inputs such as meeting notes, counseling transcripts, memos, and files.

Important fields:

- id
- title
- input_type
- raw_content
- source
- metadata
- created_at

### candidate_tasks

Stores extracted task candidates from an intake item.

Important fields:

- id
- intake_item_id
- task_type
- title
- summary
- evidence_excerpt
- recommended_agents
- status
- metadata
- created_at
- updated_at

### tasks

Stores tasks selected by Cheongha for execution.

Important fields:

- id
- candidate_task_id
- task_type
- title
- description
- status
- priority
- assigned_agents
- created_at
- updated_at

### workflow_runs

Stores LangGraph run records.

Important fields:

- id
- workflow_type
- task_id
- status
- current_step
- checkpoint
- started_at
- completed_at
- error

### workflow_steps

Stores step-level execution history.

Important fields:

- id
- workflow_run_id
- step_name
- agent_id
- input_summary
- output_summary
- status
- started_at
- completed_at
- metadata

### approvals

Stores approval decisions.

Important fields:

- id
- task_id
- artifact_id
- approval_type
- status
- title
- summary
- before_content
- after_content
- affected_area
- reviewer_note
- decision_reason
- decided_at
- created_at

### artifacts

Stores outputs produced by agents.

Important fields:

- id
- task_id
- workflow_run_id
- artifact_type
- title
- content
- status
- metadata
- created_at
- updated_at

### knowledge_items

Stores official knowledge, candidate knowledge, report phrases, counseling principles, and case-derived candidates.

Important fields:

- id
- knowledge_type
- title
- content
- status
- source_artifact_id
- source_approval_id
- metadata
- created_at
- updated_at

### documents

Stores uploaded files and exported Markdown records.

Important fields:

- id
- title
- document_type
- path
- content_text
- metadata
- created_at

### embeddings

Stores pgvector embeddings for search.

Important fields:

- id
- owner_type
- owner_id
- embedding
- text_chunk
- metadata
- created_at

### settings

Stores application settings.

Important fields:

- id
- key
- value
- is_secret
- updated_at

## Core Status Values

Use these across candidate tasks, tasks, artifacts, approvals, and knowledge items where applicable:

- draft
- pending_approval
- approved
- rejected
- archived
- running
- failed

## Key Separation Rule

These must remain separate entities:

```text
Raw input
!= candidate task
!= executable task
!= AI artifact
!= approved official knowledge
```

This prevents meeting notes, counseling observations, or AI summaries from becoming official CRATA knowledge without review.

## Future Normalization

For the MVP, type, emotion, behavior, context, pattern, and intervention details can live in metadata JSON. Once repeated patterns are clear, they can be promoted into normalized tables or moved into Neo4j.
