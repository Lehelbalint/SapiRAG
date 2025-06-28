import { SearchType } from "../types";

const API = "http://127.0.0.1:8000";

export const unifiedSearch = async (
  type: SearchType,
  query: string,
  workspace: string,
  scope: "file" | "workspace",
  filename?: string
) => {
  const common = {
    query,
    top_k: 10,
    workspace,
    ...(scope === "file" ? { filename } : {}),
  };

  let endpoint = "";
  let options: RequestInit = {};

  switch (type) {
    case "keyword":
      endpoint = `/search/keyword-search?${new URLSearchParams(
        common as any
      )}`;
      options = { method: "GET" };
      break;
    case "embedding":
      endpoint = "/search/embedding-search";
      options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(common),
      };
      break;
    case "hybrid":
      endpoint = "/search/search-hybrid";
      options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(common),
      };
      break;
  }

  const res = await fetch(`${API}${endpoint}`, options);
  const data = await res.json();
  return data.matches ?? [];
};
