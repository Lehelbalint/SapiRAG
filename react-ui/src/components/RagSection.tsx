import React from "react";
import { askRag } from "../services/ragService";
import { RAGMode, SearchScope } from "../types";
import { palette } from "../colors";
import { HelpOutline } from "@mui/icons-material";

type Props = {
  ragMode: RAGMode;
  onChangeRagMode: (m: RAGMode) => void;
  question: string;
  onChangeQuestion: (q: string) => void;
  searchScope: SearchScope;
  selectedBucket: string;
  uploadedFilename: string;
  runWithLoader: (task: () => Promise<void>, txt: string) => void;
  answer: string;
  setAnswer: (a: string) => void;
};

const RagSection: React.FC<Props> = (p) => {
  const {
    ragMode,
    onChangeRagMode,
    question,
    onChangeQuestion,
    searchScope,
    selectedBucket,
    uploadedFilename,
    runWithLoader,
    answer,
    setAnswer,
  } = p;

  const handleAsk = () =>
    runWithLoader(async () => {
      if (!question) return;
      if (searchScope === "file" && !uploadedFilename) return;
      const ws = selectedBucket.replace("workspace-", "");
      setAnswer(await askRag(question, ragMode, ws, searchScope, uploadedFilename));
    }, "RAG answering…");

  return (
    <section style={sectionStyle}>
      <h2 style={headerStyle}>Ask the PDF</h2>

      <textarea
        value={question}
        onChange={(e) => onChangeQuestion(e.target.value)}
        placeholder="Ask your question…"
        rows={3}
        style={textAreaStyle}
      />

      <div style={radioGroupStyle}>
        {(["embedding", "keyword", "hybrid"] as RAGMode[]).map((v) => (
          <label key={v} style={radioLabelStyle}>
            <input
              type="radio"
              name="ragMode"
              value={v}
              checked={ragMode === v}
              onChange={() => onChangeRagMode(v)}
            />
            {v === "embedding" ? "Semantic" : v === "keyword" ? "Keyword" : "Hybrid"}
          </label>
        ))}
      </div>

      <button onClick={handleAsk} style={primaryButtonStyle}>
        <HelpOutline/>
        Ask
      </button>

      {answer && (
        <p style={answerStyle}>
          <strong>Answer:</strong> {answer}
        </p>
      )}
    </section>
  );
};

/* stílusok */
const sectionStyle = {
    display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginTop: 24,
  background: palette.cardBg,
  border: `1px solid ${palette.border}`,
  borderRadius: 10,
  padding: 20,
  boxShadow: "0 3px 6px rgba(0,0,0,0.05)",
} as const;
const headerStyle = { marginTop: 0, marginBottom: 16, fontSize: 20 };
const radioGroupStyle = { display: "flex", gap: 20, margin: "8px 0 12px" };
const radioLabelStyle = { display: "flex", gap: 6 };
const textAreaStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${palette.border}`,
  borderRadius: 6,
  padding: "10px 12px",
  fontSize: 14,
  resize: "vertical",
  marginBottom: 12,
} as const;
const primaryButtonStyle = {
    display: 'flex',
    alignItem: 'center',
    gap: 2,
  border: "none",
  borderRadius: 6,
  padding: "10px 18px",
  fontSize: 14,
  cursor: "pointer",
  background: palette.primary,
  color: "#fff",
};
const answerStyle = {
  marginTop: 12,
  background: palette.highlight,
  padding: 12,
  borderRadius: 6,
};

export default RagSection;
