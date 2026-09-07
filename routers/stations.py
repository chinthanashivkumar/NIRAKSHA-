from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Station, Evacuation
from schemas import StationResponse, EvacuationResponse
import datetime
import math

router = APIRouter(prefix="/api/stations", tags=["Stations"])

@router.get("", response_model=List[StationResponse])
def get_stations(db: Session = Depends(get_db)):
    import time
    t0 = time.time()
    stations = db.query(Station).all()
    t1 = time.time()
    print(f"DB query time: {t1-t0}s")
    return stations

# Forecast for risk escalation - MUST be before /{station_id}
@router.get("/forecast")
def get_forecast(db: Session = Depends(get_db)):
    """Return top 5 stations with risk escalation calculations."""
    stations = db.query(Station).all()
    results = []
    for s in stations:
        score = getattr(s, "risk_score", 0)
        daily_rain = getattr(s, "daily_rainfall", 0)
        if score >= 75:
            continue  # already critical
        if 50 <= score < 75:
            # HIGH approaching CRITICAL
            gap = 75 - score
            rate = max(daily_rain / 10, 0.1)
            minutes = (gap / rate) * 60
            minutes = max(120, min(minutes, 720))
            target_level = "CRITICAL"
        elif 30 <= score < 50:
            # MODERATE approaching HIGH
            gap = 50 - score
            minutes = gap * 45
            minutes = max(180, min(minutes, 540))
            target_level = "HIGH"
        else:
            continue
        minutes = int(minutes)
        target_timestamp = datetime.datetime.utcnow() + datetime.timedelta(minutes=minutes)
        results.append({
            "station_name": s.name,
            "state": getattr(s, "state", ""),
            "current_score": round(score, 1),
            "current_level": "HIGH" if score >= 50 else "MODERATE",
            "target_level": target_level,
            "minutes_to_escalation": minutes,
            "target_timestamp": target_timestamp.isoformat() + "Z",
            "trigger_reason": "Rainfall trending +8mm/hour" if score >= 50 else "Soil moisture critical",
        })
    results.sort(key=lambda x: x["minutes_to_escalation"])
    return results[:5]


@router.get("/{station_id}", response_model=StationResponse)
def get_station(station_id: int, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    return station

# New endpoint: evacuation plan for a station
@router.get("/{station_id}/evacuation", response_model=EvacuationResponse)
def get_evacuation(station_id: int, db: Session = Depends(get_db)):
    """Return evacuation plan for the given station id, fetched from the database."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    evac = db.query(Evacuation).filter(Evacuation.station_id == station_id).first()
    if not evac:
        raise HTTPException(status_code=404, detail="Evacuation plan not found")
    # Compute vehicles needed (one vehicle per 50 people)
    vehicles_needed = math.ceil(evac.population_to_evacuate / 50) if evac.population_to_evacuate else 0
    # Full evacuation time based on primary route ETA multiplied by number of vehicles
    full_evac_time = evac.primary_route_eta_h * vehicles_needed
    response = EvacuationResponse(
        station_id=station.id,
        station_name=station.name,
        primary_route={
            "description": "",
            "distance_km": evac.primary_route_distance_km,
            "eta_hours": evac.primary_route_eta_h,
            "status": "OPEN",
        },
        alternate_route={
            "description": "",
            "distance_km": evac.alternate_route_distance_km,
            "eta_hours": evac.alternate_route_eta_h,
            "status": "OPEN",
        },
        nearest_camp={
            "name": evac.nearest_camp_name,
            "capacity": evac.nearest_camp_capacity,
            "distance_km": evac.nearest_camp_distance_km,
            "current_occupancy": 0,
        },
        population_to_evacuate=evac.population_to_evacuate,
        vehicles_needed=vehicles_needed,
        full_evacuation_time_hours=full_evac_time,
    )
    return response
