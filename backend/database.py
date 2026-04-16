import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "smai_auth")

class Database:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect_db(cls):
        if cls.client is None:
            cls.client = AsyncIOMotorClient(MONGODB_URI)
            cls.db = cls.client[DB_NAME]
            print(f"Connected to MongoDB at {MONGODB_URI}")

    @classmethod
    async def close_db(cls):
        if cls.client:
            cls.client.close()
            cls.client = None
            cls.db = None
            print("Disconnected from MongoDB")

    @classmethod
    async def get_db(cls):
        if cls.client is None:
            await cls.connect_db()
        return cls.db

    @classmethod
    async def get_users_collection(cls):
        database = await cls.get_db()
        return database.users

    @classmethod
    async def get_selections_collection(cls):
        database = await cls.get_db()
        return database.selections

db = Database()
