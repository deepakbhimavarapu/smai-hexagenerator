import os
import sys
import json
import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load env from backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "smai_auth")

async def export_bookings(target_date):
    if not MONGODB_URI:
        print("Error: MONGODB_URI not found in .env file.")
        return

    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    selections_collection = db['selections']

    # Load config to get all tasks and slots (optional, but helps show empty slots)
    config_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'config.json')
    try:
        with open(config_path, "r") as f:
            config_data = json.load(f)
    except Exception as e:
        print(f"Error loading config.json: {e}")
        return

    # Find the slots for the target date in config
    day_config = next((d for d in config_data.get("dates", []) if d["date"] == target_date), None)
    if not day_config:
        print(f"No configuration found for date: {target_date}")
        return

    all_tasks = [t["name"] for t in config_data.get("config", {}).get("tasks", [])]
    all_slots = day_config.get("slots", [])

    # Fetch all selections for this date
    cursor = selections_collection.find({"date": target_date})
    selections = await cursor.to_list(length=5000)

    # Group emails by (task, slot_id)
    # Key format: (task_name, slot_id)
    bookings = {}
    for s in selections:
        key = (s['task_name'], s['slot_id'])
        if key not in bookings:
            bookings[key] = []
        bookings[key].append(s['email'])

    # Format Output
    print(f"\n--- Booking Report for {target_date} ---\n")
    
    # We iterate through all tasks and slots to ensure we show the full schedule
    for task in all_tasks:
        for slot in all_slots:
            slot_label = f"{slot['start']} - {slot['end']}"
            key = (task, slot['id'])
            emails = bookings.get(key, [])
            
            if emails:
                emails_str = ", ".join(emails)
                print(f"{task}, {slot_label}, {emails_str}")
            # Optional: uncomment if you want to see empty slots
            # else:
            #     print(f"{task}, {slot_label}, EMPTY")

    client.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python export_bookings.py YYYY-MM-DD")
        print("Example: python export_bookings.py 2026-05-03")
    else:
        date_input = sys.argv[1]
        asyncio.run(export_bookings(date_input))
