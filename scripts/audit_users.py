import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load env from backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "smai_auth")

async def audit_users():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    selections_collection = db['selections']

    emails = ["ajay@gmail.com", "deepakbhimavarapu@gmail.com"]
    
    print("\n--- Raw Selection Audit ---\n")
    for email in emails:
        print(f"User: {email}")
        cursor = selections_collection.find({"email": email})
        user_selections = await cursor.to_list(length=100)
        print(f"Total Tasks Selected: {len(user_selections)}")
        for s in user_selections:
            print(f"  - {s['date']} | {s['slot_id']} | {s['task_name']}")
        print("-" * 30)

    client.close()

if __name__ == "__main__":
    asyncio.run(audit_users())
