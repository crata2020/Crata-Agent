import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


@dataclass(frozen=True)
class EvidenceChunk:
    key: str
    text: str
    source: str
    heading: str


def retrieve_evidence(evidence_keys: list[str]) -> list[EvidenceChunk]:
    evidence_index = _load_evidence_index()
    chunks: list[EvidenceChunk] = []
    seen: set[str] = set()
    for key in evidence_keys:
        if key in seen:
            continue
        seen.add(key)
        raw_chunk = evidence_index.get(key)
        if not raw_chunk:
            continue
        chunks.append(
            EvidenceChunk(
                key=key,
                text=str(raw_chunk.get("text", "")).strip(),
                source=str(raw_chunk.get("source", "")).strip(),
                heading=str(raw_chunk.get("heading", "")).strip(),
            )
        )
    return [chunk for chunk in chunks if chunk.text]


@lru_cache(maxsize=1)
def _load_evidence_index() -> dict[str, dict]:
    evidence_dir = _repo_root() / "knowledge" / "evidence"
    index: dict[str, dict] = {}
    if not evidence_dir.exists():
        return index

    for path in sorted(evidence_dir.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            index.update({key: value for key, value in data.items() if isinstance(value, dict)})
    return index


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]
