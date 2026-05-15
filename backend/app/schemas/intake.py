from pydantic import BaseModel, Field, field_validator


class IntakeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    input_type: str = Field(default="auto", max_length=60)
    raw_content: str = Field(min_length=1)
    source: str = Field(default="manual", max_length=120)

    @field_validator("title", "raw_content", "input_type", "source", mode="before")
    @classmethod
    def strip_string_fields(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class CandidateTaskRead(BaseModel):
    id: str
    task_type: str
    title: str
    summary: str
    evidence_excerpt: str
    recommended_agents: list[str]
    status: str


class CandidateTaskUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    summary: str = Field(min_length=1)
    recommended_agents: list[str] = Field(min_length=1)

    @field_validator("title", "summary", mode="before")
    @classmethod
    def strip_text_fields(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("recommended_agents")
    @classmethod
    def normalize_recommended_agents(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        for agent in value:
            stripped = agent.strip()
            if stripped and stripped not in normalized:
                normalized.append(stripped)

        if not normalized:
            raise ValueError("At least one recommended agent is required")

        return normalized


class IntakeRead(BaseModel):
    id: str
    title: str
    input_type: str
    raw_content: str
    candidate_tasks: list[CandidateTaskRead]
