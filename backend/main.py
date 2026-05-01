import os
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from pydantic import EmailStr
from database import db
from fastapi.middleware.cors import CORSMiddleware
from utils import generate_hexa, encode_hexa, get_base_url, decode_hexa
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Email Auth Scoped Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    await db.connect_db()

@app.on_event("shutdown")
async def shutdown_db_client():
    await db.close_db()

@app.get("/{emailid}")
async def process_email(emailid: str):
    if "@" not in emailid or "." not in emailid:
        raise HTTPException(status_code=400, detail="Invalid email format.")

    # New Robust Logic: Encrypt the email directly into the link
    # This makes the link permanent and doesn't require a DB lookup to identify the user
    try:
        encoded_hexa = encode_hexa(emailid)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Encoding error: {str(e)}")
    
    # Still update the DB for activity tracking
    users_collection = await db.get_users_collection()
    await users_collection.update_one(
        {"email": emailid},
        {"$set": {"last_active": datetime.utcnow()}},
        upsert=True
    )

    base_url = get_base_url()
    response_url = f"{base_url}/{encoded_hexa}"
    return {"url": response_url}

# --- New Endpoints ---

@app.post("/api/verify")
async def verify_user(request: Request):
    data = await request.json()
    encoded_code = data.get("code")
    if not encoded_code:
        raise HTTPException(status_code=400, detail="Code is required.")

    try:
        decoded_val = decode_hexa(encoded_code)
        
        # 1. New Logic: check if decoded value is an email directly
        if "@" in decoded_val and "." in decoded_val:
            return {"email": decoded_val, "role": "student"}
            
        # 2. Fallback: Check if it's an old-style random hash in the DB
        users_collection = await db.get_users_collection()
        user = await users_collection.find_one({"current_hash": decoded_val})
        if user:
            return {"email": user["email"], "role": "student"}
            
        raise HTTPException(status_code=401, detail="User session not found.")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or corrupted code.")

import json

def load_json_config():
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    try:
        with open(config_path, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading config.json: {e}")
        return {"config": {"tasks": [], "max_tasks_to_select": 0}, "dates": []}

@app.get("/api/admin/config")
async def get_config():
    return load_json_config()

@app.post("/api/admin/config")
async def update_config(request: Request):
    raise HTTPException(status_code=405, detail="Manual JSON editing required.")

@app.get("/api/student/grid")
async def get_student_grid(email: str = None):
    # Load base configuration from JSON
    # We load it again to ensure we don't accidentally use a modified object if there was any caching
    config_data = load_json_config()
    all_dates = config_data.get("dates", [])
    
    # Filter: Only show dates starting from TOMORROW
    # Requirement: "past and todays dates dont show them"
    today_str = datetime.now().strftime("%Y-%m-%d")
    dates_list = [d for d in all_dates if d.get("date") > today_str]
    
    # Calculate Dynamic Capacity
    # Aggregate counts of selections per (date, slot_id)
    pipeline = [
        {"$group": {"_id": {"date": "$date", "slot_id": "$slot_id"}, "count": {"$sum": 1}}}
    ]
    selections_collection = await db.get_selections_collection()
    cursor = selections_collection.aggregate(pipeline)
    usage_list = await cursor.to_list(length=1000)
    usage = {f"{r['_id']['date']}_{r['_id']['slot_id']}": r['count'] for r in usage_list}

    # Inject remaining capacity into slot objects
    for d_obj in dates_list:
        d_str = d_obj.get("date")
        for s_obj in d_obj.get("slots", []):
            s_id = s_obj.get("id")
            key = f"{d_str}_{s_id}"
            
            # The 'capacity' in config.json is the TOTAL capacity
            total_cap = s_obj.get("capacity", 0)
            booked_count = usage.get(key, 0)
            
            # Remaining is Total - Booked
            remaining = total_cap - booked_count
            s_obj["capacity"] = max(0, remaining)
            
    # If email provided, fetch existing selections and preference from MongoDB
    user_selections = []
    preference = None
    if email:
        # Get selections
        selections_collection = await db.get_selections_collection()
        cursor = selections_collection.find({"email": email}, {"_id": 0})
        user_selections = await cursor.to_list(length=100)
        
        # Get preference
        users_collection = await db.get_users_collection()
        user_data = await users_collection.find_one({"email": email})
        if user_data:
            preference = user_data.get("preference")
    
    return {
        "config": config_data.get("config"),
        "dates": dates_list,
        "selections": user_selections,
        "preference": preference
    }

@app.post("/api/student/book")
async def submit_booking(request: Request):
    data = await request.json()
    email = data.get("email")
    selections = data.get("selections") # Array of {task_name, date, slot_id}
    
    if not email or selections is None:
        raise HTTPException(status_code=400, detail="Email and selections are required.")

    # Guard: Check capacity for each selected slot
    config_data = load_json_config()
    # Build a lookup for capacities
    cap_lookup = {d["date"]: {s["id"]: s["capacity"] for s in d["slots"]} for d in config_data["dates"]}
    
    for s in selections:
        date_str = s.get("date")
        slot_id = s.get("slot_id")
        
        # Count existing bookings for this specific slot
        selections_collection = await db.get_selections_collection()
        count = await selections_collection.count_documents({"date": date_str, "slot_id": slot_id, "email": {"$ne": email}})
        max_cap = cap_lookup.get(date_str, {}).get(slot_id, 0)
        
        if count >= max_cap:
            raise HTTPException(status_code=409, detail=f"Slot {slot_id} on {date_str} is now at full capacity.")
    
    # Clear previous selections for this user and re-add
    selections_collection = await db.get_selections_collection()
    await selections_collection.delete_many({"email": email})
    
    if selections:
        # Build a lookup for slot timings
        timing_lookup = {d["date"]: {s["id"]: (s["start"], s["end"]) for s in d["slots"]} for d in config_data["dates"]}
        
        for s in selections:
            s["email"] = email
            # Lookup and inject timings
            date_str = s.get("date")
            slot_id = s.get("slot_id")
            times = timing_lookup.get(date_str, {}).get(slot_id)
            if times:
                s["start"] = times[0]
                s["end"] = times[1]
                
        await selections_collection.insert_many(selections)
        
    return {"status": "success"}

@app.post("/api/student/preference")
async def set_preference(request: Request):
    data = await request.json()
    email = data.get("email")
    preference = data.get("preference") # "exam" or "oral"
    
    if not email or preference not in ["exam", "oral"]:
        raise HTTPException(status_code=400, detail="Invalid request.")

    users_collection = await db.get_users_collection()
    await users_collection.update_one(
        {"email": email},
        {"$set": {"preference": preference}},
        upsert=True
    )
    
    # If they switch to exam, clear their previous oral defense bookings
    if preference == "exam":
        selections_collection = await db.get_selections_collection()
        await selections_collection.delete_many({"email": email})

    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    import os
    # Respect the PORT env var for Cloud Run, default to 8080 for local
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
