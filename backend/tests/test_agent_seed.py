from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Agent
from app.services.agent_seed import seed_agents


def test_seed_agents_creates_crata_office_agents(db_session: Session) -> None:
    seed_agents(db_session)

    agents = db_session.scalars(select(Agent)).all()
    concept_guardian = db_session.get(Agent, "concept_guardian")
    business_designer = db_session.get(Agent, "business_designer")

    assert len(agents) == 10
    assert concept_guardian is not None
    assert concept_guardian.display_name == "개념수호자"
    assert business_designer is not None
    assert business_designer.status == "planned"
    assert business_designer.enabled is False


def test_seed_agents_is_idempotent(db_session: Session) -> None:
    seed_agents(db_session)
    seed_agents(db_session)

    agents = db_session.scalars(select(Agent)).all()

    assert len(agents) == 10


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
    assert len(db_session.scalars(select(Agent)).all()) == 10
