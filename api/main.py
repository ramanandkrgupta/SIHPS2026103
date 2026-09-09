from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import joblib
import pandas as pd
import numpy as np
import shap
import os

from api.schemas import ProjectInferenceRequest, PredictionResponse, FeatureExplanation

# Global variables to hold model and explainer
ml_pipeline = None
explainer = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global ml_pipeline, explainer
    model_path = "output/models/best_classification_pipeline.pkl"
    if os.path.exists(model_path):
        print(f"Loading ML pipeline from {model_path}...")
        ml_pipeline = joblib.load(model_path)
        
        # Initialize SHAP explainer
        # The pipeline has steps: [('preprocessor', ColumnTransformer), ('classifier', RandomForest)]
        classifier = ml_pipeline.named_steps.get('classifier')
        if classifier:
            try:
                explainer = shap.TreeExplainer(classifier)
                print("SHAP explainer initialized.")
            except Exception as e:
                print(f"Warning: Could not initialize SHAP explainer: {e}")
    else:
        print(f"Warning: Model file {model_path} not found. Ensure the ML pipeline has been trained.")
        
    yield
    # Cleanup resources on shutdown (if any)
    ml_pipeline = None
    explainer = None

app = FastAPI(
    title="SIH PS2026103 Cost Overrun Prediction API",
    description="Early-warning system to predict infrastructure project cost overruns.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/predict/overrun-risk", response_model=PredictionResponse)
async def predict_overrun_risk(request: ProjectInferenceRequest):
    if ml_pipeline is None:
        raise HTTPException(status_code=503, detail="Model pipeline is not loaded.")
        
    # Convert Pydantic model to DataFrame
    input_data = pd.DataFrame([{
        "sector": request.sector,
        "state": request.state,
        "implementing_agency": request.implementing_agency,
        "approved_cost": request.approved_cost,
        "planned_duration_months": request.planned_duration_months
    }])
    
    # 1. Prediction
    try:
        # Predict probability of class 1 (is_overrun = True)
        probability = ml_pipeline.predict_proba(input_data)[0][1]
        
        # Categorize risk level
        if probability >= 0.70:
            risk_level = "High"
        elif probability >= 0.40:
            risk_level = "Medium"
        else:
            risk_level = "Low"
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
        
    # 2. Explainability
    explanations = []
    if explainer is not None:
        try:
            # We must pass the transformed data to the explainer
            preprocessor = ml_pipeline.named_steps['preprocessor']
            transformed_data = preprocessor.transform(input_data)
            
            # Get feature names from ColumnTransformer
            # This can be tricky. Let's try get_feature_names_out()
            feature_names = []
            try:
                feature_names = preprocessor.get_feature_names_out()
            except:
                # Fallback if unsupported
                feature_names = [f"Feature_{i}" for i in range(transformed_data.shape[1])]
                
            # Get SHAP values
            shap_output = explainer.shap_values(transformed_data)
            
            # For Random Forest, shap_values might be a list or a 3D array
            if isinstance(shap_output, list) and len(shap_output) > 1:
                class_1_shap = shap_output[1][0]
            elif isinstance(shap_output, np.ndarray) and len(shap_output.shape) == 3:
                class_1_shap = shap_output[0, :, 1]
            else:
                class_1_shap = shap_output[0] if len(np.shape(shap_output)) > 1 else shap_output
                
            # Pair feature names with their shap values
            feature_impacts = list(zip(feature_names, class_1_shap))
            
            # Sort by absolute impact (highest impact first)
            feature_impacts.sort(key=lambda x: abs(x[1]), reverse=True)
            
            # Map back to top original features (approximate)
            # Take top 3
            for fname, shap_val in feature_impacts[:3]:
                # Determine original feature and value
                original_feature_name = fname.split('__')[-1] if '__' in fname else fname
                
                # Determine direction
                direction = "Increases Risk" if shap_val > 0 else "Decreases Risk"
                
                explanations.append(FeatureExplanation(
                    feature_name=original_feature_name,
                    feature_value="Analyzed", # Detailed mapping can be complex with OneHot, so keeping it general
                    shap_value=float(shap_val),
                    impact_direction=direction
                ))
        except Exception as e:
            print(f"Warning: SHAP explanation generation failed: {e}")
            # Non-fatal error, just don't return explanations
            pass
            
    return PredictionResponse(
        risk_probability=float(probability),
        risk_level=risk_level,
        top_factors=explanations
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": ml_pipeline is not None}
