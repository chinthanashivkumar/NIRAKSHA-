"""
NIRAKSHA - Production Landslide Predictor
Loads the trained ML pipeline (trained on authentic landslide conditioning factors)
and performs live susceptibility inference.
"""

import os
import json
import joblib
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "ml" / "model.pkl"
METRICS_PATH = BASE_DIR / "ml" / "metrics.json"
IMPORTANCE_PATH = BASE_DIR / "ml" / "feature_importance.json"
INFO_PATH = BASE_DIR / "ml" / "model_info.json"


class LandslidePredictor:
    def __init__(self):
        self.pipeline = None
        self.feature_names = []
        self.selected_model = "Gradient Boosting"
        self.feature_importance = []
        self.metrics = {}
        self.model_info = {}
        self.load_artifacts()

    def load_artifacts(self):
        if not MODEL_PATH.exists():
            print(f"Warning: Model artifact not found at {MODEL_PATH}. Retraining may be needed.")
            return

        try:
            artifact = joblib.load(MODEL_PATH)
            self.pipeline = artifact["pipeline"]
            self.feature_names = artifact["feature_names"]
            self.selected_model = artifact.get("selected_model", "Gradient Boosting")
            print(f"Loaded real ML model: {self.selected_model}")
        except Exception as e:
            print(f"Error loading model artifact: {e}")

        if IMPORTANCE_PATH.exists():
            try:
                with open(IMPORTANCE_PATH, "r", encoding="utf-8") as f:
                    self.feature_importance = json.load(f)
            except Exception:
                pass

        if METRICS_PATH.exists():
            try:
                with open(METRICS_PATH, "r", encoding="utf-8") as f:
                    self.metrics = json.load(f)
            except Exception:
                pass

        if INFO_PATH.exists():
            try:
                with open(INFO_PATH, "r", encoding="utf-8") as f:
                    self.model_info = json.load(f)
            except Exception:
                pass

    def _format_input(self, input_data: dict) -> pd.DataFrame:
        """
        Maps live station/simulation fields to the trained model's feature schema.
        Handles conversions like daily_rainfall -> event_rainfall, soil_moisture -> TWI proxy.
        """
        # Feature defaults representing average conditions
        defaults = {
            "elevation": 1500.0,
            "slope": 30.0,
            "aspect": 180.0,
            "curvature": 0.0,
            "twi": 4.5,
            "distance_to_rivers": 1500.0,
            "annual_rainfall": 1200.0,
            "event_rainfall": 50.0,
            "ndvi": 0.5,
            "lulc": 30.0
        }

        # Normalize incoming keys (lowercase, strip)
        clean_in = {k.lower().strip(): v for k, v in input_data.items()}

        # Key mappings
        row = {}
        row["elevation"] = float(clean_in.get("elevation", defaults["elevation"]))
        row["slope"] = float(clean_in.get("slope", clean_in.get("slope_angle", defaults["slope"])))
        row["aspect"] = float(clean_in.get("aspect", defaults["aspect"]))
        row["curvature"] = float(clean_in.get("curvature", defaults["curvature"]))

        # TWI / Soil moisture mapping
        if "twi" in clean_in:
            row["twi"] = float(clean_in["twi"])
        elif "soil_moisture" in clean_in:
            # Soil moisture in [0.1, 0.6] scales to TWI range [1.0, 9.0]
            sm = float(clean_in["soil_moisture"])
            row["twi"] = float(1.0 + (sm / 0.6) * 8.0)
        else:
            row["twi"] = defaults["twi"]

        # Drainage / Road distance
        if "distance_to_rivers" in clean_in:
            row["distance_to_rivers"] = float(clean_in["distance_to_rivers"])
        elif "distance_to_road" in clean_in:
            row["distance_to_rivers"] = float(clean_in["distance_to_road"])
        else:
            row["distance_to_rivers"] = defaults["distance_to_rivers"]

        # Rainfall mapping
        if "annual_rainfall" in clean_in:
            row["annual_rainfall"] = float(clean_in["annual_rainfall"])
        elif "rainfall_7day" in clean_in:
            # 7-day rainfall scaled to annual baseline
            r7 = float(clean_in["rainfall_7day"])
            row["annual_rainfall"] = float(800.0 + r7 * 3.5)
        else:
            row["annual_rainfall"] = defaults["annual_rainfall"]

        if "event_rainfall" in clean_in:
            row["event_rainfall"] = float(clean_in["event_rainfall"])
        elif "daily_rainfall" in clean_in:
            row["event_rainfall"] = float(clean_in["daily_rainfall"])
        elif "current_rainfall" in clean_in:
            row["event_rainfall"] = float(clean_in["current_rainfall"])
        else:
            row["event_rainfall"] = defaults["event_rainfall"]

        row["ndvi"] = float(clean_in.get("ndvi", defaults["ndvi"]))
        row["lulc"] = float(clean_in.get("lulc", defaults["lulc"]))

        # Build DataFrame with exact feature order
        df = pd.DataFrame([row])[self.feature_names]
        return df

    def predict(self, input_data: dict) -> dict:
        if self.pipeline is None:
            self.load_artifacts()
            if self.pipeline is None:
                raise RuntimeError("ML Pipeline not available. Retrain using `python ml/train.py`.")

        df_input = self._format_input(input_data)

        # Real model inference
        proba = float(self.pipeline.predict_proba(df_input)[0][1])
        risk_score = round(proba * 100.0, 1)

        # Classification thresholds (project-defined decision tiers)
        if risk_score < 25.0:
            risk_level = "LOW"
        elif risk_score < 50.0:
            risk_level = "MODERATE"
        elif risk_score < 75.0:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        # Determine top factors dynamically based on actual feature importance
        top_factors = [
            item["feature"] for item in self.feature_importance[:3]
        ] if self.feature_importance else ["slope", "elevation", "event_rainfall"]

        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "probability": round(proba, 4),
            "top_contributing_factors": top_factors,
            "selected_model": self.selected_model
        }


# Global predictor instance
predictor = LandslidePredictor()
