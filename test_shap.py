import joblib
import shap
import warnings
warnings.filterwarnings('ignore')

model = joblib.load('output/models/best_classification_pipeline.pkl')
try:
    explainer = shap.TreeExplainer(model.named_steps['classifier'])
    print("SUCCESS")
except Exception as e:
    print("FAILED:", e)
