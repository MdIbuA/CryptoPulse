from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from .config import get_settings


class Database:
    _client: Optional[AsyncIOMotorClient] = None

    @classmethod
    def get_client(cls) -> AsyncIOMotorClient:
        if cls._client is None:
            settings = get_settings()
            cls._client = AsyncIOMotorClient(settings.mongodb_uri)
        return cls._client

    @classmethod
    def get_db(cls) -> AsyncIOMotorDatabase:
        settings = get_settings()
        return cls.get_client()[settings.mongodb_db]


def get_db() -> AsyncIOMotorDatabase:
    return Database.get_db()
