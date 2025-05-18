import fitz
import re
import json
import os
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2') 

def generate_embeddings_from_pdf(filename: str, output_path: str) -> None:
    doc = fitz.open(filename)
    text = ""
    for page in doc:
        text += page.get_text()

    paragraphs = re.split(r'\n\s*(\d+\.? ?§.*?)\n', text)
    structured = []
    if len(paragraphs) > 1:
        for i in range(1, len(paragraphs) - 1, 2):
            header = paragraphs[i].strip()
            body = paragraphs[i + 1].strip()
            structured.append((header, body))

    texts = [f"{h}\n{b}" for h, b in structured]
    embeddings = model.encode(texts)

    output = []
    for (header, body), embedding in zip(structured, embeddings):
        output.append({
            "header": header,
            "body": body,
            "embedding": embedding.tolist()
        })

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)   