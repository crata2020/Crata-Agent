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
    rule_hint_task_type: str | None = None
    ai_task_type: str
    classification_source: str
    classification_status: str
    confidence: float
    classification_reason: str
    approval_required: bool
    rule_hints: list[str]
    review_flags: list[str]
    clarifying_questions: list[str] = Field(default_factory=list)


class GraphNodeTraceRead(BaseModel):
    name: str
    status: str
    summary: str


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


class CandidateTaskSplit(BaseModel):
    parts: list[str] = Field(min_length=2, max_length=8)

    @field_validator("parts")
    @classmethod
    def normalize_parts(cls, value: list[str]) -> list[str]:
        normalized = []
        for part in value:
            stripped = part.strip()
            if stripped:
                normalized.append(stripped)

        if len(normalized) < 2:
            raise ValueError("At least two non-empty split parts are required")

        return normalized


class CandidateTaskSplitRead(BaseModel):
    original_candidate: CandidateTaskRead
    split_candidates: list[CandidateTaskRead]


class IntakeRead(BaseModel):
    id: str
    title: str
    input_type: str
    raw_content: str
    decomposition_graph_name: str | None = None
    human_review_required: bool = False
    decomposition_trace: list[GraphNodeTraceRead] = Field(default_factory=list)
    candidate_tasks: list[CandidateTaskRead]
