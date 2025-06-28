from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from routers import embedding_and_search,workspace,rag

app = FastAPI(title="SapiRagAPI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rag.router, prefix="/rag", tags=["rag"])
app.include_router(embedding_and_search.router, prefix="/search", tags=["search"])
app.include_router(workspace.router, prefix="/workspace", tags=["workspace"])