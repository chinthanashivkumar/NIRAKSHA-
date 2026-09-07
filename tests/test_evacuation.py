import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, engine
from models import Base, Station
from seed import seed_database

client = TestClient(app)

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    seed_database(session)
    yield session
    session.close()

def test_evacuation_endpoint(db):
    station = db.query(Station).first()
    assert station is not None
    response = client.get(f"/api/stations/{station.id}/evacuation")
    assert response.status_code == 200
    data = response.json()
    required = ["station_id","station_name","primary_route","alternate_route","nearest_camp","population_to_evacuate","vehicles_needed","full_evacuation_time_hours"]
    for field in required:
        assert field in data
    pop = data["population_to_evacuate"]
    vehicles = data["vehicles_needed"]
    assert vehicles == (pop + 49) // 50
    primary_eta = data["primary_route"]["eta_hours"]
    expected = round(primary_eta * vehicles, 2)
    assert abs(data["full_evacuation_time_hours"] - expected) < 0.01
