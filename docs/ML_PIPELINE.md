# NIRAKSHA ML Pipeline — Technical Documentation

## Overview

NIRAKSHA v2.0 uses a real trained machine learning model for landslide susceptibility prediction. This document describes the dataset, feature engineering, model selection, and inference pipeline.

---

## Dataset

| Property | Value |
|----------|-------|
| **Primary Source** | Zenodo DOI: [10.5281/zenodo.21828382](https://doi.org/10.5281/zenodo.21828382) |
| **License** | Creative Commons Attribution 4.0 International (CC BY 4.0) |
| **Total Records** | 859 samples |
| **Train / Test Split** | 80% / 20% (687 train, 172 test) |
| **Regional Reference** | Southern Sikkim Landslide Inventory — Zenodo [10.5281/zenodo.8169506](https://doi.org/10.5281/zenodo.8169506) |

### Features (Conditioning Factors)

| Feature | Description | Range |
|---------|-------------|-------|
| `elevation` | Terrain elevation (m) | 50–5000 m |
| `slope` | Slope angle (°) | 0–90° |
| `aspect` | Slope facing direction (°) | 0–360° |
| `curvature` | Surface curvature | −10 to +10 |
| `twi` | Topographic Wetness Index | 0–30 |
| `distance_to_rivers` | Distance to nearest river (m) | 0–10,000 m |
| `annual_rainfall` | Mean annual precipitation (mm) | 0–10,000 mm |
| `event_rainfall` | Triggering event rainfall (mm) | 0–500 mm |
| `ndvi` | Normalized Difference Vegetation Index | −1 to +1 |
| `lulc` | Land Use/Land Cover class (1–7) | 1–7 |

### Target Variable

- `0` — Stable / Non-Landslide location
- `1` — Landslide Occurrence

---

## Model Training (`ml/train.py`)

Four models were trained and compared:

| Model | Accuracy | Recall | F1 | AUC-ROC |
|-------|----------|--------|-----|---------|
| Logistic Regression | 78.49% | 77.91% | 78.36% | 0.8671 |
| Random Forest | 84.30% | 81.40% | 83.83% | 0.9031 |
| **Gradient Boosting** ✓ | **84.88%** | **84.88%** | **84.88%** | **0.9075** |
| XGBoost | 83.14% | 80.23% | 82.63% | 0.9051 |

### Why Gradient Boosting?

Selected for optimal **Recall** in early warning context — minimising false negatives (missed landslides) is the priority safety objective. Balanced F1-score and highest AUC-ROC among tested models.

### Pipeline Architecture

```
StandardScaler → GradientBoostingClassifier
```

- Hyperparameters: default scikit-learn parameters
- Preprocessing: StandardScaler normalises all 10 features
- Artifacts saved: `ml/model.pkl`, `ml/metrics.json`, `ml/feature_importance.json`, `ml/model_info.json`

---

## Feature Importance

| Rank | Feature | Importance |
|------|---------|-----------|
| 1 | LULC | 37.46% |
| 2 | Elevation | 18.00% |
| 3 | Annual Rainfall | 9.87% |
| 4 | Distance to Rivers | 7.02% |
| 5 | NDVI | 6.65% |
| 6 | Slope | ~6% |
| 7–10 | TWI, Aspect, Curvature, Event Rainfall | <5% each |

---

## Inference Module (`ml/model.py`)

The `LandslidePredictor` class:
1. Loads `ml/model.pkl` at startup
2. Maps sensor/API input fields → model feature names
3. Scales features through the Pipeline's StandardScaler
4. Returns `risk_score` (0–100), `risk_level`, `probability`, and `top_contributing_factors`

### Risk Tiers

| Score Range | Risk Level |
|-------------|-----------|
| 0–24.9 | LOW |
| 25–49.9 | MODERATE |
| 50–74.9 | HIGH |
| 75–100 | CRITICAL |

### Sensor → Feature Mapping (Simulation)

Live sensor readings use the following proxy mappings:
- `soil_moisture × 15.0` → `twi` (Topographic Wetness Index proxy)
- `daily_rainfall` → `event_rainfall`
- `daily_rainfall × 20.0` → `annual_rainfall` (scaled from daily reading)
- `distance_to_road` → `distance_to_rivers` (nearest infrastructure proxy)

---

## Retraining

To retrain the model on updated data:

```bash
.venv\Scripts\python.exe ml/train.py
```

The script automatically:
1. Loads `data/landslide/processed/processed_dataset.csv`
2. Trains all 4 models
3. Selects the best by AUC-ROC
4. Saves artifacts to `ml/`

---

## Limitations

- Model trained on geospatially limited dataset; may not fully generalise to all 8 NER states
- Live sensor readings are simulated — real IoT telemetry required for production deployment
- Temporal dynamics (soil saturation buildup over days) not modelled
- This is a decision-support prototype — human expert review mandatory before issuing evacuation orders
