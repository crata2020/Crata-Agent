import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class TaskPlaybook:
    id: str
    name: str
    default_sections: list[str] = field(default_factory=list)
    required_inputs: list[str] = field(default_factory=list)
    rules: list[str] = field(default_factory=list)
    operations: list[str] = field(default_factory=list)


def load_task_playbook(playbook_id: str | None) -> TaskPlaybook | None:
    if not playbook_id or not playbook_id.isidentifier():
        return None

    path = _playbook_dir() / f"{playbook_id}.json"
    if not path.exists() or not path.is_file():
        return None

    return _load_playbook_from_path(path)


@lru_cache(maxsize=32)
def _load_playbook_from_path(path: Path) -> TaskPlaybook:
    data: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return TaskPlaybook(
        id=str(data.get("id", path.stem)),
        name=str(data.get("name", data.get("id", path.stem))),
        default_sections=[str(value) for value in data.get("default_sections", [])],
        required_inputs=[str(value) for value in data.get("required_inputs", [])],
        rules=[str(value) for value in data.get("rules", [])],
        operations=[str(value) for value in data.get("operations", [])],
    )


def _playbook_dir() -> Path:
    return Path(__file__).resolve().parents[1] / "config" / "task_playbooks"
