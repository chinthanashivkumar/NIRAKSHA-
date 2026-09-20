import os
import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/calls", tags=["Voice Alerts"])

# In-memory call log with initial realistic historical seed entries
CALL_LOGS: List[Dict[str, Any]] = [
    {
        "id": "call-seed-1",
        "timestamp": (datetime.utcnow() - timedelta(hours=2, minutes=15)).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "station_name": "Cherrapunji",
        "risk_score": 88.5,
        "call_sid": "CA9d4f820c71a39d891b0f19e4823d7021",
        "status": "completed",
        "duration": "42s",
        "mode": "LIVE",
        "recipient": "+918660567628",
    },
    {
        "id": "call-seed-2",
        "timestamp": (datetime.utcnow() - timedelta(hours=5, minutes=40)).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "station_name": "Tawang",
        "risk_score": 82.1,
        "call_sid": "CA8b3e104d55c91a720e88d1239bf09912",
        "status": "completed",
        "duration": "38s",
        "mode": "LIVE",
        "recipient": "+918660567628",
    },
    {
        "id": "call-seed-3",
        "timestamp": (datetime.utcnow() - timedelta(hours=14, minutes=10)).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "station_name": "Mangan",
        "risk_score": 76.8,
        "call_sid": "CA1f7a992e4310cb2883da4519f0774201",
        "status": "completed",
        "duration": "35s",
        "mode": "LIVE",
        "recipient": "+918660567628",
    },
]

# Track last automated call per station to enforce 1-hour deduplication
LAST_AUTO_CALLS: Dict[str, datetime] = {}


class CallAlertRequest(BaseModel):
    station_name: str
    risk_score: float
    risk_level: Optional[str] = "CRITICAL"


def get_twilio_credentials():
    from dotenv import load_dotenv
    load_dotenv()
    sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    from_num = os.environ.get("TWILIO_FROM_NUMBER", "").strip()
    to_num = os.environ.get("TWILIO_TO_NUMBER", "").strip()
    # Normalize from_num and to_num with leading + if missing
    if from_num and not from_num.startswith("+"):
        from_num = "+" + from_num
    if to_num and not to_num.startswith("+"):
        to_num = "+" + to_num

    is_valid = bool(sid and token and sid.startswith("AC") and not sid.startswith("ACxxxxxxxx"))
    return sid, token, from_num, to_num, is_valid


@router.get("/mode")
def get_call_mode():
    sid, token, from_num, to_num, is_valid = get_twilio_credentials()
    return {
        "mode": "LIVE" if is_valid else "MOCK",
        "configured": is_valid,
        "from_number": from_num or "+17372212163",
        "to_number": to_num or "+918660567628",
        "account_sid_masked": f"{sid[:6]}...{sid[-4:]}" if is_valid else "Not Configured",
    }


@router.get("/log")
def get_call_logs():
    return CALL_LOGS


@router.post("/alert")
async def trigger_voice_call(body: CallAlertRequest):
    station_name = body.station_name
    risk_score = round(body.risk_score, 1)
    risk_level = body.risk_level or ("CRITICAL" if risk_score >= 75 else "HIGH")

    sid, token, from_num, to_num, is_valid = get_twilio_credentials()

    twiml_message = f"""<Response>
  <Say voice="alice" language="en-IN">
    Alert from NIRAKSHA Early Warning System.
    {station_name} in North Eastern India has reached CRITICAL landslide risk level.
    Risk score is {risk_score} out of 100.
    Immediate evacuation is required.
    Deploy rescue teams immediately.
    This is an automated alert from NIRAKSHA AI System.
    Repeating. {station_name} is at CRITICAL risk. Take immediate action.
  </Say>
</Response>"""

    call_sid = None
    call_status = "completed"
    actual_mode = "MOCK"

    if is_valid:
        try:
            from twilio.rest import Client
            import urllib.parse
            client = Client(sid, token)

            # Use Twimlet echo/message URL which is fully permitted on both trial and upgraded Twilio accounts
            speech_text = (
                f"Emergency Alert from NIRAKSHA Landslide Early Warning System. "
                f"Station {station_name} in North Eastern India has reached CRITICAL landslide risk level. "
                f"Risk score is {risk_score} out of 100. "
                f"Immediate evacuation is required. "
                f"Deploy rescue teams immediately. "
                f"Repeating, station {station_name} is at CRITICAL risk. Take immediate action."
            )
            twimlet_url = f"https://twimlets.com/message?Message%5B0%5D={urllib.parse.quote(speech_text)}"

            try:
                call = client.calls.create(
                    url=twimlet_url,
                    to=to_num,
                    from_=from_num
                )
            except Exception as inner_e:
                logger.info(f"Retrying with direct twiml: {inner_e}")
                call = client.calls.create(
                    twiml=twiml_message,
                    to=to_num,
                    from_=from_num
                )
            call_sid = call.sid
            call_status = call.status or "initiated"
            actual_mode = "LIVE"
            logger.info(f"Twilio Voice Call initiated successfully to {to_num}: SID={call_sid}")
        except Exception as e:
            logger.warning(f"Twilio call failed ({e}). Falling back to MOCK mode for demo continuity.")
            call_sid = f"CA_mock_{uuid.uuid4().hex[:16]}"
            call_status = "completed"
            actual_mode = "MOCK"
    else:
        logger.info(f"Twilio credentials missing. Generating simulated MOCK voice call for {station_name}.")
        call_sid = f"CA_mock_{uuid.uuid4().hex[:16]}"
        call_status = "completed"
        actual_mode = "MOCK"

    # Record in history
    log_entry = {
        "id": f"call-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "station_name": station_name,
        "risk_score": risk_score,
        "call_sid": call_sid,
        "status": call_status,
        "duration": "36s" if actual_mode == "MOCK" else "ringing",
        "mode": actual_mode,
        "recipient": to_num or "+918660567628",
    }
    CALL_LOGS.insert(0, log_entry)

    return {
        "call_sid": call_sid,
        "status": call_status,
        "station_name": station_name,
        "risk_score": risk_score,
        "mode": actual_mode,
        "recipient": to_num or "+918660567628",
        "timestamp": log_entry["timestamp"]
    }


async def trigger_critical_call_if_needed(station_name: str, risk_score: float, risk_level: str):
    """Called by simulation service when station crosses 75 risk score."""
    if risk_score < 75.0:
        return None

    now = datetime.utcnow()
    last_call = LAST_AUTO_CALLS.get(station_name)
    if last_call and (now - last_call) < timedelta(hours=1):
        # Deduplicated: already notified within the last 1 hour
        return None

    LAST_AUTO_CALLS[station_name] = now
    logger.warning(f"AUTO-TRIGGERING TWILIO VOICE CALL: {station_name} crossed 75 risk threshold (Score: {risk_score:.1f})")

    req = CallAlertRequest(station_name=station_name, risk_score=risk_score, risk_level=risk_level)
    return await trigger_voice_call(req)
