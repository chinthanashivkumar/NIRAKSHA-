from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import CitizenReport, Station
from schemas import SyncRequest, SyncResponse

router = APIRouter(prefix="/api/sync", tags=["Offline Sync"])

@router.post("", response_model=SyncResponse)
def sync_offline_data(sync_data: SyncRequest, db: Session = Depends(get_db)):
    reports_count = 0
    readings_count = 0
    
    # Process reports
    for report in sync_data.reports:
        db_report = CitizenReport(**report.model_dump())
        db.add(db_report)
        reports_count += 1
        
    # Process sensor readings
    for reading in sync_data.sensor_readings:
        station = db.query(Station).filter(Station.id == reading.station_id).first()
        if station:
            station.current_rainfall = reading.current_rainfall
            station.soil_moisture = reading.soil_moisture
            # We don't update last_updated from client side here to maintain server truth, 
            # or we could if we fully trust the client. Let's just update the values.
            readings_count += 1
            
    db.commit()
    
    return SyncResponse(
        reports_synced=reports_count,
        readings_synced=readings_count,
        status="success"
    )
