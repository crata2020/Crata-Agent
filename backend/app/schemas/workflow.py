from pydantic import BaseModel


class RunTaskResponse(BaseModel):
    task_id: str
    workflow_run_id: str
    artifact_id: str
    approval_id: str
    status: str
