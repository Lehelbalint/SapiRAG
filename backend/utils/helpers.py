import re
from typing import List
import psycopg2
from sentence_transformers import SentenceTransformer
from sentence_transformers.cross_encoder import CrossEncoder
from app.config import settings
import tiktoken

bi_model = SentenceTransformer("paraphrase-multilingual-mpnet-base-v2")
reranker = CrossEncoder("cross-encoder/mmarco-mMiniLMv2-L12-H384-v1")

def encode_text(text: str) -> List[float]:
    return bi_model.encode([text], normalize_embeddings=True)[0].tolist()

def extract_terms(query: str) -> List[str]:
    return re.findall(r"\w+", query.lower(), flags=re.UNICODE)

def build_ts_query(terms: List[str]) -> str:
    return " & ".join(f"{t}:*" for t in terms)

def get_conn():
    return psycopg2.connect(
        host=settings.PG_HOST,
        port=settings.PG_PORT,
        user=settings.PG_USER,
        password=settings.PG_PASSWORD,
        dbname=settings.PG_DB,
    )

def encode_query(text: str) -> list[float]:
    return bi_model.encode([text], normalize_embeddings=True)[0].tolist()

def count_tokens(text: str, enc_name: str = "cl100k_base") -> int:
    enc = tiktoken.get_encoding(enc_name)
    return len(enc.encode(text))