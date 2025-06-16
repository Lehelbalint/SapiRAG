import os
import psycopg2
import tiktoken
from typing import List
from sentence_transformers import SentenceTransformer
from sentence_transformers.cross_encoder import CrossEncoder
from dotenv import load_dotenv

load_dotenv()

PG_HOST     = os.getenv("PG_HOST", "localhost")
PG_PORT     = os.getenv("PG_PORT", "5432")
PG_USER     = os.getenv("PG_USER", "postgres")
PG_PASSWORD = os.getenv("PG_PASSWORD", "postgres")
PG_DB       = os.getenv("PG_DB", "embeddings_db")

OLLAMA_HOST  = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi4-mini")

model    = SentenceTransformer("paraphrase-multilingual-mpnet-base-v2")
reranker = CrossEncoder("cross-encoder/mmarco-mMiniLMv2-L12-H384-v1")

def get_conn():
    return psycopg2.connect(
        host=PG_HOST,
        port=PG_PORT,
        user=PG_USER,
        password=PG_PASSWORD,
        dbname=PG_DB
    )

def encode_query(text: str) -> List[float]:
    return model.encode([text], normalize_embeddings=True)[0].tolist()

def count_tokens(text: str, enc_name: str = "cl100k_base") -> int:
    enc = tiktoken.get_encoding(enc_name)
    return len(enc.encode(text))

def build_rag_prompt(question: str, chunks: List[str], token_limit: int = 3000) -> str:
    context = ""
    for snippet in chunks:
        if count_tokens(context + snippet) > token_limit:
            break
        context += snippet + "\n\n"

    return (
        f"Válaszolj a kérdésre az alábbi KONtextus alapján. "
        f"Ha nincs válasz, írd azt, hogy 'Nem található'.\n\n"
        f"KONtextus:\n{context}\n\n"
        f"Kérdés: {question}\nVálasz:"
    )