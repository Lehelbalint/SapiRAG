import React from "react";
import SearchIcon from '@mui/icons-material/Search';
import { unifiedSearch } from "../services/searchService";
import { SearchType, SearchScope, SearchResult } from "../types";
import { palette } from "../colors";

type Props = {
  searchType: SearchType;
  onChangeSearchType: (t: SearchType) => void;
  query: string;
  onChangeQuery: (q: string) => void;
  searchScope: SearchScope;
  selectedBucket: string;
  uploadedFilename: string;
  runWithLoader: (task: () => Promise<void>, txt: string) => void;
  setSearchResults: (r: SearchResult[]) => void;
};

const SearchSection: React.FC<Props> = (props) => {
  const {
    searchType,
    onChangeSearchType,
    query,
    onChangeQuery,
    searchScope,
    selectedBucket,
    uploadedFilename,
    runWithLoader,
    setSearchResults,
  } = props;

  const handleSearch = () =>
    runWithLoader(async () => {
      if (!query) {
        alert("Please enter the search query");
        return;
      }
      if (!selectedBucket) {
        alert("Select a workspace!");
        return;
      }
      if (searchScope === "file" && !uploadedFilename) {
        alert("Select a file!");
        return;
      }
      const ws = selectedBucket.replace("workspace-", "");
      const matches = await unifiedSearch(
        searchType,
        query,
        ws,
        searchScope,
        uploadedFilename
      );
      setSearchResults(matches);
    }, `${searchType} keresés…`);

  return (
    <section style={sectionStyle}>
      <h2 style={headerStyle}>Search in PDF</h2>



      <textarea
        value={query}
        onChange={(e) => onChangeQuery(e.target.value)}
        placeholder={`Enter your ${searchType} query…`}
        rows={3}
        style={textAreaStyle}
      />
      <div style={radioGroupStyle}>
        {(["keyword", "embedding", "hybrid"] as SearchType[]).map((v) => (
          <label key={v} style={radioLabelStyle}>
            <input
              type="radio"
              value={v}
              checked={searchType === v}
              onChange={() => onChangeSearchType(v)}
            />
            {v === "keyword" ? "Keyword" : v === "embedding" ? "Semantic" : "Hybrid"}
          </label>
        ))}
      </div>

      <button onClick={handleSearch} style={primaryButtonStyle}>
        <SearchIcon /> Search
      </button>
    </section>
  );
};

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
  border: "none",
  borderRadius: 6,
  padding: "10px 18px",
  fontSize: 14,
  cursor: "pointer",
  background: palette.primary,
  color: "#fff",
};

export default SearchSection;
