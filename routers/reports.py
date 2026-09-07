import os
import time
import logging
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from database import get_db, SessionLocal
from models import CitizenReport, Alert
from schemas import CitizenReportCreate, CitizenReportResponse

logger = logging.getLogger(__name__)

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

router = APIRouter(prefix="/api/reports", tags=["Citizen Reports"])


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/upload-photo")
async def upload_photo(photo: UploadFile = File(...)):
    """Accept multipart upload, store photographic field evidence for human/authority verification."""
    allowed = {"image/jpeg", "image/png", "image/jpg", "image/webp", "video/mp4"}
    if photo.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {photo.content_type}")

    timestamp = int(time.time())
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in (photo.filename or "photo.jpg"))
    filename  = f"{timestamp}_{safe_name}"
    dest      = UPLOADS_DIR / filename

    contents = await photo.read()
    dest.write_bytes(contents)

    logger.info(f"Photo field evidence archived: {filename} ({len(contents)} bytes) - pending authority verification")
    return {
        "photo_url": f"/uploads/{filename}",
        "filename": filename,
        "size_bytes": len(contents),
        "status": "evidence_recorded",
        "verification_status": "pending_human_verification",
        "message": "Photographic evidence archived for official inspection and human verification."
    }


@router.post("")
def create_report(report: CitizenReportCreate, db: Session = Depends(get_db)):
    # Build location display string from structured fields
    parts = [p for p in [report.city, report.district, report.state] if p]
    location_str = ", ".join(parts) if parts else (report.location or "Unknown")

    data = report.model_dump()
    data["location"] = location_str

    # Photographic evidence is preserved solely for official/human field verification
    # No fake or filename-based image ML model is claimed
    data["ai_analysis"] = None

    db_report = CitizenReport(**data)
    db.add(db_report)

    alert_generated = False
    alert_id = None

    if report.severity >= 4:
        alert_msg = (
            f"⚠️ NIRAKSHA FIELD REPORT ALERT: {report.report_type.replace('_', ' ')} detected "
            f"at {location_str}. Severity: {report.severity}/5. "
            f"Immediate inspection recommended. -NIRAKSHA System"
        )
        new_alert = Alert(
            station_name=f"Citizen Report — {location_str}",
            risk_level="CRITICAL" if report.severity == 5 else "HIGH",
            risk_score=90.0 if report.severity == 5 else 75.0,
            message=alert_msg,
            affected_population=0,
            affected_roads=1 if report.report_type == "road_blocked" else 0,
        )
        db.add(new_alert)
        db.flush()
        alert_id = new_alert.id
        alert_generated = True
        logger.warning(f"Auto-generated alert from citizen report at {location_str}")

    db.commit()
    db.refresh(db_report)

    # Prepare response
    res_dict = {
        "id": db_report.id,
        "timestamp": db_report.timestamp.isoformat() if db_report.timestamp else "",
        "report_type": db_report.report_type,
        "description": db_report.description,
        "severity": db_report.severity,
        "photo_url": db_report.photo_url,
        "reporter_name": db_report.reporter_name,
        "state": db_report.state,
        "district": db_report.district,
        "city": db_report.city,
        "pincode": db_report.pincode,
        "landmark": db_report.landmark,
        "location": db_report.location,
        "alert_generated": alert_generated,
        "alert_id": alert_id,
        "ai_analysis": None,
    }

    return JSONResponse(content=res_dict)


@router.get("")
def get_reports(db: Session = Depends(get_db)):
    reports = db.query(CitizenReport).order_by(CitizenReport.id.desc()).all()
    results = []
    for r in reports:
        item = {
            "id": r.id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else "",
            "report_type": r.report_type,
            "description": r.description,
            "severity": r.severity,
            "photo_url": r.photo_url,
            "reporter_name": r.reporter_name,
            "state": r.state,
            "district": r.district,
            "city": r.city,
            "pincode": r.pincode,
            "landmark": r.landmark,
            "location": r.location,
            "alert_generated": r.severity >= 4,
            "ai_analysis": None,
        }
        results.append(item)
    return JSONResponse(content=results)

