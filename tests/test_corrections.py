import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, engine
from models import Base, Station, Alert
from seed import seed_database
import io

client = TestClient(app)

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    seed_database(session)
    yield session
    session.close()

def test_predict_no_manual_caps(db):
    """Verify manual caps (elevation < 100 and slope < 15) are removed.
    Risk score must come directly from ML model probability * 100.
    """
    payload = {
        "elevation": 50.0,      # < 100
        "slope": 10.0,          # < 15
        "aspect": 180.0,
        "curvature": 0.0,
        "twi": 10.0,
        "distance_to_rivers": 100.0,
        "annual_rainfall": 3000.0,
        "event_rainfall": 250.0, # high rainfall to generate high probability
        "ndvi": 0.3,
        "lulc": 3.0,
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert "probability" in data
    # Direct relationship: risk_score must match round(probability * 100, 1)
    expected_score = round(data["probability"] * 100.0, 1)
    assert abs(data["risk_score"] - expected_score) < 0.2
    # Verify it is not arbitrarily capped at 35 or 40 if probability was higher
    print(f"ML Probability: {data['probability']}, Risk Score: {data['risk_score']}")

def test_photo_upload_evidence_only(db):
    """Verify photo upload stores evidence without fake filename-based AI analysis."""
    fake_img = io.BytesIO(b"fake image data representing landslide photo")
    fake_img.name = "test_crack_mud_hazard.jpg"
    
    response = client.post(
        "/api/reports/upload-photo",
        files={"photo": ("test_crack_mud_hazard.jpg", fake_img, "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "photo_url" in data
    assert "ai_analysis" not in data or data.get("ai_analysis") is None
    assert data.get("verification_status") == "pending_human_verification"

def test_citizen_report_no_fake_ai(db):
    """Verify citizen report creation does not claim or fabricate image ML results."""
    report_payload = {
        "reporter_name": "Field Officer Test",
        "state": "Sikkim",
        "district": "Gangtok",
        "city": "Gangtok",
        "pincode": "737101",
        "landmark": "Near Bridge",
        "report_type": "crack",
        "severity": 3,
        "description": "Ground fracture observed on hillside.",
        "photo_url": "/uploads/test_photo.jpg"
    }
    response = client.post("/api/reports", json=report_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["ai_analysis"] is None
    assert data["photo_url"] == "/uploads/test_photo.jpg"

def test_priority_response_rule_based(db):
    """Verify priority response provides rule-based ranking with transparent reasoning."""
    # Ensure at least one active high/critical alert
    st = db.query(Station).first()
    alert = Alert(
        station_id=st.id,
        station_name=st.name,
        risk_level="CRITICAL",
        risk_score=85.0,
        message="Test critical landslide hazard",
        affected_population=int(st.population * 0.2),
        affected_roads=2,
        status="active"
    )
    db.add(alert)
    db.commit()

    response = client.get("/api/alerts/prioritize")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    top = data[0]
    assert top["rank"] == 1
    assert "priority_score" in top
    assert "reasoning" in top
    # Check that reasoning details specific factors
    assert "Critical" in top["reasoning"] or "score" in top["reasoning"] or "road" in top["reasoning"]
