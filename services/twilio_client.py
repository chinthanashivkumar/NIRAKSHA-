"""
Twilio SMS functionality has been removed from NIRAKSHA v2.0.
This file is kept as a safe stub to prevent import errors from any legacy references.
"""
import logging

logger = logging.getLogger(__name__)

def send_sms_alert(phone_number: str, station_name: str, risk_level: str, risk_score: float, message: str):
    """No-op stub — SMS functionality removed in v2.0."""
    logger.info(f"[SMS STUB - DISABLED] Alert for {station_name}: {risk_level} ({risk_score:.1f})")
    return {"status": "disabled", "message": "SMS removed in NIRAKSHA v2.0"}
