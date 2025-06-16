from fastapi import FastAPI, UploadFile, File, Query, Body,Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from minio_client import minio_client, ensure_bucket_exists, upload_file_to_minio, download_file_from_minio, list_buckets, create_bucket, delete_bucket_and_contents,delete_pdf ,list_pdfs
from search_utils import (
    keyword_search as util_keyword_search,
    keyword_search_workspace,
    embedding_search as util_embedding_search,
    embedding_search_workspace,
    hybrid_search    as util_hybrid_search,
    hybrid_search_workspace,
)
from sentence_transformers.cross_encoder import CrossEncoder
import os
import tempfile
import psycopg2
import requests
import tiktoken
from typing import Optional
from embedding_utils import generate_embeddings_from_pdf
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv


model = SentenceTransformer("paraphrase-multilingual-mpnet-base-v2")
reranker = CrossEncoder("cross-encoder/mmarco-mMiniLMv2-L12-H384-v1")

app = FastAPI()
load_dotenv()

PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = os.getenv("PG_PORT", "5432")
PG_USER = os.getenv("PG_USER", "postgres")
PG_PASSWORD = os.getenv("PG_PASSWORD", "postgres")
PG_DB = os.getenv("PG_DB", "embeddings_db")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi4-mini") 

def get_conn():
    return psycopg2.connect(
      host=PG_HOST,
      port=PG_PORT,
      user=PG_USER,
      password=PG_PASSWORD,
      dbname=PG_DB
    )

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
    filename: Optional[str] = None   
    workspace: str     

API_KEY = "AIzaSyAeLy0N11hEZEQ4vaCQbA6zHix81sysR0o"
BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

@app.post("/rag")
def rag(
    question:        str   = Body(...),    
    filename:        Optional[str] = Body(None),
    workspace:       Optional[str] = Body(None),
    mode:            str   = Body("embedding"),
    top_k:           int   = Body(10),
    score_threshold: float = Body(0.0),
):
    if not (filename or workspace):
        raise HTTPException(400, "Adj meg filename-t vagy workspace-et!")
    mode = mode.lower()
    if mode not in ("keyword", "embedding", "hybrid"):
        raise HTTPException(400, "Érvénytelen mode")
    conn = get_conn()
    try:
        if mode == "keyword":
            rows = (
                util_keyword_search(conn, question, filename, top_k)
                if filename
                else keyword_search_workspace(conn, question, workspace, top_k)
            )
        elif mode == "hybrid":
            rows = (
                util_hybrid_search(conn, question, filename, top_k)
                if filename
                else hybrid_search_workspace(conn, question, workspace, top_k)
            )
        else:
            rows = (
                util_embedding_search(conn, question, filename, top_k)
                if filename
                else embedding_search_workspace(conn, question, workspace, top_k)
            )
    finally:
        conn.close()
    if mode == "embedding":
        filtered = [(h,b,s) for h,b,s in rows if s >= score_threshold][:4]
    else:
        filtered = rows[:4]

    context = ""
    for header, body, _ in filtered:
        snippet = f"[{header}] {body}\n\n"
        if count_tokens(context + snippet) > 3000:
            break
        context += snippet
    prompt = (
        f"Válaszolj a kérdésre az alábbi KONtextus alapján. "
        f"Ha nincs válasz, írd azt, hogy 'Nem található'.\n\n"
        f"KONtextus:\n{context}\n\n"
        f"Kérdés: {question}\nVálasz:"
    )
    print("=== RAG PROMPT ===")
    print(prompt)
    print("==================")

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }


    try:
        resp = requests.post(
            f"{BASE_URL}?key={API_KEY}",
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Gemini API hiba: {e}")

    data = resp.json()
    print(data)
    texts = [
        part["text"]
        for cand in data["candidates"]
        for part in cand["content"]["parts"]
    ]

    answer = "".join(texts).strip() or "Nincs válasz"
    return {"answer": answer}

@app.post("/rag-ollama")
def rag(
    question:        str   = Body(...),    
    filename:        Optional[str] = Body(None),
    workspace:       Optional[str] = Body(None),
    mode:            str   = Body("embedding"),
    top_k:           int   = Body(10),
    score_threshold: float = Body(0.0),
):
    if not (filename or workspace):
        raise HTTPException(400, "Adj meg filename-t vagy workspace-et!")
    mode = mode.lower()
    if mode not in ("keyword", "embedding", "hybrid"):
        raise HTTPException(400, "Érvénytelen mode")
    conn = get_conn()
    try:
        if mode == "keyword":
            rows = (
                util_keyword_search(conn, question, filename, top_k)
                if filename
                else keyword_search_workspace(conn, question, workspace, top_k)
            )
        elif mode == "hybrid":
            rows = (
                util_hybrid_search(conn, question, filename, top_k)
                if filename
                else hybrid_search_workspace(conn, question, workspace, top_k)
            )
        else:
            rows = (
                util_embedding_search(conn, question, filename, top_k)
                if filename
                else embedding_search_workspace(conn, question, workspace, top_k)
            )
    finally:
        conn.close()
    if mode == "embedding":
        filtered = [(h,b,s) for h,b,s in rows if s >= score_threshold][:4]
    else:
        filtered = rows[:4]

    context = ""
    for header, body, _ in filtered:
        snippet = f"[{header}] {body}\n\n"
        if count_tokens(context + snippet) > 3000:
            break
        context += snippet
    prompt = (
        f"Válaszolj a kérdésre az alábbi KONtextus alapján. "
        f"Ha nincs válasz, írd azt, hogy 'Nem található'.\n\n"
        f"KONtextus:\n{context}\n\n"
        f"Kérdés: {question}\nVálasz:"
    )
    print("=== RAG PROMPT ===")
    print(prompt)
    print("==================")

    resp = requests.post(
        f"{OLLAMA_HOST}/api/generate",
        json={
            "model":       "phi4-mini",
            "prompt":      prompt,
            "temperature": 0.1,
            "max_tokens": 512,
            "stream":      False,
        },
        timeout=80
    )

    print(f"[rag] Ollama status: {resp.status_code}")
    print(f"[rag] Ollama raw response:\n{resp.text}")
    try:
        payload = resp.json()
        print(f"[rag] Parsed JSON keys: {list(payload.keys())}")
        print(f"[rag] Full JSON payload: {payload}")
    except ValueError as e:
        print(f"[rag] JSON parse error: {e}")

    if resp.status_code != 200:
        return {"error": f"Ollama hiba: {resp.text}"}

    answer = payload.get("response", "").strip() or "Nem található"
    citations = " ".join(f"[{h}]" for h,_,_ in filtered)
    return {
        "answer":      answer,
        "citations":   citations,
        "used_chunks": [h for h,_,_ in filtered],
    }


@app.get("/buckets")
def get_buckets():
    return {"buckets": list_buckets()}

@app.delete("/delete-workspace")
def delete_workspace(name: str = Form(...)):
    bucket = f"workspace-{name}"
    deleted = delete_bucket_and_contents(bucket)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Bucket '{bucket}' nem létezik")

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM documents WHERE workspace = %s", (name,))
    conn.commit()
    cur.close()
    conn.close()

    return {"message": f" Workspace '{name}' (és a bucket '{bucket}') törölve."}

@app.delete("/delete-pdf")
def delete_pdf_endpoint(
    workspace: str = Form(...),
    filename:  str = Form(...)
):
    bucket = f"workspace-{workspace}"
    
    ok = delete_pdf(bucket, filename)
    if not ok:
        raise HTTPException(
            status_code=404,
            detail=f"'{filename}' nem található a bucketben {bucket}"
        )

    conn = get_conn()
    cur  = conn.cursor()
    cur.execute(
        "DELETE FROM documents WHERE workspace = %s AND filename = %s",
        (workspace, filename)
    )
    conn.commit()
    cur.close(); conn.close()

    return {"message": f" {filename} törölve a(z) {workspace} workspace-ből"}

@app.get("/list-pdfs")
def list_workspace_pdfs(workspace: str = Query(...)):

    bucket = f"workspace-{workspace}"
    if not minio_client.bucket_exists(bucket):
        raise HTTPException(status_code=404, detail=f"Bucket '{bucket}' nem létezik")

    pdfs = list_pdfs(bucket)
    return {"pdfs": pdfs}


@app.post("/create-bucket")
def create_new_bucket(name: str = Form(...)):
    created = create_bucket(name)
    if created:
        return {"message": f" Bucket '{name}' created."}
    else:
        return {"message": f" Bucket '{name}' already exists."}

@app.post("/upload-pdf")
def upload_pdf(
    file: UploadFile = File(...),
    workspace: str = Form(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    bucket = f"workspace-{workspace}"
    ensure_bucket_exists(bucket)

    file_data = file.file.read()
    upload_file_to_minio(bucket, file.filename, file_data, content_type="application/pdf")

    return {"filename": file.filename, "bucket": bucket}

@app.post("/generate-embeddings")
def generate_embeddings(filename: str = Form(...), workspace: str = Form(...)):
    bucket = f"workspace-{workspace}"
    ensure_bucket_exists(bucket)

    file_data = download_file_from_minio(bucket, filename)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        temp_file.write(file_data)
        temp_file_path = temp_file.name

    records = generate_embeddings_from_pdf(temp_file_path)
    os.remove(temp_file_path)

    conn = psycopg2.connect(
        host=PG_HOST, port=PG_PORT, user=PG_USER, password=PG_PASSWORD, dbname=PG_DB
    )
    cursor = conn.cursor()
    for item in records:
        cursor.execute(
            """
            INSERT INTO documents (filename, workspace, header, body, embedding)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (filename, workspace, item["header"], item["body"], item["embedding"])
        )
    conn.commit()
    cursor.close()
    conn.close()

    return {"message": f" Embeddings saved for {filename} in workspace {workspace}"}

@app.get("/keyword-search")
def keyword_search_endpoint(
    query: str = Query(...),
    top_k: int = Query(10),
    filename: Optional[str] = Query(None),
    workspace: str = Query(...),
):
    conn = get_conn()
    try:
        if filename:
            rows = util_keyword_search(conn, query, filename, top_k)
        else:
            rows = keyword_search_workspace(conn, query, workspace, top_k)
    finally:
        conn.close()
    return {"matches": [{"header": h, "body": b, "rank": r} for h, b, r in rows]}

@app.post("/embedding-search")
def embedding_search_endpoint(
    query: str = Body(...),
    top_k: int = Body(10),
    filename: Optional[str] = Body(None),
    workspace: str = Body(...),
):
    conn = get_conn()
    try:
        if filename:
            rows = util_embedding_search(conn, query, filename, top_k)
        else:
            rows = embedding_search_workspace(conn, query, workspace, top_k)
    finally:
        conn.close()
    return {"matches": [{"header": h, "body": b, "rank": r} for h, b, r in rows]}

@app.post("/search-hybrid")
def hybrid_search_endpoint(
    query: str = Body(...),
    top_k: int = Body(10),
    filename: Optional[str] = Body(None),
    workspace: str = Body(...),
):
    conn = get_conn()
    try:
        if filename:
            rows = util_hybrid_search(conn, query, filename, top_k)
        else:
            rows = hybrid_search_workspace(conn, query, workspace, top_k)
    finally:
        conn.close()
    return {"matches": [{"header": h, "body": b, "rank": r} for h, b, r in rows]}


def encode_query(text: str) -> list[float]:
    return model.encode([text], normalize_embeddings=True)[0].tolist()

def count_tokens(text: str, enc_name: str = "cl100k_base") -> int:
    enc = tiktoken.get_encoding(enc_name)
    return len(enc.encode(text))