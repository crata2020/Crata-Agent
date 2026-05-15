from pydantic import BaseModel, Field, field_validator


class RunTaskResponse(BaseModel):
    task_id: str
    workflow_run_id: str
    artifact_id: str
    approval_id: str
    status: str


class RunCandidateTaskResult(RunTaskResponse):
    candidate_id: str


class RunCandidateTasksRequest(BaseModel):
    candidate_ids: list[str] = Field(min_length=1)

    @field_validator("candidate_ids")
    @classmethod
    def normalize_candidate_ids(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        for candidate_id in value:
            stripped = candidate_id.strip()
            if stripped and stripped not in normalized:
                normalized.append(stripped)

        if not normalized:
            raise ValueError("At least one candidate id is required")

        return normalized


class RunCandidateTasksResponse(BaseModel):
    results: list[RunCandidateTaskResult]
