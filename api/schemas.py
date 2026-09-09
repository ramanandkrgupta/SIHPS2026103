from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ProjectInferenceRequest(BaseModel):
    project_id: int = Field(..., description="Unique 6-digit identifier for the infrastructure project")

class FeatureExplanation(BaseModel):
    feature_name: str = Field(..., description="Name of the feature")
    feature_value: Any = Field(..., description="Input value provided")
    shap_value: float = Field(..., description="SHAP attribution value (positive means it increases overrun risk)")
    impact_direction: str = Field(..., description="'Increases Risk' or 'Decreases Risk'")
    
class HistoricalSnapshot(BaseModel):
    report_month: str
    physical_progress: float
    financial_progress: float
    expenditure: float
    revised_cost: float

class PredictionResponse(BaseModel):
    project_id: int
    project_name: str
    planned_start_date: Optional[str] = Field(None, description="Project Date of Approval/Commissioning")
    risk_probability: float = Field(..., description="Probability of cost overrun (0.0 to 1.0)")
    risk_level: str = Field(..., description="Categorical risk level (Low, Medium, High)")
    top_factors: List[FeatureExplanation] = Field(..., description="Top contributing factors to the risk score")
    historical_timeline: List[HistoricalSnapshot] = Field(..., description="Chronological timeline of project updates")
    ai_overview: str = Field(..., description="LLM-generated qualitative analysis of project history and risks")
