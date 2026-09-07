# Model Card — NIRAKSHA Landslide Risk Predictor v2.0

## Model Overview

| Property | Value |
|----------|-------|
| **Model Name** | NIRAKSHA Landslide Risk Predictor |
| **Version** | 2.0.0 |
| **Algorithm** | Gradient Boosting Classifier (scikit-learn) |
| **Task** | Binary Classification (Landslide / No Landslide) |
| **Trained At** | 2026-09-05 |
| **Author** | NIRAKSHA SIH 2026 Team |

---

## Intended Use

**Primary Use:** Landslide susceptibility estimation and early warning support for Northeastern India (NER) disaster management authorities.

**Intended Users:** SDMA/DDMA officers, NDRF coordinators, civil protection officials.

**Out-of-Scope Use:**
- Not for insurance or legal determinations
- Not a replacement for field geological surveys
- Not validated for areas outside NER India

---

## Training Data

| Property | Value |
|----------|-------|
| **Source** | Zenodo DOI: 10.5281/zenodo.21828382 |
| **License** | CC BY 4.0 |
| **Size** | 859 samples (687 train / 172 test) |
| **Features** | 10 terrain & climate conditioning factors |
| **Label Balance** | Approximately 50/50 landslide vs. stable |
| **Regional Reference** | Southern Sikkim Landslide Inventory (Zenodo 10.5281/zenodo.8169506) |

---

## Performance

Evaluated on held-out 20% test set (172 samples, same distribution as training data):

| Metric | Value |
|--------|-------|
| Accuracy | 84.88% |
| Recall (sensitivity) | 84.88% |
| F1 Score | 84.88% |
| AUC-ROC | 0.9075 |

**Confusion Matrix:**
```
                Predicted No Slide   Predicted Landslide
Actual No Slide        73                  13
Actual Landslide       13                  73
```

---

## Ethical Considerations

- **False Negatives (missed landslides):** Highest safety risk — model is selected to maximise Recall.
- **False Positives (unnecessary alerts):** Cause alert fatigue and economic disruption — monitored via Precision.
- **Bias:** Training data is geographically limited; performance may degrade in regions with different geology or climate patterns than the training set.
- **Human Oversight:** All model predictions must be reviewed by qualified disaster management personnel before issuing evacuation orders.

---

## Limitations

1. Model estimates susceptibility from static terrain factors + rainfall proxies — it does not simulate real-time slope failure physics.
2. Live sensor inputs are simulated in the demo — production deployment requires real IoT soil moisture and rainfall sensors.
3. Temporal dynamics (multi-day rainfall accumulation, soil saturation) are not explicitly modelled.
4. Model was tested on a single held-out split; cross-validated performance may differ.
5. Geospatial generalisation across all 8 NER states has not been validated.

---

## Caveats & Recommendations

> **This system is a decision-support tool, not an autonomous decision-maker.**
> - Always verify alerts with field teams before issuing evacuation orders.
> - Retrain periodically as new landslide inventory data becomes available.
> - Monitor model drift if deployed on real IoT data significantly different from training distribution.

---

## Provenance

| File | Description |
|------|-------------|
| `ml/model.pkl` | Trained scikit-learn Pipeline (StandardScaler + GBC) |
| `ml/metrics.json` | Evaluation metrics for all 4 candidate models |
| `ml/feature_importance.json` | Feature importance ranking from selected model |
| `ml/model_info.json` | Metadata, dataset provenance, limitations |
| `ml/train.py` | Full training script (run to reproduce) |
| `data/landslide/processed/processed_dataset.csv` | Cleaned training dataset |
