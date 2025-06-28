
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS vector;

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


CREATE INDEX IF NOT EXISTS idx_documents_embedding_hnsw
  ON documents USING hnsw (embedding vector_cosine_ops);