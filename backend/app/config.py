
import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl
from typing import List

load_dotenv()

class Settings(BaseSettings):
    PG_HOST: str = os.getenv("PG_HOST")
    PG_PORT: int = int(os.getenv("PG_PORT"))
    PG_USER: str = os.getenv("PG_USER")
    PG_PASSWORD: str = os.getenv("PG_PASSWORD")
    PG_DB: str = os.getenv("PG_DB")

    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT")
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ACCESS_KEY")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_SECRET_KEY")

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")

    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

settings = Settings()