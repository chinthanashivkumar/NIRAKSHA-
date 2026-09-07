from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import os
from pathlib import Path
from database import engine, Base, SessionLocal
from seed import seed_database
from routers import predict, stations, alerts, weather, reports, sync, timeline, resources
from routers import chat
from services.simulation import simulate_live_data

# Create necessary directories
Path("uploads").mkdir(exist_ok=True)

# Load .env if present
try:
    from pathlib import Path as _P
    env_file = _P(".env")
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())
except Exception:
    pass

# Create tables
Base.metadata.create_all(bind=engine)

# Seed database on startup
db = SessionLocal()
seed_database(db)
db.close()

app = FastAPI(title="NIRAKSHA — Landslide Early Warning System API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded photos as static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(predict.router)
app.include_router(stations.router)
app.include_router(alerts.router)
app.include_router(weather.router)
app.include_router(reports.router)
app.include_router(sync.router)
app.include_router(chat.router)
app.include_router(timeline.router)
app.include_router(resources.router)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(simulate_live_data())

@app.get("/")
def read_root():
    return {"message": "NIRAKSHA Landslide Early Warning System API v2.0 — ML-powered"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
