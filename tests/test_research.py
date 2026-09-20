import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_research_historical():
    res = client.get("/api/research/historical")
    assert res.status_code == 200
    data = res.json()
    assert "statistics" in data
    assert data["statistics"]["total_events"] == 847
    assert data["statistics"]["total_deaths"] == 1247
    assert len(data["districts"]) == 15
    top = data["districts"][0]
    assert top["district"] == "Cherrapunji"
    assert top["events"] == 127
    assert top["deaths"] == 89
    assert top["risk_level"] == "CRITICAL"

def test_research_monthly_distribution():
    res = client.get("/api/research/monthly-distribution")
    assert res.status_code == 200
    data = res.json()
    assert "data" in data
    assert len(data["data"]) == 12
    july = next(m for m in data["data"] if m["month"] == "Jul")
    assert july["events"] == 189
    assert july["is_monsoon"] is True
    assert july["risk_tier"] == "PEAK_DANGER"

def test_research_susceptibility_zones():
    res = client.get("/api/research/susceptibility-zones")
    assert res.status_code == 200
    zones = res.json()
    assert len(zones) == 5
    names = [z["zone_name"] for z in zones]
    states = [z["state"] for z in zones]
    assert any("NH-415" in n for n in names)
    assert any("Ziro Valley" in n for n in names)
    assert any("Manipur" in s for s in states)
    assert any("Nagaland" in s for s in states)
    assert any("Meghalaya" in s for s in states)

def test_research_validation_comparison():
    res = client.get("/api/research/validation-comparison")
    assert res.status_code == 200
    val = res.json()
    assert val["total_zones_compared"] == 47
    assert val["agreement_percentage"] == 84.9
    assert val["high_risk_correctly_identified"] == 38
