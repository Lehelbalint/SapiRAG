import { useEffect, useState } from "react";

// ------------------------------------
//  Segéd-típusok
// ------------------------------------
type SearchResult = {
  header: string;
  body: string;
  score?: number;
  rank?: number;
};

export default function PDFUploaderAndSearch() {
  // ------------------------------------
  //  Állapot-változók
  // ------------------------------------
  const [ragMode, setRagMode] = useState<"embedding" | "keyword" | "hybrid">(
  "embedding"
);
const [searchScope, setSearchScope] = useState<"file" | "workspace">("file");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([]);
  const [buckets, setBuckets] = useState<string[]>([]);
  const [pdfFiles, setPdfFiles] = useState<string[]>([]);
  const [selectedPdf, setSelectedPdf] = useState("");
  const [selectedBucket, setSelectedBucket] = useState("");
  const [newBucketName, setNewBucketName] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadedFilename, setUploadedFilename] = useState("");
  const [keyword, setKeyword] = useState("");
  const [embeddingQuery, setEmbeddingQuery] = useState("");
  const [hybridQuery, setHybridQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const fileSelectDisabled = searchScope === "workspace";
  // ---- Loader-overlay ----
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  /** Helper, ami automatikusan kezeli a loader-overlayt. */
  const runWithLoader = async (task: () => Promise<void>, text: string) => {
    setLoadingText(text);
    setLoading(true);
    try {
      await task();
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------
  //  Effectek – bucket- és PDF-lista frissítés
  // ------------------------------------
  useEffect(() => {
    fetch("http://127.0.0.1:8000/buckets")
      .then((res) => res.json())
      .then((data) => setBuckets(data.buckets || []));
  }, []);

  useEffect(() => {
    if (!selectedBucket) {
      setPdfFiles([]);
      setSelectedPdf("");
      return;
    }
    const ws = selectedBucket.replace("workspace-", "");
    fetch(`http://127.0.0.1:8000/list-pdfs?workspace=${ws}`)
      .then((res) => res.json())
      .then((data) => setPdfFiles(data.pdfs || []));
  }, [selectedBucket]);

  // ------------------------------------
  //  Handler-függvények
  // ------------------------------------
  const handleCreateBucket = () =>
    runWithLoader(async () => {
      if (!newBucketName) return;
      const form = new FormData();
      form.append("name", `workspace-${newBucketName.toLowerCase()}`);

      const res = await fetch("http://127.0.0.1:8000/create-bucket", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      alert(data.message);

      setNewBucketName("");
      const refreshed = await fetch("http://127.0.0.1:8000/buckets").then((r) =>
        r.json()
      );
      setBuckets(refreshed.buckets || []);
    }, "Workspace létrehozása…");

  const handleDeleteWorkspace = () =>
    runWithLoader(async () => {
      if (!selectedBucket) return;
      const name = selectedBucket.replace("workspace-", "");
      const form = new FormData();
      form.append("name", name);

      const res = await fetch("http://127.0.0.1:8000/delete-workspace", {
        method: "DELETE",
        body: form,
      });
      const data = await res.json();
      alert(data.message);

      const refreshed = await fetch("http://127.0.0.1:8000/buckets").then((r) =>
        r.json()
      );
      setBuckets(refreshed.buckets || []);
      setSelectedBucket("");
    }, "Workspace törlése…");

  //   const handleRagAnswer = () =>
  // runWithLoader(async () => {
  //   if (!question || !uploadedFilename) return;

  //   const res = await fetch("http://127.0.0.1:8000/rag", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       question,
  //       filename: uploadedFilename,
  //       mode: ragMode,        // <-- radio-választás
  //     }),
  //   });

  //   const data = await res.json();
  //   setAnswer(data.answer || "No answer found.");
  // }, "RAG válasz generálása…");

  const handlePDFUpload = () =>
    runWithLoader(async () => {
      if (!pdfFile || !selectedBucket) return;
      const workspace = selectedBucket.replace("workspace-", "");
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("workspace", workspace);

      const uploadResponse = await fetch("http://127.0.0.1:8000/upload-pdf", {
        method: "POST",
        body: formData,
      });

      if (uploadResponse.ok) {
        const data = await uploadResponse.json();
        setUploadedFilename(data.filename);
        setUploadMessage(`✅ Uploaded: ${data.filename}`);

        // embedding generálás
        const embedForm = new FormData();
        embedForm.append("filename", data.filename);
        embedForm.append("workspace", workspace);
        await fetch("http://127.0.0.1:8000/generate-embeddings", {
          method: "POST",
          body: embedForm,
        });

        // PDF-lista frissítése
        const pdfResp = await fetch(
          `http://127.0.0.1:8000/list-pdfs?workspace=${workspace}`
        ).then((r) => r.json());
        setPdfFiles(pdfResp.pdfs || []);
      } else {
        setUploadMessage("❌ Upload failed");
      }
    }, "Feltöltés és embedding generálása…");

  const handleDeletePdf = () =>
    runWithLoader(async () => {
      if (!selectedBucket || !uploadedFilename) return;
      if (!confirm(`Biztosan törlöd: ${uploadedFilename}?`)) return;

      const ws = selectedBucket.replace("workspace-", "");
      const form = new FormData();
      form.append("workspace", ws);
      form.append("filename", uploadedFilename);

      const res = await fetch("http://127.0.0.1:8000/delete-pdf", {
        method: "DELETE",
        body: form,
      });
      const data = await res.json();
      alert(data.message);

      const pdfResp = await fetch(
        `http://127.0.0.1:8000/list-pdfs?workspace=${ws}`
      ).then((r) => r.json());
      setPdfFiles(pdfResp.pdfs || []);
      setUploadedFilename("");
    }, "PDF törlése…");

 const handleKeywordSearch = () =>
    runWithLoader(async () => {
      if (!keyword || (searchScope === "file" && !uploadedFilename)) return;
      const params = new URLSearchParams({
        query: keyword,
        top_k: "10",
        // only send filename for file-scope
        ...(searchScope === "file" ? { filename: uploadedFilename } : {}),
        workspace: selectedBucket.replace("workspace-", ""),
      });
      const res = await fetch(
        `http://127.0.0.1:8000/keyword-search?${params.toString()}`
      );
      const data = await res.json();
      setSearchResults(data.matches || []);
    }, "Kulcsszavas keresés…");

  // CHANGE HERE: similar adjustments in other handlers
  const handleEmbeddingSearch = () =>
    runWithLoader(async () => {
      if (!keyword || (searchScope === "file" && !uploadedFilename)) return;
      const body = {
        query: keyword,
        top_k: 10,
        ...(searchScope === "file" ? { filename: uploadedFilename } : {}),
        workspace: selectedBucket.replace("workspace-", ""),
      };
      const res = await fetch("http://127.0.0.1:8000/embedding-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setSearchResults(data.matches || []);
    }, "Embedding keresés…");

  const handleHybridSearch = () =>
    runWithLoader(async () => {
      if (!keyword || (searchScope === "file" && !uploadedFilename)) return;
      const body = {
        query: keyword,
        top_k: 10,
        ...(searchScope === "file" ? { filename: uploadedFilename } : {}),
        workspace: selectedBucket.replace("workspace-", ""),
      };
      const res = await fetch("http://127.0.0.1:8000/search-hybrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setSearchResults(data.matches || []);
    }, "Hybrid keresés…");

 const handleRagAnswer = () =>
  runWithLoader(async () => {
    // 1) Kizárólag a question változót nézd
    if (!question) return;
    // ha fájlra scope és nincs kiválasztott PDF, akkor se csináljunk semmit
    if (searchScope === "file" && !uploadedFilename) return;
    if (!selectedBucket) return;  // ellenőrizzük, hogy workspace is legyen

    const ws = selectedBucket.replace("workspace-", "");
    const body: any = {
      question: question,          // EZ már a helyes mező
      mode: ragMode,               // a state-ben tárolt választás
      top_k: 4,
      score_threshold: 0,
      workspace: ws,
    };
    if (searchScope === "file") {
      body.filename = uploadedFilename;
    }

    const res = await fetch("http://127.0.0.1:8000/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // ha 422 vagy más hiba, dob alternatív feedbacket
      const err = await res.text();
      alert(`Hiba a RAG hívás során: ${res.status}\n${err}`);
      return;
    }

    const data = await res.json();
    console.log(data);
    setAnswer(data.answer || "No answer found.");
  }, "RAG válasz lekérése…");

  const handleLocalRagAnswer = () =>
    runWithLoader(async () => {
      if (!question || !uploadedFilename) return;
      const res = await fetch("http://127.0.0.1:8000/rag-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, filename: uploadedFilename }),
      });
      const data = await res.json();
      setAnswer(data.answer || "No answer found.");
    }, "RAG válasz generálása…");

  // ------------------------------------
  //  Render
  // ------------------------------------
 return (
    <div style={pageStyle}>
      {/* ---------- OVERLAY ---------- */}
      {loading && (
        <>
          <style>{spinnerKeyframes}</style>
          <div style={overlayStyle}>
            <div style={spinnerStyle} />
            <p style={overlayTextStyle}>{loadingText}</p>
          </div>
        </>
      )}

      {/* ---------- CÍM ---------- */}
      <h1 style={titleStyle}>📄 SapiRAG</h1>

      {/* ---------- WORKSPACE SZEKCIÓ ---------- */}
      <section style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>Workspace</h2>

        <select
          value={selectedBucket}
          onChange={(e) => setSelectedBucket(e.target.value)}
          style={selectStyle}
        >
          <option value="">-- Select workspace --</option>
          {buckets.map((b, i) => (
            <option key={i} value={b}>
              {b}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="New workspace name"
          value={newBucketName}
          onChange={(e) => setNewBucketName(e.target.value)}
          style={inputStyle}
        />

        <div style={radioGroupStyle}>
          <label style={radioLabelStyle}>
            <input
              type="radio"
              value="file"
              checked={searchScope === "file"}
              onChange={() => setSearchScope("file")}
            />
            Egy fájl
          </label>
          <label style={radioLabelStyle}>
            <input
              type="radio"
              value="workspace"
              checked={searchScope === "workspace"}
              onChange={() => setSearchScope("workspace")}
            />
            Az egész workspace
          </label>
        </div>

        {pdfFiles.length > 0 && (
          <>
            <h3 style={subHeaderStyle}>PDF‑ek</h3>
            <select
              value={selectedPdf}
              onChange={(e) => {
                setSelectedPdf(e.target.value);
                setUploadedFilename(e.target.value);
              }}
              style={selectStyle}
              disabled={fileSelectDisabled}
            >
              <option value="">-- Válassz PDF‑et --</option>
              {pdfFiles.map((f, i) => (
                <option key={i} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </>
        )}

        <div style={buttonRowStyle}>
          <button onClick={handleCreateBucket} style={primaryButtonStyle}>
            ➕ Create workspace
          </button>
          <button onClick={handleDeleteWorkspace} style={dangerButtonStyle}>
            🗑️ Delete workspace
          </button>
          {selectedPdf && (
            <button onClick={handleDeletePdf} style={dangerButtonStyle}>
              🗑️ Delete PDF
            </button>
          )}
        </div>
      </section>

      {/* ---------- PDF FELTÖLTÉS ---------- */}
      <section style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>Upload PDF</h2>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          style={fileInputStyle}
        />
        <button onClick={handlePDFUpload} style={primaryButtonStyle}>
          ⬆️ Upload
        </button>
        <p style={messageStyle}>{uploadMessage}</p>
      </section>

      {/* ---------- KERESÉSEK ---------- */}
      <section style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>Keyword search</h2>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search by keyword"
          style={inputStyle}
        />
        <button onClick={handleKeywordSearch} style={primaryButtonStyle}>
          🔍 Search
        </button>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>Embedding search</h2>
        <textarea
          value={embeddingQuery}
          onChange={(e) => setEmbeddingQuery(e.target.value)}
          placeholder="Semantic query"
          rows={3}
          style={textAreaStyle}
        />
        <button onClick={handleEmbeddingSearch} style={primaryButtonStyle}>
          🔍 Search
        </button>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>Hybrid search</h2>
        <textarea
          value={hybridQuery}
          onChange={(e) => setHybridQuery(e.target.value)}
          placeholder="Hybrid semantic + keyword query"
          rows={3}
          style={textAreaStyle}
        />
        <button onClick={handleHybridSearch} style={primaryButtonStyle}>
          🧪 Hybrid search
        </button>
      </section>

      {/* ---------- RAG KÉRDÉS ---------- */}
      <section style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>Ask the PDF (RAG)</h2>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask your question…"
          rows={3}
          style={textAreaStyle}
        />

        <div style={radioGroupStyle}>
          {[
            { value: "embedding", label: "Vector" },
            { value: "keyword", label: "Keyword" },
            { value: "hybrid", label: "Hybrid" },
          ].map((opt) => (
            <label key={opt.value} style={radioLabelStyle}>
              <input
                type="radio"
                name="ragMode"
                value={opt.value}
                checked={ragMode === opt.value}
                onChange={() => setRagMode(opt.value as any)}
              />
              {opt.label}
            </label>
          ))}
        </div>

        <button onClick={handleRagAnswer} style={primaryButtonStyle}>
          💬 Ask
        </button>

        {answer && (
          <p style={answerStyle}>
            <strong>Answer:</strong> {answer}
          </p>
        )}
      </section>

      {/* ---------- TALÁLATOK ---------- */}
      {searchResults.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={sectionHeaderStyle}>Results</h2>
          {searchResults.map((res, idx) => (
            <div key={idx} style={resultCardStyle}>
              <strong>{res.header}</strong>
              <p>{res.body}</p>
              <div style={metaRowStyle}>
                {res.rank !== undefined && (
                  <span style={metaBadgeStyle}>rank {res.rank.toFixed(3)}</span>
                )}
                {res.score !== undefined && (
                  <span style={metaBadgeStyle}>
                    score {res.score.toFixed(3)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

/* =================================================
   ÚJ / MÓDOSÍTOTT STÍLUS‑OBJEKTUMOK
================================================== */

/* -- Színek és tipográfia -- */
const palette = {
  background: "#f7f9fc",
  cardBg: "#ffffff",
  border: "#e0e6ef",
  primary: "#1f7aff",
  primaryDark: "#145add",
  danger: "#ff4d4f",
  text: "#213547",
  subText: "#65748b",
  highlight: "#e8f1ff",
};

const pageStyle: React.CSSProperties = {
  padding: 24,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  background: `linear-gradient(180deg, ${palette.highlight} 0%, ${palette.background} 40%)`,
  minHeight: "100vh",
  color: palette.text,
};

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  marginBottom: 12,
  fontWeight: 700,
};

const sectionStyle: React.CSSProperties = {
  marginTop: 24,
  background: palette.cardBg,
  border: `1px solid ${palette.border}`,
  borderRadius: 10,
  padding: 20,
  boxShadow: "0 3px 6px rgba(0,0,0,0.05)",
  transition: "box-shadow 0.2s ease",
};

const sectionHeaderStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 16,
  fontSize: 20,
};

const subHeaderStyle: React.CSSProperties = {
  marginTop: 12,
  marginBottom: 8,
  fontSize: 16,
  color: palette.subText,
};

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${palette.border}`,
  borderRadius: 6,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  transition: "border 0.2s",
};

const inputStyle: React.CSSProperties = {
  ...inputBase,
  marginBottom: 12,
};

const textAreaStyle: React.CSSProperties = {
  ...inputBase,
  resize: "vertical",
  marginBottom: 12,
};

const selectStyle = { ...inputBase, background: "#fff", marginBottom: 12 };

const fileInputStyle: React.CSSProperties = { marginBottom: 12 };

const buttonBase: React.CSSProperties = {
  border: "none",
  borderRadius: 6,
  padding: "10px 18px",
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  transition: "background 0.2s",
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonBase,
  background: palette.primary,
  color: "#fff",
};
const dangerButtonStyle: React.CSSProperties = {
  ...buttonBase,
  background: palette.danger,
  color: "#fff",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 12,
};

const radioGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: 20,
  margin: "8px 0 12px",
  flexWrap: "wrap",
};
const radioLabelStyle: React.CSSProperties = { display: "flex", gap: 6 };

const messageStyle: React.CSSProperties = { marginTop: 8, color: palette.subText };

const answerStyle: React.CSSProperties = {
  marginTop: 12,
  background: palette.highlight,
  padding: 12,
  borderRadius: 6,
};

const resultCardStyle: React.CSSProperties = {
  background: palette.cardBg,
  border: `1px solid ${palette.border}`,
  borderRadius: 8,
  padding: 12,
  marginTop: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const metaRowStyle: React.CSSProperties = {
  marginTop: 8,
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};
const metaBadgeStyle: React.CSSProperties = {
  fontSize: 12,
  background: palette.highlight,
  padding: "2px 6px",
  borderRadius: 4,
};

/* ---- Loader stílusok ---- */
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(255,255,255,0.7)",
  backdropFilter: "blur(2px)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10_000,
};

const overlayTextStyle: React.CSSProperties = {
  marginTop: 14,
  fontWeight: 600,
  fontSize: 16,
};

const spinnerKeyframes = `
  @keyframes spin {
    0%   { transform: rotate(0deg);   }
    100% { transform: rotate(360deg); }
  }
`;

const spinnerStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: "50%",
  border: "8px solid #eef1f6",
  borderTop: `8px solid ${palette.primary}`,
  animation: "spin 1.2s linear infinite",
};