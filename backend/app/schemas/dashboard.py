from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal


class DashboardSummary(BaseModel):
    agent_count: int
    active_agent_count: int
    candidate_task_count: int
    running_task_count: int
    pending_approval_count: int
    artifact_count: int


AgentActivityStatus = Literal["working", "waiting_approval", "queued", "idle", "planned"]
AgentWorkItemSource = Literal["candidate", "task", "approval"]


class AgentWorkItemRead(BaseModel):
    id: str
    source_type: AgentWorkItemSource
    title: str
    summary: str
    task_type: str
    status: str
    href: str
    activity_href: str | None = None


class AgentActivityRead(BaseModel):
    id: str
    display_name: str
    role: str
    color: str
    enabled: bool
    status: str
    activity_status: AgentActivityStatus
    current_focus: str
    current_task_title: str | None = None
    current_task_type: str | None = None
    workload_count: int
    pending_approval_count: int
    candidate_count: int
    work_items: list[AgentWorkItemRead] = Field(default_factory=list)


class AgentActivityResponse(BaseModel):
    agents: list[AgentActivityRead]


class WorkflowStepRead(BaseModel):
    id: str
    step_name: str
    agent_id: str | None
    input_summary: str
    output_summary: str
    status: str
    started_at: datetime
    completed_at: datetime | None = None


class WorkflowGraphNodeRead(BaseModel):
    name: str
    status: str
    summary: str


class WorkflowRunRead(BaseModel):
    id: str
    workflow_type: str
    task_id: str | None
    task_title: str | None = None
    task_type: str | None = None
    status: str
    current_step: str
    graph_name: str | None = None
    started_at: datetime
    completed_at: datetime | None = None
    node_trace: list[WorkflowGraphNodeRead] = Field(default_factory=list)
    steps: list[WorkflowStepRead] = Field(default_factory=list)


class WorkflowActivityResponse(BaseModel):
    runs: list[WorkflowRunRead]


class RequestMapAgentRead(BaseModel):
    id: str
    display_name: str
    color: str
    status: str


class RequestMapTaskRead(BaseModel):
    id: str
    task_id: str | None = None
    workflow_run_id: str | None = None
    approval_id: str | None = None
    revision_source_approval_id: str | None = None
    revision_source_candidate_id: str | None = None
    revision_source_task_id: str | None = None
    revision_reason: str | None = None
    revision_candidate_id: str | None = None
    revision_candidate_title: str | None = None
    revision_candidate_href: str | None = None
    revision_candidate_status: str | None = None
    revision_candidate_task_id: str | None = None
    revision_candidate_workflow_run_id: str | None = None
    revision_candidate_activity_href: str | None = None
    revision_candidate_approval_id: str | None = None
    revision_candidate_approval_href: str | None = None
    task_type: str
    title: str
    summary: str
    status: str
    current_step: str | None = None
    current_step_index: int = 0
    total_steps: int = 4
    href: str
    activity_href: str | None = None
    agents: list[RequestMapAgentRead] = Field(default_factory=list)
    steps: list[WorkflowStepRead] = Field(default_factory=list)


class RequestMapItemRead(BaseModel):
    id: str
    title: str
    input_type: str
    raw_preview: str
    created_at: datetime
    decomposition_trace: list[WorkflowGraphNodeRead] = Field(default_factory=list)
    candidates: list[RequestMapTaskRead] = Field(default_factory=list)


class RequestMapResponse(BaseModel):
    items: list[RequestMapItemRead]
