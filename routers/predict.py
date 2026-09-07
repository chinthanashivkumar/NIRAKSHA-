import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from schemas import PredictRequest, PredictResponse, ModelMetricsResponse, ModelInfoResponse
from ml.model import predictor

router = APIRouter(prefix="/api/predict", tags=["Prediction"])

ML_DIR = Path(__file__).parent.parent / "ml"


@router.post("", response_model=PredictResponse)
def predict_risk(request: PredictRequest):
    """Run landslide risk prediction using the real trained Gradient Boosting model.
    Risk score comes directly from the trained ML model probability.
    """
    input_data = request.model_dump()
    result = predictor.predict(input_data)
    return PredictResponse(**result)


@router.get("/performance", response_model=ModelMetricsResponse)
def get_model_performance():
    """Return real model evaluation metrics from ml/metrics.json."""
    metrics_path = ML_DIR / "metrics.json"
    feature_path = ML_DIR / "feature_importance.json"
    info_path    = ML_DIR / "model_info.json"

    if not metrics_path.exists():
        raise HTTPException(status_code=503, detail="Metrics file not found. Run ml/train.py first.")

    with open(metrics_path) as f:
        raw = json.load(f)

    feature_importance = []
    if feature_path.exists():
        with open(feature_path) as f:
            feature_importance = json.load(f)

    training_samples = 687
    test_samples = 172
    if info_path.exists():
        with open(info_path) as f:
            info = json.load(f)
            training_samples = info.get("train_samples", training_samples)
            test_samples = info.get("test_samples", test_samples)

    # Normalise key names from actual metrics.json structure
    # metrics.json uses "all_models" with "roc_auc"; schema expects "models" with "auc_roc"
    raw_models = raw.get("all_models", {})
    normalised_models = {}
    selected_name = raw.get("selected_model", "Gradient Boosting")

    for model_label, m in raw_models.items():
        # Convert display name -> key
        key = model_label.lower().replace(" ", "_")
        normalised_models[key] = {
            "accuracy":  m.get("accuracy", 0),
            "recall":    m.get("recall", 0),
            "f1_score":  m.get("f1_score", 0),
            "auc_roc":   m.get("roc_auc", 0),
            "precision": m.get("precision", 0),
            "confusion_matrix": m.get("confusion_matrix", [[0,0],[0,0]]),
            "display_name": model_label,
        }

    # Determine selected model key
    selected_key = selected_name.lower().replace(" ", "_")
    selected_cm = normalised_models.get(selected_key, {}).get("confusion_matrix", [[0,0],[0,0]])

    return ModelMetricsResponse(
        selected_model=selected_key,
        models=normalised_models,
        feature_importance=feature_importance,
        confusion_matrix=selected_cm,
        training_samples=training_samples,
        test_samples=test_samples,
    )


@router.get("/info", response_model=ModelInfoResponse)
def get_model_info():
    """Return model metadata from ml/model_info.json (normalised to schema)."""
    info_path = ML_DIR / "model_info.json"
    metrics_path = ML_DIR / "metrics.json"

    if not info_path.exists():
        raise HTTPException(status_code=503, detail="Model info file not found. Run ml/train.py first.")

    with open(info_path) as f:
        info = json.load(f)

    accuracy = 0.8488
    auc_roc  = 0.9075
    if metrics_path.exists():
        with open(metrics_path) as f:
            m = json.load(f)
            accuracy = m.get("metrics", {}).get("accuracy", accuracy)
            auc_roc  = m.get("metrics", {}).get("roc_auc", auc_roc)

    # Build limitations list from single string or list
    raw_limitations = info.get("important_limitations", "")
    if isinstance(raw_limitations, str):
        limitations = [
            raw_limitations,
            "Simulated sensor readings are used for live demo; replace with real IoT telemetry in production.",
            "Model was evaluated on a held-out 20% test split from the same distribution as training data.",
            "This system is a decision-support prototype — human expert review is mandatory before evacuation orders.",
        ]
    else:
        limitations = raw_limitations

    return ModelInfoResponse(
        model_name=info.get("selected_model", "Gradient Boosting"),
        version="2.0.0",
        algorithm="GradientBoostingClassifier (scikit-learn)",
        dataset_source=info.get("dataset_source", "Zenodo Open Access Repository"),
        dataset_size=info.get("total_records", 859),
        features=info.get("features", []),
        target=info.get("target_variable", "landslide"),
        trained_at=info.get("training_date", "2026-09-05"),
        accuracy=accuracy,
        auc_roc=auc_roc,
        limitations=limitations,
    )
