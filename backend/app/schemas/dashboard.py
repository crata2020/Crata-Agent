from pydantic import BaseModel, Field
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
