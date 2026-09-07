from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
from database import get_db
from models import Station
from schemas import WeatherResponse

router = APIRouter(prefix="/api/weather", tags=["Weather"])

@router.get("/{station_id}", response_model=WeatherResponse)
async def get_real_weather(station_id: int, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    # Open-Meteo API URL
    url = f"https://api.open-meteo.com/v1/forecast?latitude={station.lat}&longitude={station.lon}&current=temperature_2m,precipitation,wind_speed_10m,soil_moisture_0_to_1cm"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            current = data.get("current", {})
            
            return WeatherResponse(
                current_rainfall=current.get("precipitation", 0.0),
                temperature=current.get("temperature_2m", 0.0),
                wind_speed=current.get("wind_speed_10m", 0.0),
                soil_moisture=current.get("soil_moisture_0_to_1cm", 0.3)
            )
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Failed to fetch weather data: {str(e)}")
