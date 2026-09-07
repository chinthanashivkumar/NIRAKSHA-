from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

class PredictRequest(BaseModel):
    elevation: float = Field(default=1200.0, ge=50, le=5000, description="Elevation in meters")
    slope: float = Field(default=20.0, ge=0, le=90, description="Slope angle in degrees")
    aspect: float = Field(default=180.0, ge=0, le=360, description="Aspect in degrees")
    curvature: float = Field(default=0.0, ge=-10, le=10, description="Surface curvature")
    twi: float = Field(default=6.0, ge=0, le=30, description="Topographic Wetness Index")
    distance_to_rivers: float = Field(default=500.0, ge=0, le=10000, description="Distance to nearest river (m)")
    annual_rainfall: float = Field(default=1500.0, ge=0, le=10000, description="Annual rainfall in mm")
    event_rainfall: float = Field(default=50.0, ge=0, le=500, description="Event/daily rainfall in mm")
    ndvi: float = Field(default=0.4, ge=-1, le=1, description="Normalized Difference Vegetation Index")
    lulc: float = Field(default=3.0, ge=1, le=7, description="Land Use/Land Cover class (1-7)")

class PredictResponse(BaseModel):
    risk_score: float
    risk_level: str
    probability: float
    top_contributing_factors: List[str]
    selected_model: str = "Gradient Boosting"

class ModelMetricsResponse(BaseModel):
    selected_model: str
    models: Dict[str, Any]
    feature_importance: List[Dict[str, Any]]
    confusion_matrix: List[List[int]]
    training_samples: int
    test_samples: int

class ModelInfoResponse(BaseModel):
    model_name: str
    version: str
    algorithm: str
    dataset_source: str
    dataset_size: int
    features: List[str]
    target: str
    trained_at: str
    accuracy: float
    auc_roc: float
    limitations: List[str]

class StationResponse(BaseModel):
    id: int
    name: str
    lat: float
    lon: float
    elevation: float
    current_rainfall: float
    soil_moisture: float
    risk_score: float
    risk_level: str
    last_updated: datetime

    class Config:
        from_attributes = True

class AlertResponse(BaseModel):
    id: int
    station_name: str
    risk_level: str
    risk_score: float
    message: str
    timestamp: datetime
    status: str
    affected_population: int
    affected_roads: int

    class Config:
        from_attributes = True

class PrioritizeResponse(BaseModel):
    rank: int
    alert: AlertResponse
    priority_score: float
    reasoning: str
    recommended_action: str
    estimated_rescue_teams: int

class WeatherResponse(BaseModel):
    current_rainfall: float
    temperature: float
    wind_speed: float
    soil_moisture: float

class CitizenReportCreate(BaseModel):
    report_type: str
    description: str
    severity: int = Field(..., ge=1, le=5)
    photo_url: Optional[str] = None
    ai_analysis: Optional[Union[Dict[str, Any], str]] = None
    reporter_name: str
    # Location fields
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    landmark: Optional[str] = None
    location: Optional[str] = None  # auto-computed from above

class CitizenReportResponse(CitizenReportCreate):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class StationReadingInput(BaseModel):
    station_id: int
    current_rainfall: float
    soil_moisture: float
    timestamp: datetime

class SyncRequest(BaseModel):
    reports: List[CitizenReportCreate] = []
    sensor_readings: List[StationReadingInput] = []

class SyncResponse(BaseModel):
    reports_synced: int
    readings_synced: int
    status: str

class AlertStatsResponse(BaseModel):
    total_alerts: int
    critical_count: int
    high_count: int
    avg_response_minutes: float | None = None
    fastest_response_minutes: float | None = None
    most_affected_station: str | None = None
    alerts_by_state: dict[str, int]
    alerts_by_day: List[dict]

class ResourceTeam(BaseModel):
    id: int
    name: str
    status: str
    capacity: int

class ResourceCamp(BaseModel):
    id: int
    location: str
    capacity: int

class AssignmentResponse(BaseModel):
    team: Optional[Union[ResourceTeam, str]] = None
    team_status: Optional[str] = None
    camp: Optional[Union[ResourceCamp, str]] = None
    camp_capacity: Optional[int] = None
    alert_station: Optional[str] = None
    alert_risk_level: Optional[str] = None
    reasoning: Optional[str] = None
    has_active_alert: Optional[bool] = False

class AssignRequest(BaseModel):
    team_id: int
    camp_id: int
    assigned_by: str | None = None
    timestamp: datetime | None = None

# New models for evacuation response
class RouteInfo(BaseModel):
    description: str
    distance_km: float
    eta_hours: float
    status: str

class CampInfo(BaseModel):
    name: str
    capacity: int
    distance_km: float
    current_occupancy: int | None = None

class EvacuationResponse(BaseModel):
    station_id: int
    station_name: str
    primary_route: RouteInfo
    alternate_route: RouteInfo
    nearest_camp: CampInfo
    population_to_evacuate: int
    vehicles_needed: int
    full_evacuation_time_hours: float
