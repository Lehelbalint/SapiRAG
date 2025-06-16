-- 1) Telepítsd a pgvector kiterjesztést
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) documents tábla létrehozása 768-dimenziós VECTOR oszloppal
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  header TEXT,
  workspace TEXT,
  body TEXT,
  embedding VECTOR(768)
);

CREATE INDEX IF NOT EXISTS idx_documents_fts
  ON documents USING gin (
    to_tsvector('hungarian', unaccent(header || ' ' || body))
  );

-- 3) HNSW-index koszinusz-alapú kereséshez
CREATE INDEX IF NOT EXISTS idx_documents_embedding_hnsw
  ON documents USING hnsw (embedding vector_cosine_ops);