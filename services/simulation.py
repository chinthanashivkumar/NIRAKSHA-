import asyncio
import random
import logging
from datetime import datetime, timedelta
from database import SessionLocal
from models import Station, Alert
from ml.model import predictor

logger = logging.getLogger(__name__)

async def simulate_live_data():
    logger.info("Starting live data simulation task (ML-powered)...")

    while True:
        try:
            # 1. Read current station state
            db = SessionLocal()
            stations = db.query(Station).all()

            # Defined baseline rainfall and moisture ranges per risk profile
            BASELINE_PROFILES = {
                "Cherrapunji":   {"rain": (220.0, 280.0), "moist": (0.45, 0.58)},
                "Tawang":        {"rain": (240.0, 290.0), "moist": (0.48, 0.60)},
                "Mangan":        {"rain": (110.0, 150.0), "moist": (0.38, 0.50)},
                "Kohima":        {"rain": (95.0, 140.0),  "moist": (0.36, 0.48)},
                "Ziro":          {"rain": (90.0, 130.0),  "moist": (0.35, 0.46)},
                "Gangtok":       {"rain": (100.0, 145.0), "moist": (0.37, 0.49)},
                "Churachandpur": {"rain": (90.0, 135.0),  "moist": (0.35, 0.47)},
                "Shillong":      {"rain": (45.0, 75.0),   "moist": (0.28, 0.38)},
                "Aizawl":        {"rain": (40.0, 70.0),   "moist": (0.26, 0.36)},
                "Imphal":        {"rain": (35.0, 65.0),   "moist": (0.25, 0.35)},
                "Itanagar":      {"rain": (45.0, 75.0),   "moist": (0.28, 0.38)},
                "Namchi":        {"rain": (40.0, 70.0),   "moist": (0.27, 0.37)},
                "Pasighat":      {"rain": (50.0, 80.0),   "moist": (0.29, 0.39)},
                "Tura":          {"rain": (35.0, 65.0),   "moist": (0.25, 0.35)},
                "Dima Hasao":    {"rain": (50.0, 80.0),   "moist": (0.29, 0.39)},
                "Guwahati":      {"rain": (10.0, 25.0),   "moist": (0.15, 0.25)},
                "Agartala":      {"rain": (8.0, 22.0),    "moist": (0.14, 0.24)},
                "Dimapur":       {"rain": (12.0, 28.0),   "moist": (0.16, 0.26)},
                "Silchar":       {"rain": (10.0, 24.0),   "moist": (0.15, 0.25)},
                "Jorhat":        {"rain": (12.0, 26.0),   "moist": (0.16, 0.25)},
            }

            updates = []
            for station in stations:
                profile = BASELINE_PROFILES.get(station.name, {"rain": (20.0, 50.0), "moist": (0.2, 0.4)})
                # Natural minor fluctuation within bounded baseline
                target_min_r, target_max_r = profile["rain"]
                target_min_m, target_max_m = profile["moist"]

                current_r = getattr(station, "current_rainfall", 20.0) or 20.0
                step_r = random.uniform(-2.5, 2.5)
                new_rainfall = max(target_min_r, min(target_max_r, current_r + step_r))

                current_m = getattr(station, "soil_moisture", 0.3) or 0.3
                step_m = random.uniform(-0.02, 0.02)
                new_moisture = max(target_min_m, min(target_max_m, current_m + step_m))

                # Simulated/Proxy Demo Feature Mapping:
                # In real-world GIS deployment, TWI, distance_to_rivers, and annual_rainfall
                # are derived from regional GIS rasters and meteorological history.
                # For this real-time simulator prototype, simulated/proxy demo inputs are provided:
                # - Soil moisture (0.1-0.6) scaled as a prototype demo proxy for Topographic Wetness Index (TWI)
                # - Road distance / 500m as a prototype demo proxy for drainage/river distance
                # - Daily rainfall scaled as a prototype demo proxy for annual rainfall
                input_data = {
                    "elevation":          station.elevation,
                    "slope":              station.slope_angle,
                    "aspect":             getattr(station, "aspect", 180.0),
                    "curvature":          getattr(station, "curvature", 0.0),
                    "twi":                new_moisture * 15.0,
                    "distance_to_rivers": getattr(station, "distance_to_road", 500.0),
                    "annual_rainfall":    new_rainfall * 20.0,
                    "event_rainfall":     new_rainfall,
                    "ndvi":               getattr(station, "ndvi", 0.4),
                    "lulc":               getattr(station, "lulc", 3.0),
                }
                updates.append({
                    "id":       station.id,
                    "name":     station.name,
                    "input":    input_data,
                    "rainfall": new_rainfall,
                    "moisture": new_moisture,
                })
            db.close()

            # 2. Run ML predictions outside DB lock
            results = []
            for item in updates:
                pred = await asyncio.to_thread(predictor.predict, item["input"])
                results.append((item, pred))

            # 3. Apply updates to DB
            db = SessionLocal()
            for item, pred in results:
                station = db.query(Station).get(item["id"])
                if not station:
                    continue

                station.current_rainfall = item["rainfall"]
                station.soil_moisture    = item["moisture"]
                station.risk_score       = pred["risk_score"]
                station.risk_level       = pred["risk_level"]
                station.last_updated     = datetime.utcnow()

                # Auto-create alert for HIGH/CRITICAL if none active and no duplicate in last 1 hour
                if station.risk_score >= 50.0:
                    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
                    recent_duplicate = db.query(Alert).filter(
                        Alert.station_id == station.id,
                        Alert.risk_level == station.risk_level,
                        Alert.timestamp >= one_hour_ago
                    ).first()

                    active_alert = db.query(Alert).filter(
                        Alert.station_id == station.id,
                        Alert.status == "active"
                    ).first()

                    if not recent_duplicate and not active_alert:
                        factors = ", ".join(pred["top_contributing_factors"])
                        message = (
                            f"Risk escalated to {station.risk_level} "
                            f"(score: {pred['risk_score']:.1f}). "
                            f"Top factors: {factors}"
                        )
                        # Use actual stored demographic population for this station
                        station_pop = station.population if station.population else 5000
                        # Calculate exposed population in immediate slope hazard perimeter (15-25% of settlement)
                        exposure_factor = 0.25 if station.risk_level == "CRITICAL" else 0.15
                        exposed_pop = max(50, int(station_pop * exposure_factor))

                        # Determine affected access roads from station terrain corridor
                        roads_affected = 2 if station.risk_level == "CRITICAL" else 1

                        new_alert = Alert(
                            station_id=station.id,
                            station_name=station.name,
                            risk_level=station.risk_level,
                            risk_score=station.risk_score,
                            message=message,
                            affected_population=exposed_pop,
                            affected_roads=roads_affected,
                        )
                        db.add(new_alert)
                        logger.warning(
                            f"New alert for {station.name}: {station.risk_level} "
                            f"(score={pred['risk_score']:.1f}, exposed_pop={exposed_pop})"
                        )

                # Automated Voice Call Alert for CRITICAL stations (risk >= 75)
                if station.risk_score >= 75.0:
                    try:
                        from routers.calls import trigger_critical_call_if_needed
                        asyncio.create_task(trigger_critical_call_if_needed(station.name, station.risk_score, station.risk_level))
                    except Exception as ce:
                        logger.error(f"Error triggering automated critical voice call: {ce}")

            db.commit()
            db.close()

        except Exception as e:
            logger.error(f"Error in simulation task: {e}", exc_info=True)

        # Update every 30 seconds
        await asyncio.sleep(30)
