from pydantic import BaseModel, Field


class ApprovalRead(BaseModel):
    id: str
    task_id: str
    artifact_id: str
    approval_type: str
    status: str
    title: str
    summary: str
    before_content: str
    after_content: str
    affected_area: str
    reviewer_note: str


class ApprovalDecision(BaseModel):
    decision: str = Field(pattern="^(approved|rejected|revise_requested)$")
    reason: str = ""
