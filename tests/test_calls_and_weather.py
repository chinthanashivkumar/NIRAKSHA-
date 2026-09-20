import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_calls_mode_endpoint():
    response = client.get("/api/calls/mode")
    assert response.status_code == 200
    data = response.json()
    assert "mode" in data
    assert "to_number" in data
    assert "from_number" in data

def test_calls_log_endpoint():
    response = client.get("/api/calls/log")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

def test_calls_alert_endpoint():
    payload = {
        "station_name": "Cherrapunji",
        "risk_score": 88.5,
        "risk_level": "CRITICAL"
    }
    response = client.post("/api/calls/alert", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "call_sid" in data
    assert "status" in data
    assert data["station_name"] == "Cherrapunji"

def test_weather_forecast_all_endpoint():
    response = client.get("/api/weather/forecast/all")
    assert response.status_code == 200
    data = response.json()
    assert "stations" in data
    assert "critical_warnings" in data
    assert len(data["stations"]) >= 1

def test_weather_forecast_station_endpoint():
    response = client.get("/api/weather/forecast/1")
    assert response.status_code == 200
    data = response.json()
    assert "station_name" in data
    assert "forecast" in data
    assert len(data["forecast"]) == 7
