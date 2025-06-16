"""
Search utilities for performing keyword, embedding, and hybrid searches
on PDF documents stored in a PostgreSQL database.
"""

import re
from typing import Any, List, Tuple
from psycopg2.extensions import connection as PGConnection
from sentence_transformers import SentenceTransformer
from sentence_transformers.cross_encoder import CrossEncoder

BI_MODEL_NAME = "paraphrase-multilingual-mpnet-base-v2"
CROSS_ENCODER_MODEL = "cross-encoder/mmarco-mMiniLMv2-L12-H384-v1"

bi_model = SentenceTransformer(BI_MODEL_NAME)
reranker = CrossEncoder(CROSS_ENCODER_MODEL)

#Helpers
def _encode_text(text: str) -> List[float]:
    embeddings = bi_model.encode([text], normalize_embeddings=True)
    return embeddings[0].tolist()


def _extract_terms(query: str) -> List[str]:
    return re.findall(r"\w+", query.lower(), flags=re.UNICODE)


def _build_ts_query(terms: List[str]) -> str:
    return " & ".join(f"{t}:*" for t in terms) if terms else ""


def _execute_query(
    conn: PGConnection,
    sql: str,
    params: Tuple[Any, ...]
) -> List[Tuple[str, str, float]]:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def keyword_search(
    conn: PGConnection,
    query: str,
    filename: str,
    top_k: int = 10
) -> List[Tuple[str, str, float]]:
    terms = _extract_terms(query)
    ts_query = _build_ts_query(terms)
    if not ts_query:
        return []

    sql = (
        "SELECT header, body,"
        " ts_rank_cd("
        "   to_tsvector('hungarian', unaccent(header || ' ' || body)),"
        "   to_tsquery('hungarian', %s)"
        " ) AS rank"
        " FROM documents"
        " WHERE filename = %s"
        "   AND to_tsvector('hungarian', unaccent(header || ' ' || body))"
        "       @@ to_tsquery('hungarian', %s)"
        " ORDER BY rank DESC"
        " LIMIT %s;"
    )
    params = (ts_query, filename, ts_query, top_k)
    return _execute_query(conn, sql, params)


def embedding_search(
    conn: PGConnection,
    query: str,
    filename: str,
    top_k: int = 10 
) -> List[Tuple[str, str, float]]: 
    q_emb = _encode_text(query)
    sql = (
        "SELECT header, body,"
        " 1 - (embedding <=> %s::vector) AS score"
        " FROM documents"
        " WHERE filename = %s"
        " ORDER BY score DESC"
        " LIMIT %s;"
    )
    params = (q_emb, filename, top_k)
    return _execute_query(conn, sql, params) 

def hybrid_search(
    conn: PGConnection,
    query: str,
    filename: str,
    top_k: int = 15
) -> List[Tuple[str, str, float]]:
    vec_results = embedding_search(conn, query, filename, top_k)
    kw_results = keyword_search(conn, query, filename, top_k)

    candidates = { (h, b): score for h, b, score in vec_results + kw_results }

    texts = [f"{h}\n{b}" for (h, b) in candidates.keys()]
    rerank_scores = reranker.predict([(query, t) for t in texts])

    combined = list(zip(candidates.items(), rerank_scores))
    combined.sort(key=lambda x: x[1], reverse=True)

    return [ (h, b, float(score)) for ((h, b), _), score in combined[:top_k] ]


def keyword_search_workspace(
    conn: PGConnection,
    query: str,
    workspace: str,
    top_k: int = 10 
) -> List[Tuple[str, str, float]]:
    terms = _extract_terms(query) 
    ts_query = _build_ts_query(terms) 
    if not ts_query:
        return []

    sql = (
        "SELECT header, body,"
        " ts_rank_cd("
        "   to_tsvector('hungarian', unaccent(header || ' ' || body)),"
        "   to_tsquery('hungarian', %s)"
        " ) AS rank"
        " FROM documents"
        " WHERE workspace = %s"
        "   AND to_tsvector('hungarian', unaccent(header || ' ' || body))"
        "       @@ to_tsquery('hungarian', %s)"
        " ORDER BY rank DESC"
        " LIMIT %s;"
    )
    params = (ts_query, workspace, ts_query, top_k)
    return _execute_query(conn, sql, params)


def embedding_search_workspace(
    conn: PGConnection,
    query: str,
    workspace: str,
    top_k: int = 10
) -> List[Tuple[str, str, float]]:
    q_emb = _encode_text(query)
    sql = (
        "SELECT header, body,"
        " 1 - (embedding <=> %s::vector) AS score"
        " FROM documents"
        " WHERE workspace = %s"
        " ORDER BY score DESC"
        " LIMIT %s;"
    )
    params = (q_emb, workspace, top_k)
    return _execute_query(conn, sql, params)


def hybrid_search_workspace(
    conn: PGConnection,
    query: str,
    workspace: str,
    top_k: int = 10
) -> List[Tuple[str, str, float]]:
    kw_results = keyword_search_workspace(conn, query, workspace, top_k)
    emb_results = embedding_search_workspace(conn, query, workspace, top_k)

    merged = { (h, b): score for h, b, score in kw_results + emb_results }
    sorted_results = sorted(
        [(h, b, score) for (h, b), score in merged.items()],
        key=lambda x: x[2], reverse=True
    )

    return sorted_results[:top_k]
