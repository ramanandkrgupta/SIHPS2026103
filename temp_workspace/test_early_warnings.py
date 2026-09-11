import asyncio
from api.main import get_early_warnings
import api.main

async def test():
    try:
        res = await get_early_warnings(risk_level="High", limit=2)
        print(res)
    except Exception as e:
        print("ERROR:", e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
