import React, { useEffect, useState } from "react";
import { useLoader } from "./hooks/useLoader";
import {
  SearchScope,
  SearchType,
  SearchResult,
  RAGMode,
} from "./types";
import { getBuckets, listPdfs } from "./services/workspaceService";
import LoaderOverlay from "./components/LoaderOverlay";
import WorkspaceSection from "./components/WorkspaceSection";
import UploadSection from "./components/UploadSection";
import SearchSection from "./components/SearchSection";
import RagSection from "./components/RagSection";
import ResultsSection from "./components/ResultSection";
import { palette } from "./colors";

const App = () => {
  /* ---------- Loader ---------- */
  const { loading, loadingText, runWithLoader } = useLoader();

  /* ---------- Workspace state ---------- */
  const [buckets, setBuckets] = useState<string[]>([]);
  const [selectedBucket, setSelectedBucket] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("file");

  /* ---------- PDF state ---------- */
  const [pdfFiles, setPdfFiles] = useState<string[]>([]);
  const [selectedPdf, setSelectedPdf] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState("");

  /* ---------- Search state ---------- */
  const [searchType, setSearchType] = useState<SearchType>("keyword");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  /* ---------- RAG state ---------- */
  const [ragMode, setRagMode] = useState<RAGMode>("embedding");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  /* ---------- Init ---------- */
  useEffect(() => {
    runWithLoader(async () => setBuckets(await getBuckets()), "Bucketek betöltése…");
  }, []);

  /* ---------- PDF list frissítés ---------- */
  useEffect(() => {
    if (!selectedBucket) {
      setPdfFiles([]);
      setSelectedPdf("");
      return;
    }
    runWithLoader(
      async () =>
        setPdfFiles(
          await listPdfs(selectedBucket.replace("workspace-", ""))
        ),
      "PDF lista frissítése…"
    );
  }, [selectedBucket]);

  return (
    <div style={pageStyle}>
      <LoaderOverlay loading={loading} text={loadingText} />
      <h1 style={titleStyle}>
        <img style={{width: 30}} src="src/assets/SapiRagLogo.png"/> 
        SapiRAG
      </h1>

      <div style={layoutContainer}>
        <div style={leftCol}>
          <WorkspaceSection
            buckets={buckets}
            selectedBucket={selectedBucket}
            onSelectBucket={setSelectedBucket}
            searchScope={searchScope}
            onChangeSearchScope={setSearchScope}
            pdfFiles={pdfFiles}
            selectedPdf={selectedPdf}
            onSelectPdf={(f) => {
              setSelectedPdf(f);
              setUploadedFilename(f);
            }}
            runWithLoader={runWithLoader}
            setBuckets={setBuckets}
            setPdfFiles={setPdfFiles}
            uploadedFilename={uploadedFilename}
          />

          <UploadSection
            selectedBucket={selectedBucket}
            pdfFile={pdfFile}
            setPdfFile={setPdfFile}
            runWithLoader={runWithLoader}
            refreshPdfList={async () =>
              setPdfFiles(
                await listPdfs(selectedBucket.replace("workspace-", ""))
              )
            }
            setUploadedFilename={setUploadedFilename}
          />
        </div>

        <div style={rightCol}>
          <SearchSection
            searchType={searchType}
            onChangeSearchType={setSearchType}
            query={query}
            onChangeQuery={setQuery}
            searchScope={searchScope}
            selectedBucket={selectedBucket}
            uploadedFilename={uploadedFilename}
            runWithLoader={runWithLoader}
            setSearchResults={setSearchResults}
          />

          <RagSection
            ragMode={ragMode}
            onChangeRagMode={setRagMode}
            question={question}
            onChangeQuestion={setQuestion}
            searchScope={searchScope}
            selectedBucket={selectedBucket}
            uploadedFilename={uploadedFilename}
            runWithLoader={runWithLoader}
            answer={answer}
            setAnswer={setAnswer}
          />
        </div>
      </div>

      {searchResults.length > 0 && <ResultsSection results={searchResults} />}
    </div>
  );
};

const layoutContainer = { display: "flex", gap: 20, width: '100%' } as const;
const leftCol = { width: "35%", display: "flex", flexDirection: "column", gap: 24 } as const;
const rightCol = { flex: 1, display: "flex", flexDirection: "column", gap: 24 } as const;

const pageStyle = {
  boxSizing: 'border-box',
  padding: 24,
  fontFamily:
    '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  background: `linear-gradient(180deg, ${palette.highlight} 0%, ${palette.background} 40%)`,
  width: '100%',
  minHeight: "100vh",
  color: palette.text,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
} as const;


const titleStyle = {
  fontSize: 28,
  marginBottom: 12,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  gap: 5,
} as const;

export default App;
