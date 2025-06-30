export type SearchResult = {
  filename: string;
  header: string;
  body: string;
  score?: number;
  rank?: number;
};

export type RAGMode = "embedding" | "keyword" | "hybrid";
export type SearchType = RAGMode;
export type SearchScope = "file" | "workspace";