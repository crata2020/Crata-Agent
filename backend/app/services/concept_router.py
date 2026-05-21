import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Literal


Confidence = Literal["high", "medium", "low"]


@dataclass(frozen=True)
class AxisCandidate:
    axis: str
    score: int
    matched_signals: list[str]


@dataclass(frozen=True)
class TypeCandidate:
    axis: str
    type: str
    score: int
    confidence: Confidence
    matched_signals: list[str]
    confused_with: list[str]


@dataclass(frozen=True)
class ConceptResult:
    exam: str | None
    reference: str | None
    axis_candidates: list[AxisCandidate]
    type_candidates: list[TypeCandidate]
    confidence: Confidence
    needs_clarification: bool
    clarifying_questions: list[str]
    evidence_keys: list[str]


def classify_concept(
    *,
    query: str,
    task_type: str,
    candidate_summary: str | None = None,
    evidence_excerpt: str | None = None,
) -> ConceptResult:
    text = "\n".join(
        part
        for part in (task_type, query, candidate_summary or "", evidence_excerpt or "")
        if part
    )
    if not text.strip():
        return _empty_result()

    scored_results = [_classify_map(concept_map=concept_map, text=text) for concept_map in _load_concept_maps()]
    scored_results = [result for result in scored_results if result.type_candidates or result.axis_candidates]
    if not scored_results:
        return _empty_result()

    return max(scored_results, key=lambda result: _result_score(result))


def _classify_map(*, concept_map: dict, text: str) -> ConceptResult:
    type_scores: list[tuple[dict, dict, int, list[str], list[str]]] = []
    axis_scores: dict[str, tuple[int, list[str]]] = {}

    for axis in concept_map.get("axes", []):
        axis_id = str(axis.get("id", ""))
        for type_def in axis.get("types", []):
            score, matched, anti_matched = _score_type(type_def=type_def, text=text)
            if score <= 0:
                continue
            type_scores.append((axis, type_def, score, matched, anti_matched))
            current_score, current_matched = axis_scores.get(axis_id, (0, []))
            axis_scores[axis_id] = (current_score + score, [*current_matched, *matched])

    alias_matches = _matched_terms(concept_map.get("aliases", []), text)
    if alias_matches and not type_scores:
        axis_candidates: list[AxisCandidate] = []
        return ConceptResult(
            exam=str(concept_map.get("id")),
            reference=str(concept_map.get("reference", "")) or None,
            axis_candidates=axis_candidates,
            type_candidates=[],
            confidence="low",
            needs_clarification=True,
            clarifying_questions=["어떤 축이나 유형 기준으로 볼지 조금 더 구체적으로 알려주세요."],
            evidence_keys=["group_behavior.definition"] if concept_map.get("id") == "group_behavior" else [],
        )

    axis_candidates = [
        AxisCandidate(axis=axis_id, score=score, matched_signals=_dedupe(matched))
        for axis_id, (score, matched) in axis_scores.items()
    ]
    axis_candidates.sort(key=lambda candidate: candidate.score, reverse=True)

    type_candidates: list[TypeCandidate] = []
    clarifying_questions: list[str] = []
    evidence_keys: list[str] = []
    for axis, type_def, score, matched, _anti_matched in sorted(type_scores, key=lambda item: item[2], reverse=True):
        active_confusions = _active_confusions(type_def=type_def, type_scores=type_scores)
        confidence = _confidence(score=score, has_active_confusion=bool(active_confusions))
        type_candidates.append(
            TypeCandidate(
                axis=str(axis.get("id", "")),
                type=str(type_def.get("id", "")),
                score=score,
                confidence=confidence,
                matched_signals=_dedupe(matched),
                confused_with=[str(confusion.get("target", "")) for confusion in active_confusions],
            )
        )
        definition_key = str(type_def.get("definition_key", "")).strip()
        if definition_key:
            evidence_keys.append(definition_key)
        for confusion in active_confusions:
            question = str(confusion.get("clarifying_question", "")).strip()
            if question:
                clarifying_questions.append(question)
            for evidence_key in confusion.get("evidence_keys", []):
                evidence_keys.append(str(evidence_key))

    primary_confidence = type_candidates[0].confidence if type_candidates else "low"
    return ConceptResult(
        exam=str(concept_map.get("id")),
        reference=str(concept_map.get("reference", "")) or None,
        axis_candidates=axis_candidates,
        type_candidates=type_candidates,
        confidence=primary_confidence,
        needs_clarification=bool(clarifying_questions),
        clarifying_questions=_dedupe(clarifying_questions)[:3],
        evidence_keys=_dedupe(evidence_keys),
    )


def _score_type(*, type_def: dict, text: str) -> tuple[int, list[str], list[str]]:
    signals = type_def.get("signals", {})
    raw_code = str(type_def.get("code", ""))
    identity_terms = [
        str(type_def.get("name", "")),
        str(type_def.get("id", "")),
        raw_code if len(raw_code) > 1 else "",
    ]
    identity = _matched_terms(identity_terms, text)
    strong = _matched_terms(signals.get("strong", []), text)
    weak = _matched_terms(signals.get("weak", []), text)
    anti = _matched_terms(signals.get("anti", []), text)
    score = (len(strong) * 3) + (len(identity) * 2) + len(weak) - (len(anti) * 3)
    return score, [*identity, *strong, *weak], anti


def _matched_terms(terms: list[str], text: str) -> list[str]:
    normalized_text = _normalize(text)
    compact_text = normalized_text.replace(" ", "")
    matched = []
    for term in terms:
        normalized_term = _normalize(str(term))
        if not normalized_term:
            continue
        compact_term = normalized_term.replace(" ", "")
        if normalized_term in normalized_text or compact_term in compact_text:
            matched.append(str(term))
    return matched


def _active_confusions(*, type_def: dict, type_scores: list[tuple[dict, dict, int, list[str], list[str]]]) -> list[dict]:
    active = []
    scored_type_keys = {
        f"{axis.get('id')}.{candidate_type.get('id')}"
        for axis, candidate_type, score, _matched, _anti in type_scores
        if score > 0
    }
    for confusion in type_def.get("confused_with", []):
        target = str(confusion.get("target", ""))
        if confusion.get("clarify_when_matched") or target in scored_type_keys:
            active.append(confusion)
    return active


def _confidence(*, score: int, has_active_confusion: bool) -> Confidence:
    if has_active_confusion:
        return "medium"
    if score >= 6:
        return "high"
    if score >= 3:
        return "medium"
    return "low"


def _result_score(result: ConceptResult) -> int:
    return max((candidate.score for candidate in result.type_candidates), default=0)


def _empty_result() -> ConceptResult:
    return ConceptResult(
        exam=None,
        reference=None,
        axis_candidates=[],
        type_candidates=[],
        confidence="low",
        needs_clarification=True,
        clarifying_questions=["어떤 검사나 유형 기준으로 볼지 조금 더 구체적으로 알려주세요."],
        evidence_keys=[],
    )


@lru_cache(maxsize=1)
def _load_concept_maps() -> list[dict]:
    concept_map_dir = _repo_root() / "knowledge" / "concept_maps"
    if not concept_map_dir.exists():
        return []
    maps: list[dict] = []
    for path in sorted(concept_map_dir.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            maps.append(data)
    return maps


def _normalize(text: str) -> str:
    return " ".join(text.casefold().split())


def _dedupe(values: list[str]) -> list[str]:
    deduped: list[str] = []
    for value in values:
        if value and value not in deduped:
            deduped.append(value)
    return deduped


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]
