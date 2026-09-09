# Cost Overrun Early-Warning System (SIH PS2026103)

This repository contains an end-to-end Machine Learning pipeline and API backend designed to predict cost overruns in large-scale infrastructure projects. It is built as a solution for **Smart India Hackathon (SIH) Problem Statement PS2026103**.

## 🚀 Overview

The system processes raw PDF Flash Reports (from PAIMANA/MOSPI), structures the data, trains predictive models, and serves inferences via a FastAPI backend equipped with SHAP explainability. 

### What We Accomplished
1. **Automated Document Intelligence**: Extracted 21,000+ structured tabular records across 17 massive PDFs using `pymupdf` and advanced Regex pattern matching.
2. **Data De-duplication & Leakage Prevention**: Merged multi-month report snapshots into a canonical project dataset (2,233 unique projects), strictly separating early-warning initial features (for training) from final historical outcomes (for target labeling).
3. **Machine Learning Pipeline**: Trained and evaluated Logistic Regression, Random Forest, and Gradient Boosting models. Achieved an impressive **0.930 ROC-AUC** using Random Forest to detect high-risk projects.
4. **FastAPI Inference Backend**: Deployed a production-ready API that deserializes the ML model, processes incoming project proposals, and uses SHAP `TreeExplainer` to explicitly identify the primary risk factors for the web dashboard.

---

## 🛠️ How It Works

### 1. Data Extraction (`batch_parse_pdfs.py`)
Parses `2025-26/` and `2026-27/` Flash Report PDFs. It dynamically identifies "Ministry-wise", "State-wise", and "Detailed Project" tables, cleanses the strings, and dumps the raw data into CSVs.

### 2. ML Pipeline (`build_ml_pipeline.py`)
- Reads the raw CSVs.
- Cleans and deduplicates the data into chronologically sorted snapshots (`output/canonical_snapshots.csv`) and finalized historical projects (`output/canonical_projects.csv`).
- Engineers leakage-safe features mapping initial project parameters (Sector, State, Approved Cost) to eventual cost overruns.
- Trains a `scikit-learn` ColumnTransformer & Random Forest pipeline and exports it as `best_classification_pipeline.pkl`.

### 3. API Backend (`api/main.py`)
A fast, asynchronous HTTP server using **FastAPI**. It loads the `.pkl` pipeline into memory on startup and provides an endpoint `POST /api/v1/predict/overrun-risk`. The endpoint accepts project constraints and returns a risk probability, a categorical risk level, and an array of explicit SHAP feature explanations (e.g. "Approved cost decreases risk").

---

## 💻 How to Run

### 1. Environment Setup
Ensure you have Python 3.9+ installed. Create a virtual environment and install the dependencies.
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Run the FastAPI Backend Server
To start the inference API locally on port 8000:
```bash
# Make the launch script executable (only needed once)
chmod +x run_api.sh

# Run the server
./run_api.sh
```
- **API Health Check**: `http://127.0.0.1:8000/health`
- **Swagger Documentation**: `http://127.0.0.1:8000/docs`

#### Example API Request
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/predict/overrun-risk" \
     -H "Content-Type: application/json" \
     -d '{
           "sector": "Railways", 
           "state": "Maharashtra", 
           "implementing_agency": "Central Railway", 
           "approved_cost": 500.5, 
           "planned_duration_months": 36
         }'
```

### 3. (Optional) Re-train the Machine Learning Models
If you add new PDF datasets or want to retrain the models from scratch, simply run:
```bash
python3 build_ml_pipeline.py
```
This will automatically re-generate all reports, retrain the models, and overwrite the serialized pipeline in the `output/models/` directory.

---

## 📂 Repository Structure

- `api/`: FastAPI application containing the `main.py` entry point and `schemas.py` Pydantic validators.
- `build_ml_pipeline.py`: The core Data Engineering and ML training pipeline.
- `batch_parse_pdfs.py`: Script to iterate over directories of PDFs and parse them into CSVs.
- `output/`: Contains the canonical ML datasets, Data Quality reports, and the `.pkl` serialized models.
- `master_*.csv`: The massive raw CSV files extracted from the PDFs.
- `requirements.txt`: Python package dependencies.
- `run_api.sh`: Convenience bash script to launch Uvicorn.
