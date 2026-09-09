from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ProjectInferenceRequest(BaseModel):
    sector: str = Field(..., description="Project sector (e.g., Railways, Road Transport and Highways)")
    state: str = Field(..., description="State where the project is being executed")
    implementing_agency: str = Field(..., description="Agency responsible for the project")
    approved_cost: float = Field(..., description="Original approved budget in Rs. Crore")
    planned_duration_months: int = Field(..., description="Planned duration of the project in months")

class FeatureExplanation(BaseModel):
    feature_name: str = Field(..., description="Name of the feature")
    feature_value: Any = Field(..., description="Input value provided")
    shap_value: float = Field(..., description="SHAP attribution value (positive means it increases overrun risk)")
    impact_direction: str = Field(..., description="'Increases Risk' or 'Decreases Risk'")

class PredictionResponse(BaseModel):
    risk_probability: float = Field(..., description="Probability of cost overrun (0.0 to 1.0)")
    risk_level: str = Field(..., description="Categorical risk level (Low, Medium, High)")
    top_factors: List[FeatureExplanation] = Field(..., description="Top contributing factors to the risk score")
