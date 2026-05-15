from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Agent
from app.services.agent_seed import AGENT_SEEDS, seed_agents


def _seed_by_id(agent_id: str) -> dict[str, object]:
    return next(seed for seed in AGENT_SEEDS if seed["id"] == agent_id)


def test_seed_agents_creates_crata_office_agents(db_session: Session) -> None:
    seed_agents(db_session)

    agents = db_session.scalars(select(Agent)).all()
    concept_guardian = db_session.get(Agent, "concept_guardian")
    business_designer = db_session.get(Agent, "business_designer")

    concept_guardian_seed = _seed_by_id("concept_guardian")
    business_designer_seed = _seed_by_id("business_designer")

    assert len(agents) == len(AGENT_SEEDS)
    assert concept_guardian is not None
    assert concept_guardian.display_name == concept_guardian_seed["display_name"]
    assert business_designer is not None
    assert business_designer.status == business_designer_seed["status"]
    assert business_designer.enabled == business_designer_seed["enabled"]


def test_seed_agents_is_idempotent(db_session: Session) -> None:
    seed_agents(db_session)
    seed_agents(db_session)

    agents = db_session.scalars(select(Agent)).all()

    assert len(agents) == len(AGENT_SEEDS)


def test_seed_agents_preserves_existing_agent(db_session: Session) -> None:
    existing_agent = Agent(
        id="crata_ceo",
        name="Custom CEO",
        display_name="Custom Display",
        role="Custom Role",
    )
    db_session.add(existing_agent)
    db_session.commit()

    seed_agents(db_session)

    crata_ceo = db_session.get(Agent, "crata_ceo")

    assert crata_ceo is not None
    assert crata_ceo.display_name == "Custom Display"
    assert crata_ceo.role == "Custom Role"
    assert len(db_session.scalars(select(Agent)).all()) == len(AGENT_SEEDS)
