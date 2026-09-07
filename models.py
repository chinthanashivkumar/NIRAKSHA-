from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, unique=True)
    lat = Column(Float)
    lon = Column(Float)
    elevation = Column(Float)
    current_rainfall = Column(Float, default=0.0)
    soil_moisture = Column(Float, default=0.3)
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String, default="LOW")
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)
    # Fixed terrain and demographic data
    population = Column(Integer, default=5000)
    nearest_road = Column(String, default="Unknown Road")
    slope_angle = Column(Float, default=30.0)
    aspect = Column(Float, default=0.0)
    distance_to_road = Column(Float, default=500.0)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=True)
    station_name = Column(String)
    risk_level = Column(String)
    risk_score = Column(Float)
    message = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="active")  # active, acknowledged, resolved
    affected_population = Column(Integer, default=1000)
    affected_roads = Column(Integer, default=1)

    station = relationship("Station", foreign_keys=[station_id])

class CitizenReport(Base):
    __tablename__ = "citizen_reports"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    report_type = Column(String, nullable=False)
    description = Column(String, nullable=True)
    severity = Column(Integer, nullable=False)
    photo_url = Column(String, nullable=True)
    reporter_name = Column(String, nullable=False)
    state = Column(String, nullable=True)
    district = Column(String, nullable=True)
    city = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    landmark = Column(String, nullable=True)
    location = Column(String, nullable=True)
    ai_analysis = Column(String, nullable=True)

    # No foreign key to station; location fields are free text

class Evacuation(Base):
    __tablename__ = "evacuations"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"), unique=True, nullable=False)
    primary_route_distance_km = Column(Float, default=0)
    primary_route_eta_h = Column(Float, default=0)
    alternate_route_distance_km = Column(Float, default=0)
    alternate_route_eta_h = Column(Float, default=0)
    nearest_camp_name = Column(String, default="")
    nearest_camp_distance_km = Column(Float, default=0)
    nearest_camp_capacity = Column(Integer, default=0)
    population_to_evacuate = Column(Integer, default=0)

    station = relationship("Station", backref="evacuation", foreign_keys=[station_id])
