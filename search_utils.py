import json
import os
import re
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import requests

model = SentenceTransformer('all-MiniLM-L6-v2')

def load_embeddings_data(filename: str):
    base = os.path.splitext(os.path.basename(filename))[0]
    path = os.path.join("outputs", f"{base}_output.json")

    if not os.path.exists(path):
        raise FileNotFoundError(f"❌ No such embedding file: {path}")

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    texts = [f"{item['header']}\n{item['body']}" for item in data]
    embeddings = np.array([item['embedding'] for item in data])
    return data, embeddings

def keyword_search(query: str, filename: str, top_k: int = 5):
    base = os.path.splitext(os.path.basename(filename))[0]
    path = os.path.join("outputs", f"{base}_output.json")

    if not os.path.exists(path):
        return {"error": f"No data found for file {filename}"}

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    pattern = re.compile(re.escape(query), re.IGNORECASE)
    matches = [
        {"header": item["header"], "body": item["body"]}
        for item in data
        if pattern.search(item["header"]) or pattern.search(item["body"])
    ]

    return {"matches": matches[:top_k]}

def embedding_search(query: str, filename: str, top_k: int = 5):
    data, embeddings = load_embeddings_data(filename)

    query_emb = model.encode([query])
    scores = cosine_similarity(query_emb, embeddings)[0]
    top_indices = scores.argsort()[::-1][:top_k]

    results = []
    for idx in top_indices:
        results.append({
            "header": data[idx]['header'],
            "body": data[idx]['body'],
            "score": float(scores[idx])
        })
    return {"results": results}


def rag_answer_local(question: str, filename: str, top_k: int = 3) -> str:
    from search_utils import load_embeddings_data

    data, embeddings = load_embeddings_data(filename)
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np

    model = SentenceTransformer('all-MiniLM-L6-v2')
    query_emb = model.encode([question])
    scores = cosine_similarity(query_emb, embeddings)[0]
    top_indices = scores.argsort()[::-1][:top_k]

    context = ""
    for idx in top_indices:
        context += f"{data[idx]['header']}\n{data[idx]['body']}\n\n"

    prompt = f"""
    Answer the following question based on the given context. Be concise and specific.

    Context:
    {context}

    Question: {question}
    Answer:
    """

    response = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": "mistral", "prompt": prompt, "stream": False}
    )

    response.raise_for_status()
    result = response.json()
    return result["response"].strip()
