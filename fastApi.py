from fastapi import FastAPI, UploadFile, File, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil

from embedding_utils import generate_embeddings_from_pdf
from search_utils import keyword_search, embedding_search

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PDFUploadRequest(BaseModel):
    filename: str

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    filename: str

@app.post("/upload-pdf")
def upload_pdf(file: UploadFile = File(...)):
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"filename": file.filename}

@app.post("/generate-embeddings")
def generate_embeddings(request: PDFUploadRequest):
    file_location = os.path.join(UPLOAD_DIR, request.filename)
    base_name = os.path.splitext(os.path.basename(file_location))[0]
    output_path = os.path.join(OUTPUT_DIR, f"{base_name}_output.json")
    generate_embeddings_from_pdf(file_location, output_path)
    return {"message": f"✅ Embeddings generated for {request.filename}"}

@app.get("/keyword-search")
def keyword_search_api(query: str = Query(...), filename: str = Query(...), top_k: int = 5):
    return keyword_search(query, filename, top_k)

@app.post("/embedding-search")
def embedding_search_api(request: SearchRequest):
    return embedding_search(request.query, request.filename, request.top_k)

@app.post("/rag-local")
def rag_local(question: str = Body(...), filename: str = Body(...)):
    from search_utils import rag_answer_local
    answer = rag_answer_local(question, filename)
    return {"answer": answer}