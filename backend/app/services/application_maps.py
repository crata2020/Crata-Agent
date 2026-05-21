import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ApplicationValueProposition:
    title: str
    based_on: str
    program_use: str
    module: str


@dataclass(frozen=True)
class ApplicationMap:
    id: str
    name: str
    exam: str
    application: str
    audience: str | None
    value_propositions: list[ApplicationValueProposition] = field(default_factory=list)
    rules: list[str] = field(default_factory=list)


def load_application_map(*, exam: str | None, output_type: str | None) -> ApplicationMap | None:
    if exam == "group_behavior" and output_type == "school_program":
        return _load_application_map_file("group_behavior_school_program")
    return None


@lru_cache(maxsize=16)
def _load_application_map_file(map_id: str) -> ApplicationMap | None:
    path = _application_map_dir() / f"{map_id}.json"
    if not path.exists():
        return None

    data: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return ApplicationMap(
        id=str(data.get("id", path.stem)),
        name=str(data.get("name", data.get("id", path.stem))),
        exam=str(data.get("exam", "")),
        application=str(data.get("application", "")),
        audience=data.get("audience"),
        value_propositions=[
            ApplicationValueProposition(
                title=str(raw_value.get("title", "")),
                based_on=str(raw_value.get("based_on", "")),
                program_use=str(raw_value.get("program_use", "")),
                module=str(raw_value.get("module", "")),
            )
            for raw_value in data.get("value_propositions", [])
            if isinstance(raw_value, dict)
        ],
        rules=[str(rule) for rule in data.get("rules", [])],
    )


def _application_map_dir() -> Path:
    return Path(__file__).resolve().parents[3] / "knowledge" / "application_maps"
