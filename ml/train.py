"""
NIRAKSHA - Real Landslide Susceptibility Machine Learning Training Pipeline
Trains and compares Logistic Regression, Random Forest, Gradient Boosting, and XGBoost
using authentic open-access landslide conditioning data.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix
)

# Optional XGBoost import
try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "landslide" / "processed" / "processed_dataset.csv"
ML_DIR = BASE_DIR / "ml"
ML_DIR.mkdir(parents=True, exist_ok=True)

MODEL_OUTPUT_PATH = ML_DIR / "model.pkl"
METRICS_OUTPUT_PATH = ML_DIR / "metrics.json"
IMPORTANCE_OUTPUT_PATH = ML_DIR / "feature_importance.json"
INFO_OUTPUT_PATH = ML_DIR / "model_info.json"


def load_and_validate_data():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}. Run prepare_data script first.")
    
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded dataset: {df.shape[0]} rows, {df.shape[1]} columns")
    print(f"Columns: {list(df.columns)}")
    
    # Target validation
    target_col = "landslide"
    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in dataset")
        
    class_counts = df[target_col].value_counts().to_dict()
    print(f"Class distribution: {class_counts}")
    
    features = [c for c in df.columns if c != target_col]
    X = df[features]
    y = df[target_col]
    
    return X, y, features


def train_and_evaluate():
    print("=" * 60)
    print("NIRAKSHA ML PIPELINE TRAINING")
    print("=" * 60)
    
    X, y, feature_names = load_and_validate_data()
    
    # Stratified 80/20 train/test split with fixed seed for reproducibility
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Training set: {X_train.shape[0]} samples | Testing set: {X_test.shape[0]} samples")
    
    # Define candidates
    candidate_models = {
        "Logistic Regression": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(random_state=42, max_iter=1000))
        ]),
        "Random Forest": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", RandomForestClassifier(n_estimators=150, max_depth=8, min_samples_split=4, random_state=42))
        ]),
        "Gradient Boosting": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", GradientBoostingClassifier(n_estimators=120, max_depth=4, learning_rate=0.08, random_state=42))
        ])
    }
    
    if HAS_XGB:
        candidate_models["XGBoost"] = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", XGBClassifier(n_estimators=120, max_depth=4, learning_rate=0.08, eval_metric="logloss", random_state=42))
        ])
        
    results = {}
    fitted_pipelines = {}
    
    print("\nTraining candidate models...")
    for name, pipe in candidate_models.items():
        pipe.fit(X_train, y_train)
        fitted_pipelines[name] = pipe
        
        # Predictions
        y_pred = pipe.predict(X_test)
        y_proba = pipe.predict_proba(X_test)[:, 1] if hasattr(pipe, "predict_proba") else None
        
        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        auc = float(roc_auc_score(y_test, y_proba)) if y_proba is not None else None
        cm = confusion_matrix(y_test, y_pred).tolist()
        
        results[name] = {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4) if auc else None,
            "confusion_matrix": cm  # [[TN, FP], [FN, TP]]
        }
        
        print(f"\n--- {name} ---")
        print(f"Accuracy:  {acc*100:.2f}%")
        print(f"Precision: {prec*100:.2f}%")
        print(f"Recall:    {rec*100:.2f}%  (Hazard sensitivity)")
        print(f"F1-Score:  {f1*100:.2f}%")
        if auc:
            print(f"ROC-AUC:   {auc:.4f}")
        print(f"Confusion Matrix [TN, FP / FN, TP]: {cm}")

    # Model Selection: Prioritize high Recall for early landslide warning, then F1-score
    # In disaster warning, False Negatives (missed landslides) have life-safety consequences
    def selection_key(item):
        m = item[1]
        # Recall weighted higher (0.6 * recall + 0.4 * f1)
        return (0.6 * m["recall"]) + (0.4 * m["f1_score"])
    
    best_name, best_metrics = max(results.items(), key=selection_key)
    best_pipe = fitted_pipelines[best_name]
    
    print("\n" + "=" * 60)
    print(f"SELECTED BEST MODEL: {best_name}")
    print(f"Selection Reason: Maximized Recall ({best_metrics['recall']*100:.2f}%) to minimize false negative risk in early warning, with F1={best_metrics['f1_score']*100:.2f}%.")
    print("=" * 60)
    
    # Extract feature importance from the best model (or RF / GB if linear)
    classifier = best_pipe.named_steps["clf"]
    if hasattr(classifier, "feature_importances_"):
        raw_importances = classifier.feature_importances_
    elif hasattr(classifier, "coef_"):
        raw_importances = np.abs(classifier.coef_[0])
    else:
        # Fallback to Random Forest feature importances
        rf_clf = fitted_pipelines["Random Forest"].named_steps["clf"]
        raw_importances = rf_clf.feature_importances_
        
    feat_imp = []
    for feat, imp in zip(feature_names, raw_importances):
        feat_imp.append({"feature": feat, "importance": round(float(imp), 4)})
    feat_imp.sort(key=lambda x: x["importance"], reverse=True)
    
    print("\nTop Contributing Factors (Feature Importance):")
    for item in feat_imp[:5]:
        print(f"  - {item['feature']}: {item['importance']*100:.2f}%")
        
    # Save artifacts
    # 1. Model pipeline
    joblib.dump({
        "pipeline": best_pipe,
        "feature_names": feature_names,
        "selected_model": best_name,
        "trained_at": datetime.utcnow().isoformat()
    }, MODEL_OUTPUT_PATH)
    print(f"\nSaved model artifact to: {MODEL_OUTPUT_PATH}")
    
    # 2. Metrics
    metrics_data = {
        "selected_model": best_name,
        "selection_rationale": f"Selected for optimal Recall ({best_metrics['recall']*100:.1f}%) in early hazard warning, with balanced F1-score ({best_metrics['f1_score']*100:.1f}%) and ROC-AUC ({best_metrics['roc_auc']:.4f}).",
        "trained_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "metrics": best_metrics,
        "all_models": results
    }
    with open(METRICS_OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)
    print(f"Saved metrics to: {METRICS_OUTPUT_PATH}")
    
    # 3. Feature Importance
    with open(IMPORTANCE_OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(feat_imp, f, indent=2)
    print(f"Saved feature importance to: {IMPORTANCE_OUTPUT_PATH}")
    
    # 4. Model Info / Metadata
    model_info = {
        "dataset_name": "Landslide Susceptibility Conditioning Factor Dataset",
        "dataset_source": "Zenodo Open Access Repository",
        "doi": "10.5281/zenodo.21828382",
        "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
        "regional_reference": "Southern Sikkim State Landslide Inventory (Zenodo 10.5281/zenodo.8169506, NER India)",
        "total_records": len(X),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "features": feature_names,
        "target_variable": "landslide (0: Stable / Non-Landslide, 1: Landslide Occurrence)",
        "models_compared": list(candidate_models.keys()),
        "selected_model": best_name,
        "training_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "retrain_command": "python ml/train.py",
        "important_limitations": (
            "This system estimates landslide susceptibility and relative risk from available environmental "
            "and terrain conditioning factors. It is a decision-support prototype and does not guarantee "
            "the exact physical occurrence, location, or timestamp of a landslide."
        )
    }
    with open(INFO_OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(model_info, f, indent=2)
    print(f"Saved model info to: {INFO_OUTPUT_PATH}")
    
    return metrics_data


if __name__ == "__main__":
    train_and_evaluate()
