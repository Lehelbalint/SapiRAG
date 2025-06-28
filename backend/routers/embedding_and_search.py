from typing import Optional
from fastapi import Body, Form, Query
from services.embedding_service import generate_embeddings_from_pdf
from utils.helpers import get_conn
from fastapi import APIRouter
import tempfile
from services.minio_service import ensure_bucket_exists, download_file_from_minio
import os
from services.search_service import (
    keyword_search as util_keyword_search,
    keyword_search_workspace,
    embedding_search as util_embedding_search,
    embedding_search_workspace,
    hybrid_search    as util_hybrid_search,
    hybrid_search_workspace,
)

router= APIRouter()


@router.post("/generate-embeddings")
def generate_embeddings(filename: str = Form(...), workspace: str = Form(...)):
    bucket = f"workspace-{workspace}"
    ensure_bucket_exists(bucket)

    file_data = download_file_from_minio(bucket, filename)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        temp_file.write(file_data)
        temp_file_path = temp_file.name

    records = generate_embeddings_from_pdf(temp_file_path)
    os.remove(temp_file_path)

    conn = get_conn()
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

@router.get("/keyword-search")
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

@router.post("/embedding-search")
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

@router.post("/search-hybrid")
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
