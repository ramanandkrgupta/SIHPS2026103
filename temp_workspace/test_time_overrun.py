import asyncio
from api.main import predict_time_overrun
from api.schemas import ProjectInferenceRequest
import joblib
import api.main

async def test():
    # Mock load
    api.main.time_overrun_model = joblib.load("output/models/time_overrun_gb.pkl")
    
    req = ProjectInferenceRequest(project_id=400005)
    try:
        res = await predict_time_overrun(req)
        print(res)
    except Exception as e:
        print("ERROR:", e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
