import uvicorn
import asyncio
import aiohttp
import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

async def test_api():
    # Wait for server to start
    await asyncio.sleep(2)
    
    # Test image path
    image_path = project_root / "models" / "image-to-text" / "exams" / "deep" / "deep1.jpg"
    
    if not image_path.exists():
        print(f"Error: Test image not found at {image_path}")
        return
    
    print(f"Testing API with image: {image_path}")
    
    async with aiohttp.ClientSession() as session:
        # Test health endpoint
        async with session.get("http://localhost:8000/health") as response:
            health = await response.json()
            print(f"Health check response: {health}")
        
        # Test exam processing endpoint
        files = {'file': open(image_path, 'rb')}
        async with session.post("http://localhost:8000/process-exam/", data=files) as response:
            result = await response.json()
            print("\nExam processing result:")
            print(result)

async def main():
    # Start server in the background
    server = uvicorn.Server(
        config=uvicorn.Config(
            "apis.teacher_api:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            reload_dirs=[str(project_root)]  # Watch the project root for changes
        )
    )
    
    # Run server and test client concurrently
    await asyncio.gather(
        server.serve(),
        test_api()
    )

if __name__ == "__main__":
    asyncio.run(main())
