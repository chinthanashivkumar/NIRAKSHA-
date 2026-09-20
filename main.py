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
from routers import chat, calls, weather_forecast, research
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
app.include_router(calls.router)
app.include_router(weather_forecast.router)
app.include_router(research.router)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(simulate_live_data())

# Serve built frontend if present (for single-service full-stack deployment on Render)
frontend_dist = Path(__file__).parent / "frontend" / "dist"
if frontend_dist.exists():
    from fastapi.responses import FileResponse
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api") or full_path.startswith("uploads") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")
        target_file = frontend_dist / full_path
        if full_path and target_file.is_file():
            return FileResponse(target_file)
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    def read_root():
        return {"message": "NIRAKSHA Landslide Early Warning System API v2.0 — ML-powered"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
