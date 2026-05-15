from pydantic import BaseModel, Field


class IntakeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    input_type: str = Field(default="memo", max_length=60)
    raw_content: str = Field(min_length=1)
    source: str = Field(default="manual", max_length=120)


class CandidateTaskRead(BaseModel):
    id: str
    task_type: str
    title: str
    summary: str
    evidence_excerpt: str
    recommended_agents: list[str]
    status: str


class IntakeRead(BaseModel):
    id: str
    title: str
    input_type: str
    raw_content: str
    candidate_tasks: list[CandidateTaskRead]
