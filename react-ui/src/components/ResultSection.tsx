import React from "react";
import { SearchResult } from "../types";
import { palette } from "../colors";

type Props = { results: SearchResult[] };

const ResultsSection: React.FC<Props> = ({ results }) => (
  <section style={sectionStyle}>
    <h2 style={headerStyle}>Results</h2>
    {results.map((r, i) => (
      <div key={i} style={cardStyle}>
        <strong>{r.header}</strong>
        <p>{r.body}</p>
        <div style={metaRow}>
          {r.rank !== undefined && (
            <span style={badgeStyle}>rank&nbsp;{r.rank.toFixed(3)}</span>
          )}
          {r.score !== undefined && (
            <span style={badgeStyle}>score&nbsp;{r.score.toFixed(3)}</span>
          )}
        </div>
      </div>
    ))}
  </section>
);

/* stílusok */
const sectionStyle = {
  marginTop: 24,
  background: palette.cardBg,
  border: `1px solid ${palette.border}`,
  borderRadius: 10,
  padding: 20,
  boxShadow: "0 3px 6px rgba(0,0,0,0.05)",
} as const;
const headerStyle = { marginTop: 0, marginBottom: 16, fontSize: 20 };
const cardStyle = {
  background: palette.cardBg,
  border: `1px solid ${palette.border}`,
  borderRadius: 8,
  padding: 12,
  marginTop: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
} as const;
const metaRow = { marginTop: 8, display: "flex", gap: 8 } as const;
const badgeStyle = {
  fontSize: 12,
  background: palette.highlight,
  padding: "2px 6px",
  borderRadius: 4,
} as const;

export default ResultsSection;
