from sqlalchemy.orm import Session
from models import Station, Evacuation, Alert
import random
from datetime import datetime, timedelta, timezone

def get_or_create(session, model, **kwargs):
    instance = session.query(model).filter_by(**kwargs).first()
    if instance:
        return instance
    instance = model(**kwargs)
    session.add(instance)
    session.commit()
    return instance

# Exact risk assignments per spec
STATION_RISKS = {
    # CRITICAL
    "Cherrapunji":   {"risk_score": random.uniform(76, 90), "risk_level": "CRITICAL"},
    "Tawang":        {"risk_score": random.uniform(76, 90), "risk_level": "CRITICAL"},
    # HIGH
    "Mangan":        {"risk_score": random.uniform(55, 74), "risk_level": "HIGH"},
    "Kohima":        {"risk_score": random.uniform(55, 74), "risk_level": "HIGH"},
    "Ziro":          {"risk_score": random.uniform(55, 74), "risk_level": "HIGH"},
    "Gangtok":       {"risk_score": random.uniform(55, 74), "risk_level": "HIGH"},
    "Churachandpur": {"risk_score": random.uniform(55, 74), "risk_level": "HIGH"},
    # MODERATE
    "Shillong":      {"risk_score": random.uniform(30, 54), "risk_level": "MODERATE"},
    "Aizawl":        {"risk_score": random.uniform(30, 54), "risk_level": "MODERATE"},
    "Imphal":        {"risk_score": random.uniform(30, 54), "risk_level": "MODERATE"},
    "Itanagar":      {"risk_score": random.uniform(30, 54), "risk_level": "MODERATE"},
    "Namchi":        {"risk_score": random.uniform(30, 54), "risk_level": "MODERATE"},
    "Pasighat":      {"risk_score": random.uniform(30, 54), "risk_level": "MODERATE"},
    "Tura":          {"risk_score": random.uniform(30, 54), "risk_level": "MODERATE"},
    "Dima Hasao":    {"risk_score": random.uniform(30, 54), "risk_level": "MODERATE"},
    # LOW
    "Guwahati":      {"risk_score": random.uniform(10, 29), "risk_level": "LOW"},
    "Agartala":      {"risk_score": random.uniform(10, 29), "risk_level": "LOW"},
    "Dimapur":       {"risk_score": random.uniform(10, 29), "risk_level": "LOW"},
    "Silchar":       {"risk_score": random.uniform(10, 29), "risk_level": "LOW"},
    "Jorhat":        {"risk_score": random.uniform(10, 29), "risk_level": "LOW"},
}

STATIONS_DATA = [
    {"name": "Guwahati",      "lat": 26.1445, "lon": 91.7362, "elevation": 55.0,   "slope_angle": 15.0, "aspect": 90.0,  "distance_to_road": 200.0,  "population": 957352},
    {"name": "Shillong",      "lat": 25.5788, "lon": 91.8933, "elevation": 1525.0, "slope_angle": 38.0, "aspect": 180.0, "distance_to_road": 500.0,  "population": 354759},
    {"name": "Imphal",        "lat": 24.8170, "lon": 93.9368, "elevation": 786.0,  "slope_angle": 12.0, "aspect": 135.0, "distance_to_road": 400.0,  "population": 268243},
    {"name": "Aizawl",        "lat": 23.7307, "lon": 92.7173, "elevation": 1132.0, "slope_angle": 42.0, "aspect": 200.0, "distance_to_road": 600.0,  "population": 293416},
    {"name": "Kohima",        "lat": 25.6751, "lon": 94.1086, "elevation": 1444.0, "slope_angle": 45.0, "aspect": 220.0, "distance_to_road": 700.0,  "population": 99039},
    {"name": "Agartala",      "lat": 23.8315, "lon": 91.2868, "elevation": 12.0,   "slope_angle": 8.0,  "aspect": 60.0,  "distance_to_road": 150.0,  "population": 400004},
    {"name": "Itanagar",      "lat": 27.0844, "lon": 93.6053, "elevation": 440.0,  "slope_angle": 32.0, "aspect": 170.0, "distance_to_road": 550.0,  "population": 44971},
    {"name": "Gangtok",       "lat": 27.3314, "lon": 88.6138, "elevation": 1650.0, "slope_angle": 48.0, "aspect": 190.0, "distance_to_road": 800.0,  "population": 100000},
    {"name": "Cherrapunji",   "lat": 25.2800, "lon": 91.7200, "elevation": 1484.0, "slope_angle": 35.0, "aspect": 210.0, "distance_to_road": 600.0,  "population": 10086},
    {"name": "Tawang",        "lat": 27.5861, "lon": 91.8594, "elevation": 3048.0, "slope_angle": 55.0, "aspect": 250.0, "distance_to_road": 1200.0, "population": 11521},
    {"name": "Ziro",          "lat": 27.5462, "lon": 93.8310, "elevation": 1500.0, "slope_angle": 28.0, "aspect": 160.0, "distance_to_road": 650.0,  "population": 22391},
    {"name": "Mangan",        "lat": 27.5100, "lon": 88.5200, "elevation": 956.0,  "slope_angle": 50.0, "aspect": 195.0, "distance_to_road": 900.0,  "population": 5000},
    {"name": "Namchi",        "lat": 27.1667, "lon": 88.3667, "elevation": 1315.0, "slope_angle": 40.0, "aspect": 185.0, "distance_to_road": 750.0,  "population": 17000},
    {"name": "Pasighat",      "lat": 28.0664, "lon": 95.3270, "elevation": 153.0,  "slope_angle": 22.0, "aspect": 140.0, "distance_to_road": 450.0,  "population": 30000},
    {"name": "Dima Hasao",    "lat": 25.1000, "lon": 93.0167, "elevation": 513.0,  "slope_angle": 36.0, "aspect": 175.0, "distance_to_road": 680.0,  "population": 214102},
    {"name": "Churachandpur", "lat": 24.3333, "lon": 93.6833, "elevation": 914.0,  "slope_angle": 30.0, "aspect": 155.0, "distance_to_road": 580.0,  "population": 274143},
    {"name": "Tura",          "lat": 25.5198, "lon": 90.2201, "elevation": 349.0,  "slope_angle": 25.0, "aspect": 145.0, "distance_to_road": 520.0,  "population": 73500},
    {"name": "Dimapur",       "lat": 25.9091, "lon": 93.7226, "elevation": 145.0,  "slope_angle": 10.0, "aspect": 80.0,  "distance_to_road": 250.0,  "population": 379117},
    {"name": "Silchar",       "lat": 24.8333, "lon": 92.7789, "elevation": 22.0,   "slope_angle": 5.0,  "aspect": 70.0,  "distance_to_road": 180.0,  "population": 228958},
    {"name": "Jorhat",        "lat": 26.7509, "lon": 94.2037, "elevation": 116.0,  "slope_angle": 8.0,  "aspect": 85.0,  "distance_to_road": 220.0,  "population": 105000},
]

def seed_database(db: Session):
    now = datetime.now(timezone.utc)
    print("Seeding/updating database with 20 NIRAKSHA stations...")
    for s_data in STATIONS_DATA:
        risk_info = STATION_RISKS.get(s_data["name"], {"risk_score": 20.0, "risk_level": "LOW"})
        rainfall = round(random.uniform(8, 25), 1) if risk_info["risk_level"] == "LOW" else \
                   round(random.uniform(35, 70), 1) if risk_info["risk_level"] == "MODERATE" else \
                   round(random.uniform(90, 145), 1) if risk_info["risk_level"] == "HIGH" else \
                   round(random.uniform(210, 275), 1)
        soil_moisture = round(random.uniform(0.15, 0.25), 2) if risk_info["risk_level"] == "LOW" else \
                        round(random.uniform(0.26, 0.38), 2) if risk_info["risk_level"] == "MODERATE" else \
                        round(random.uniform(0.36, 0.49), 2) if risk_info["risk_level"] == "HIGH" else \
                        round(random.uniform(0.48, 0.62), 2)
        station = db.query(Station).filter(Station.name == s_data["name"]).first()
        if station:
            station.lat = s_data["lat"]
            station.lon = s_data["lon"]
            station.elevation = s_data["elevation"]
            station.slope_angle = s_data["slope_angle"]
            station.aspect = s_data["aspect"]
            station.distance_to_road = s_data["distance_to_road"]
            station.population = s_data["population"]
            station.current_rainfall = rainfall
            station.soil_moisture = soil_moisture
            station.risk_score = round(risk_info["risk_score"], 1)
            station.risk_level = risk_info["risk_level"]
        else:
            station = Station(
                name=s_data["name"],
                lat=s_data["lat"],
                lon=s_data["lon"],
                elevation=s_data["elevation"],
                current_rainfall=rainfall,
                soil_moisture=soil_moisture,
                risk_score=round(risk_info["risk_score"], 1),
                risk_level=risk_info["risk_level"],
                slope_angle=s_data["slope_angle"],
                aspect=s_data["aspect"],
                distance_to_road=s_data["distance_to_road"],
                population=s_data["population"],
            )
            db.add(station)
    db.commit()
    print("Stations synchronized.")


    db.commit()
    print("Stations seeded. Adding evacuation plans...")

    # Evacuation plans for each station
    stations = db.query(Station).all()
    for station in stations:
        # Ensure we don't duplicate evacuation records for a station
        existing = db.query(Evacuation).filter(Evacuation.station_id == station.id).first()
        if not existing:
            evac = Evacuation(
                station_id=station.id,
                primary_route_distance_km=10.0,
                primary_route_eta_h=0.5,
                alternate_route_distance_km=12.0,
                alternate_route_eta_h=0.7,
                nearest_camp_name=f"{station.name} Camp",
                nearest_camp_distance_km=15.0,
                nearest_camp_capacity=0,
                population_to_evacuate=int(station.population * 0.8),
            )
            db.add(evac)
    db.commit()
    print("Evacuation plans added.")

    # Historical alerts (last 7 days)
    if not db.query(Alert).first():
        print("Adding historical alerts...")
        stations = db.query(Station).all()
        for i in range(15):
            station = stations[i % len(stations)]
            level = random.choice(["LOW", "MODERATE", "HIGH", "CRITICAL"])
            exp_factor = 0.25 if level == "CRITICAL" else 0.15
            alert = Alert(
                station_id=station.id,
                station_name=station.name,
                risk_score=round(random.uniform(20, 90), 1),
                risk_level=level,
                affected_population=max(50, int(station.population * exp_factor)),
                affected_roads=2 if station.slope_angle > 40 else 1,
                timestamp=now - timedelta(days=random.randint(0, 6), hours=random.randint(0, 23)),
                message="Historical alert for testing",
            )
            db.add(alert)
        db.commit()
        print("Historical alerts added.")
    print("Seeding complete.")
