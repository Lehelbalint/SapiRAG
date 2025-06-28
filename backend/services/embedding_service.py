import fitz 
import tiktoken
from sentence_transformers import SentenceTransformer

ENCODING_NAME = "cl100k_base"
MODEL_NAME = "paraphrase-multilingual-mpnet-base-v2"
#MODEL_NAME = SentenceTransformer("all-MiniLM-L6-v2")
MAX_TOKENS = 600
OVERLAP_TOKENS = 100

tokenizer = tiktoken.get_encoding(ENCODING_NAME)
model = SentenceTransformer(MODEL_NAME)

def count_tokens(text: str) -> int:
    return len(tokenizer.encode(text))


def split_into_chunks(
    text: str,
    max_tokens: int = MAX_TOKENS,
    overlap: int = OVERLAP_TOKENS) -> list[str]:
    words = text.split()
    chunks: list[str] = []
    buffer: list[str] = []

    for word in words:
        buffer.append(word)
        if count_tokens(" ".join(buffer)) > max_tokens:
            chunks.append(" ".join(buffer[:-1]))
            buffer = buffer[-overlap:]

    if buffer:
        chunks.append(" ".join(buffer))

    return chunks


def generate_embeddings_from_pdf(pdf_path: str) -> list[dict[str, any]]:
    document = fitz.open(pdf_path)
    pages_text = [page.get_text() for page in document][2:]
    full_text = "\n".join(pages_text)

    chunks = split_into_chunks(full_text)

    embeddings = model.encode(chunks, normalize_embeddings=True)

    records: list[dict[str, any]] = []
    for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        records.append({
            "header": f"chunk-{idx}",
            "body": chunk,
            "embedding": embedding.tolist(),
        })

    return records
