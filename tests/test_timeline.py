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

def test_alert_history_endpoint(db):
    response = client.get("/api/alerts/history")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        alert = data[0]
        assert "id" in alert
        assert "station_name" in alert
        assert "risk_level" in alert
        assert "timestamp" in alert
