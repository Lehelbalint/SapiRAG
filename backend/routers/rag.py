from typing import Optional
from fastapi import Body, HTTPException
from app.config import settings
import requests
from fastapi import APIRouter
from utils.helpers import get_conn,count_tokens
from services.search_service import (
    keyword_search as util_keyword_search,
    keyword_search_workspace,
    embedding_search as util_embedding_search,
    embedding_search_workspace,
    hybrid_search    as util_hybrid_search,
    hybrid_search_workspace,
)

router= APIRouter()


BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

@router.post("/rag")
def rag(
    question:        str   = Body(...),    
    filename:        Optional[str] = Body(None),
    workspace:       Optional[str] = Body(None),
    mode:            str   = Body("embedding"),
    top_k:           int   = Body(10),
    score_threshold: float = Body(0.0),
):
    if not (filename or workspace):
        raise HTTPException(400, "Select workspace or file name")
    mode = mode.lower()
    if mode not in ("keyword", "embedding", "hybrid"):
        raise HTTPException(400, "Not correct mode")
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
            f"{BASE_URL}?key={settings.GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {e}")

    data = resp.json()
    print(data)
    texts = [
        part["text"]
        for cand in data["candidates"]
        for part in cand["content"]["parts"]
    ]

    answer = "".join(texts).strip() or "Nincs válasz"
    return {"answer": answer}

@router.post("/rag-ollama")
def rag(
    question:        str   = Body(...),    
    filename:        Optional[str] = Body(None),
    workspace:       Optional[str] = Body(None),
    mode:            str   = Body("embedding"),
    top_k:           int   = Body(10),
    score_threshold: float = Body(0.0),
):
    mode = mode.lower()
    if mode not in ("keyword", "embedding", "hybrid"):
        raise HTTPException(400, "Invalid search mode")
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
        f"{settings.OLLAMA_HOST}/api/generate",
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
