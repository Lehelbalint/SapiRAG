from typing import Any, List, Tuple
from psycopg2.extensions import connection as PGConnection
from sentence_transformers import CrossEncoder
from utils.helpers import extract_terms ,encode_text ,build_ts_query

reranker = CrossEncoder("cross-encoder/mmarco-mMiniLMv2-L12-H384-v1")

def keyword_search(
        conn: PGConnection,
        query: str,
        workspace: str,
        filename: str,
        top_k: int = 10
) -> List[Tuple[str, str, str, float]]:
    terms = extract_terms(query)
    ts_query = build_ts_query(terms)
    if not ts_query:
        return []
    sql = (
        "SELECT header, body, filename,"
        " ts_rank_cd("
        "   to_tsvector('hungarian', unaccent(header || ' ' || body)),"
        "   to_tsquery('hungarian', %s)"
        " ) AS rank"
        " FROM documents"
        " WHERE filename = %s AND workspace= %s"
        "   AND to_tsvector('hungarian', unaccent(header || ' ' || body))"
        "       @@ to_tsquery('hungarian', %s)"
        " ORDER BY rank DESC"
        " LIMIT %s;"
    )
    params = (ts_query, filename, workspace, ts_query, top_k)
    return _execute_query(conn, sql, params)


def embedding_search(
    conn: PGConnection,
    query: str,
    workspace: str,
    filename: str,
    top_k: int = 10 
) -> List[Tuple[str, str, str, float]]: 
    q_emb = encode_text(query)
    sql = (
        "SELECT header, body, filename,"
        " 1 - (embedding <=> %s::vector) AS score"
        " FROM documents"
        " WHERE filename = %s AND workspace= %s"
        " ORDER BY score DESC"
        " LIMIT %s;"
    )
    params = (q_emb, filename, workspace, top_k)
    return _execute_query(conn, sql, params) 

def hybrid_search(
    conn: PGConnection,
    query: str,
    workspace: str,
    filename: str,
    top_k: int = 15
) -> List[Tuple[str, str,str, float]]:
    vec_results = embedding_search(conn, query, workspace, filename , top_k)
    kw_results = keyword_search(conn, query,  workspace, filename, top_k)

    candidates = { (h, b, f): score for h, b, f, score in vec_results + kw_results }

    texts = [f"{h}\n{b}" for (h, b, f) in candidates.keys()]
    rerank_scores = reranker.predict([(query, t) for t in texts])

    combined = list(zip(candidates.items(), rerank_scores))
    combined.sort(key=lambda x: x[1], reverse=True)

    return [ (h, b, f, float(score))
             for ((h, b, f), _), score in combined[:top_k] ]


def keyword_search_workspace(
    conn: PGConnection,
    query: str,
    workspace: str,
    top_k: int = 10 
) -> List[Tuple[str, str, float]]:
    terms = extract_terms(query) 
    ts_query = build_ts_query(terms) 
    if not ts_query:
        return []

    sql = (
        "SELECT header, body, filename,"
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
    q_emb = encode_text(query)
    sql = (
        "SELECT header, body, filename,"
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

    candidates = { (h, b, f): score for h, b, f, score in emb_results + kw_results }

    texts = [f"{h}\n{b}" for (h, b, f) in candidates.keys()]
    rerank_scores = reranker.predict([(query, t) for t in texts])

    combined = list(zip(candidates.items(), rerank_scores))
    combined.sort(key=lambda x: x[1], reverse=True)

    return [ (h, b, f, float(score))
             for ((h, b, f), _), score in combined[:top_k] ]


def _execute_query(
    conn: PGConnection,
    sql: str,
    params: Tuple[Any, ...]
) -> List[Tuple[str, str, float]]:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()