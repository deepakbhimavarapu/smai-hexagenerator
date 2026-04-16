import os
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from pydantic import EmailStr
from database import db
from utils import generate_hexa, encode_hexa, get_base_url
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Email Auth Scoped Service")

@app.on_event("startup")
async def startup_db_client():
    await db.connect_db()

@app.on_event("shutdown")
async def shutdown_db_client():
    await db.close_db()

@app.get("/{emailid}")
async def process_email(emailid: str):
    """
    Get the emailid, create a unique hexa code, save/update in MongoDB,
    and return the encoded URL.
    """
    # Simple validation for email format (optionally use pydantic EmailStr)
    if "@" not in emailid or "." not in emailid:
        raise HTTPException(status_code=400, detail="Invalid email format.")

    # Generate the unique hexa code
    hexa_code = generate_hexa()
    timestamp = datetime.utcnow()

    users_collection = db.get_users_collection()

    # upsert the email and hexa there.
    # Check if exists, update if yes, insert if no.
    # $set will handle both update/insert with upsert=True.
    try:
        await users_collection.update_one(
            {"email": emailid},
            {
                "$set": {
                    "current_hash": hexa_code,
                    "last_active": timestamp
                }
            },
            upsert=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # Encode the hexa value with the unique secret
    try:
        encoded_hexa = encode_hexa(hexa_code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Encoding error: {str(e)}")

    # Construct the response URL
    base_url = get_base_url()
    response_url = f"{base_url}/{encoded_hexa}"

    return {"url": response_url}

if __name__ == "__main__":
    import uvicorn
    # Default port for Cloud Run is 8080
    uvicorn.run(app, host="0.0.0.0", port=8080)
