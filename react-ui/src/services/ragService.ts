import { RAGMode } from "../types";

const API = "http://127.0.0.1:8000";

export const askRag = async (
  question: string,
  mode: RAGMode,
  workspace: string,
  scope: "file" | "workspace",
  filename?: string
): Promise<string> => {
  const body: any = {
    question,
    mode,
    top_k: 4,
    score_threshold: 0,
    workspace,
  };
  if (scope === "file") body.filename = filename;

  const res = await fetch(`${API}/rag/rag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.answer ?? "No answer found.";
};
