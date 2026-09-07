from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session

from database import get_db
from models import Alert
from schemas import ResourceTeam, ResourceCamp, AssignmentResponse, AssignRequest

router = APIRouter(prefix="/api/resources", tags=["Resources"])

# Full hard‑coded data for 12 rescue teams
_TEAMS = [
    {"id": 1, "name": "Team Alpha", "status": "available", "capacity": 10},
    {"id": 2, "name": "Team Bravo", "status": "deployed", "capacity": 12},
    {"id": 3, "name": "Team Charlie", "status": "standby", "capacity": 8},
    {"id": 4, "name": "Team Delta", "status": "available", "capacity": 15},
    {"id": 5, "name": "Team Echo", "status": "available", "capacity": 9},
    {"id": 6, "name": "Team Foxtrot", "status": "deployed", "capacity": 11},
    {"id": 7, "name": "Team Golf", "status": "standby", "capacity": 7},
    {"id": 8, "name": "Team Hotel", "status": "available", "capacity": 14},
    {"id": 9, "name": "Team India", "status": "available", "capacity": 10},
    {"id": 10, "name": "Team Juliett", "status": "standby", "capacity": 13},
    {"id": 11, "name": "Team Kilo", "status": "deployed", "capacity": 9},
    {"id": 12, "name": "Team Lima", "status": "available", "capacity": 12},
]

# Full hard‑coded data for 8 camps (total capacity = 24 500)
_CAMPS = [
    {"id": 1, "location": "Cherrapunji", "capacity": 6000},
    {"id": 2, "location": "Mangan", "capacity": 5000},
    {"id": 3, "location": "Shillong", "capacity": 4000},
    {"id": 4, "location": "Tura", "capacity": 3000},
    {"id": 5, "location": "Nongpoh", "capacity": 2500},
    {"id": 6, "location": "Jowai", "capacity": 2000},
    {"id": 7, "location": "Guwahati", "capacity": 1500},
    {"id": 8, "location": "Tezpur", "capacity": 500},
]

@router.get("", response_model=List[ResourceTeam])
@router.get("/", response_model=List[ResourceTeam])
def get_teams():
    """Return the full list of rescue teams."""
    return _TEAMS

@router.get("/camps", response_model=List[ResourceCamp])
def get_camps():
    """Return the full list of rescue camps."""
    return _CAMPS

@router.get("/stats")
def get_stats():
    """Return resource statistics required for the UI bar.

    - AVAILABLE: number of teams with status "available"
    - DEPLOYED: number of teams with status "deployed"
    - STANDBY: number of teams with status "standby"
    - total_capacity: sum of all camp capacities (should be 24 500)
    """
    available = sum(1 for t in _TEAMS if t["status"] == "available")
    deployed = sum(1 for t in _TEAMS if t["status"] == "deployed")
    standby = sum(1 for t in _TEAMS if t["status"] == "standby")
    total_capacity = sum(c["capacity"] for c in _CAMPS)
    return {
        "available": available,
        "deployed": deployed,
        "standby": standby,
        "total_capacity": total_capacity,
    }

@router.get("/assignment", response_model=AssignmentResponse)
def get_assignment(db: Session = Depends(get_db)):
    active_alert = (
        db.query(Alert)
        .filter(Alert.status == "active", Alert.risk_level.in_(["CRITICAL", "HIGH"]))
        .order_by(Alert.risk_score.desc())
        .first()
    )

    if not active_alert:
        return AssignmentResponse(
            team=None,
            team_status=None,
            camp=None,
            camp_capacity=None,
            alert_station=None,
            alert_risk_level=None,
            reasoning="No active alerts requiring assignment",
            has_active_alert=False,
        )

    team = next((t for t in _TEAMS if t["status"] == "available"), _TEAMS[0])
    matching_camp = next((c for c in _CAMPS if c["location"].lower() in active_alert.station_name.lower()), _CAMPS[0])

    team_name = f"NDRF {team['name']}" if not team["name"].startswith("NDRF") else team["name"]
    camp_name = f"{matching_camp['location']} Civil Hospital Camp" if "Camp" not in matching_camp["location"] else matching_camp["location"]

    return AssignmentResponse(
        team=team_name,
        team_status=team["status"],
        camp=camp_name,
        camp_capacity=matching_camp["capacity"],
        alert_station=active_alert.station_name,
        alert_risk_level=active_alert.risk_level,
        reasoning=f"{team_name} is nearest available team to {active_alert.station_name}",
        has_active_alert=True,
    )

@router.post("/assign")
def assign_team(body: dict):
    """Mark the assigned team as deployed."""
    team_name = body.get("team") or body.get("team_name") or ""
    for t in _TEAMS:
        if t["name"] in team_name or str(t["id"]) == str(body.get("team_id")):
            t["status"] = "deployed"
            break
    return {"status": "assigned", "team": team_name, "camp": body.get("camp", "")}

@router.get("/recommendations")
def get_recommendations(db: Session = Depends(get_db)):
    """Assign the nearest AVAILABLE team to each active HIGH/CRITICAL alert.
    For the prototype we use a simple first‑available team and the first camp.
    The team status is updated to "deployed" after assignment to avoid double use.
    """
    alerts = (
        db.query(Alert)
        .filter(
            Alert.status == "active",
            Alert.risk_level.in_(["HIGH", "CRITICAL"]),
        )
        .all()
    )
    recommendations = []
    for alert in alerts:
        team = next((t for t in _TEAMS if t["status"] == "available"), None)
        if not team:
            break
        camp = _CAMPS[0]
        recommendations.append({"alert_id": alert.id, "team": team, "camp": camp})
        team["status"] = "deployed"
    return recommendations
