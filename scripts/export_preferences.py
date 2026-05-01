import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load env from backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "smai_auth")

async def export_preferences():
    if not MONGODB_URI:
        print("Error: MONGODB_URI not found in .env file.")
        return

    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    users_collection = db['users']

    # Fetch all users who have a preference set
    cursor = users_collection.find({"preference": {"$exists": True, "$ne": None}})
    users = await cursor.to_list(length=5000)

    print(f"\n--- Student Evaluation Preferences ---\n")
    print(f"{'S.No':<6} | {'Email':<35} | {'Preference'}")
    print("-" * 60)

    for idx, user in enumerate(users, 1):
        email = user.get("email", "N/A")
        pref = user.get("preference", "N/A")
        # Format for readability
        display_pref = "End-Sem (Exam)" if pref == "exam" else "Live Oral Defense"
        print(f"{idx:<6} | {email:<35} | {display_pref}")

    print(f"\nTotal Responses: {len(users)}")
    client.close()

if __name__ == "__main__":
    asyncio.run(export_preferences())
