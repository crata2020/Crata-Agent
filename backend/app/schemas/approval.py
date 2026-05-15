from pydantic import BaseModel, Field, model_validator

from app.schemas.intake import CandidateTaskRead


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
    revision_candidate_task: CandidateTaskRead | None = None


class ApprovalDecision(BaseModel):
    decision: str = Field(pattern="^(approved|rejected|revise_requested)$")
    reason: str = ""

    @model_validator(mode="after")
    def require_revision_reason(self) -> "ApprovalDecision":
        self.reason = self.reason.strip()
        if self.decision == "revise_requested" and not self.reason:
            raise ValueError("Revision reason is required")

        return self
