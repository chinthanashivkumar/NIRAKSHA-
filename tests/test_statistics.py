import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, engine
from models import Base
from seed import seed_database

client = TestClient(app)

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    seed_database(session)
    yield session
    session.close()

def test_alert_statistics_endpoint(db):
    response = client.get("/api/alerts/statistics")
    assert response.status_code == 200
    data = response.json()
    assert "total_alerts" in data
    assert "critical_count" in data
    assert "high_count" in data
    assert "alerts_by_day" in data
    assert isinstance(data["alerts_by_day"], list)
