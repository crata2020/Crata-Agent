import json
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.models import Agent


def _load_agent_seeds() -> list[dict[str, Any]]:
    repo_root = Path(__file__).resolve().parents[3]
    seeds_path = repo_root / "shared" / "agent-seeds.json"
    return json.loads(seeds_path.read_text(encoding="utf-8"))


AGENT_SEEDS = _load_agent_seeds()


def seed_agents(db: Session) -> None:
    for seed in AGENT_SEEDS:
        if db.get(Agent, seed["id"]) is not None:
            continue

        db.add(Agent(**seed, prompt=""))

    db.commit()
