from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import joblib
import pandas as pd
import numpy as np
import shap
import os
import sqlite3
from dotenv import load_dotenv

from api.schemas import ProjectInferenceRequest, PredictionResponse, FeatureExplanation, HistoricalSnapshot

# Attempt to load Google GenAI
try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = None
if genai and GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# Global variables
ml_pipeline = None
explainer = None
DB_PATH = "paimana.db"

@asynccontextmanager
async def lifespan(app: FastAPI):
    global ml_pipeline, explainer
    model_path = "output/models/best_classification_pipeline.pkl"
    if os.path.exists(model_path):
        print(f"Loading ML pipeline from {model_path}...")
        ml_pipeline = joblib.load(model_path)
        classifier = ml_pipeline.named_steps.get('classifier')
        if classifier:
            try:
                explainer = shap.TreeExplainer(classifier)
                print("SHAP explainer initialized.")
            except Exception as e:
                print(f"Warning: Could not initialize SHAP explainer: {e}")
    else:
        print(f"Warning: Model file {model_path} not found.")
        
    yield
    ml_pipeline = None
    explainer = None

app = FastAPI(
    title="PAIMANA AI Project Intelligence API",
    description="Database-backed Early-warning system & LLM Assistant for SIH PS2026103.",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def fetch_project_history(project_id: int):
    """Fetches a project's details and chronological snapshots from SQLite."""
    conn = sqlite3.connect(DB_PATH)
    try:
        # Get baseline project data from 'projects' table
        df_proj = pd.read_sql_query("SELECT * FROM projects WHERE project_id = ?", conn, params=(project_id,))
        # Get chronological snapshots
        df_snaps = pd.read_sql_query("SELECT * FROM project_snapshots WHERE project_id = ? ORDER BY report_date ASC", conn, params=(project_id,))
    finally:
        conn.close()
        
    if df_proj.empty or df_snaps.empty:
        return None, None
    return df_proj, df_snaps

def generate_ai_overview(project_name: str, snapshots: list) -> str:
    """Uses Gemini LLM to generate a qualitative risk overview of the project."""
    if not gemini_client:
        return "LLM integration is currently disabled. Please add a valid GEMINI_API_KEY to the .env file to enable the AI Project Intelligence Assistant."
        
    # Construct a prompt based on the timeline
    history_text = "\n".join([
        f"- {s.report_month}: Physical Progress: {s.physical_progress}%, Financial Progress: {s.financial_progress}%, Expenditure: ₹{s.expenditure}Cr, Revised Cost: ₹{s.revised_cost}Cr"
        for s in snapshots
    ])
    
    prompt = f"""
    You are an AI infrastructure project monitoring assistant for the Government of India (PAIMANA).
    Analyze the following historical timeline of the project "{project_name}".
    
    Timeline History:
    {history_text}
    
    Provide a concise, 3-4 sentence qualitative overview of the project's health. Highlight any stagnation in physical progress, alarming expenditure ratios, or cost revisions that indicate implementation risks. Be objective and prescriptive.
    """
    
    try:
        response = gemini_client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt,
        )
        return response.text
    except Exception as e:
        return f"Warning: LLM generation failed: {e}"

@app.post("/api/v1/predict/overrun-risk", response_model=PredictionResponse)
async def predict_overrun_risk(request: ProjectInferenceRequest):
    if ml_pipeline is None:
        raise HTTPException(status_code=503, detail="Model pipeline is not loaded.")
        
    project_id = request.project_id
    df_proj, df_snaps = fetch_project_history(project_id)
    
    if df_proj is None:
        raise HTTPException(status_code=404, detail=f"Project ID {project_id} not found in database.")
        
    # The ML model expects baseline features (first snapshot) to avoid data leakage
    first_snapshot = df_snaps.iloc[0]
    
    input_data = pd.DataFrame([{
        "sector": first_snapshot['sector'],
        "state": first_snapshot['state'],
        "implementing_agency": first_snapshot['implementing_agency'],
        "approved_cost": first_snapshot['approved_cost'],
        "planned_duration_months": first_snapshot['planned_duration_months']
    }])
    
    # 1. Prediction
    try:
        probability = ml_pipeline.predict_proba(input_data)[0][1]
        
        if probability >= 0.70:
            risk_level = "High"
        elif probability >= 0.40:
            risk_level = "Medium"
        else:
            risk_level = "Low"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
        
    # 2. Explainability (SHAP)
    explanations = []
    if explainer is not None:
        try:
            preprocessor = ml_pipeline.named_steps['preprocessor']
            transformed_data = preprocessor.transform(input_data)
            
            try:
                feature_names = preprocessor.get_feature_names_out()
            except:
                feature_names = [f"Feature_{i}" for i in range(transformed_data.shape[1])]
                
            shap_output = explainer.shap_values(transformed_data)
            
            # For Random Forest, shap_values might be a list or a 3D array
            if isinstance(shap_output, list) and len(shap_output) > 1:
                class_1_shap = shap_output[1][0]
            elif isinstance(shap_output, np.ndarray) and len(shap_output.shape) == 3:
                class_1_shap = shap_output[0, :, 1]
            else:
                class_1_shap = shap_output[0] if len(np.shape(shap_output)) > 1 else shap_output
                
            feature_impacts = list(zip(feature_names, class_1_shap))
            feature_impacts.sort(key=lambda x: abs(x[1]), reverse=True)
            
            filtered_impacts = []
            for fname, shap_val in feature_impacts:
                try:
                    f_idx = list(feature_names).index(fname)
                    f_val = transformed_data[0][f_idx]
                except ValueError:
                    f_val = None
                
                # Filter out One-Hot Encoded features that the project does NOT possess
                if fname.startswith('cat__') and f_val == 0.0:
                    continue
                    
                filtered_impacts.append((fname, shap_val))
            
            for fname, shap_val in filtered_impacts[:5]:
                original_feature_name = fname.split('__')[-1] if '__' in fname else fname
                direction = "Increases Risk" if shap_val > 0 else "Decreases Risk"
                
                explanations.append(FeatureExplanation(
                    feature_name=original_feature_name,
                    feature_value=str(input_data.iloc[0].get(original_feature_name, "Categorical/Transformed")),
                    shap_value=float(shap_val),
                    impact_direction=direction
                ))
        except Exception as e:
            print(f"Warning: SHAP explanation generation failed: {e}")
            
    # 3. Compile Historical Timeline
    timeline = []
    for _, row in df_snaps.iterrows():
        timeline.append(HistoricalSnapshot(
            report_month=str(row['report_month']),
            physical_progress=float(row['physical_progress']) if pd.notna(row['physical_progress']) else 0.0,
            financial_progress=float(row['financial_progress']) if pd.notna(row['financial_progress']) else 0.0,
            expenditure=float(row['expenditure']) if pd.notna(row['expenditure']) else 0.0,
            revised_cost=float(row['revised_cost']) if pd.notna(row['revised_cost']) else 0.0
        ))
        
    # 4. Generate LLM AI Overview
    project_name = str(df_proj.iloc[0].get('project_name', f'Project {project_id}'))
    planned_start_date = str(df_proj.iloc[0].get('planned_start_date', ''))
    
    ai_overview = generate_ai_overview(project_name, timeline)
    
    return PredictionResponse(
        project_id=project_id,
        project_name=project_name,
        planned_start_date=planned_start_date,
        risk_probability=float(probability),
        risk_level=risk_level,
        top_factors=explanations,
        historical_timeline=timeline,
        ai_overview=ai_overview
    )

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "model_loaded": ml_pipeline is not None, 
        "database_connected": os.path.exists(DB_PATH),
        "llm_enabled": gemini_client is not None
    }
