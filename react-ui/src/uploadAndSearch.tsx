import { useState } from "react";

// Result object structure
type SearchResult = {
  header: string;
  body: string;
  score?: number;
};

export default function PDFUploaderAndSearch() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadedFilename, setUploadedFilename] = useState("");
  const [keyword, setKeyword] = useState("");
  const [embeddingQuery, setEmbeddingQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const handlePDFUpload = async () => {
    if (!pdfFile) return;

    const formData = new FormData();
    formData.append("file", pdfFile);

    const uploadResponse = await fetch("http://127.0.0.1:8000/upload-pdf", {
      method: "POST",
      body: formData,
    });

    if (uploadResponse.ok) {
      const data = await uploadResponse.json();
      setUploadedFilename(data.filename);
      setUploadMessage(`✅ Upload successful: ${data.filename}`);

      await fetch("http://127.0.0.1:8000/generate-embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: data.filename }),
      });
    } else {
      setUploadMessage("❌ Upload failed.");
    }
  };

  const handleKeywordSearch = async () => {
    const response = await fetch(
      `http://127.0.0.1:8000/keyword-search?query=${encodeURIComponent(keyword)}&filename=${encodeURIComponent(uploadedFilename)}`
    );
    const data = await response.json();
    setSearchResults(data.matches || []);
  };

  const handleEmbeddingSearch = async () => {
    const response = await fetch("http://127.0.0.1:8000/embedding-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: embeddingQuery, top_k: 5, filename: uploadedFilename }),
    });
    const data = await response.json();
    setSearchResults(data.results || []);
  };

    const handleLocalRagAnswer = async () => {
    const response = await fetch("http://127.0.0.1:8000/rag-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, filename: uploadedFilename }),
    });
    const data = await response.json();
    console.log(data);
    setAnswer(data.answer || "No answer found.");
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>📄 Upload PDF and Search</h1>

      <div style={{ marginTop: "20px", border: "1px solid gray", padding: "15px", borderRadius: "8px" }}>
        <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
        <br />
        <button onClick={handlePDFUpload} style={{ marginTop: "10px" }}>
          Upload PDF and Generate Embeddings
        </button>
        <p>{uploadMessage}</p>
        {uploadedFilename && <p><strong>File selected:</strong> {uploadedFilename}</p>}
      </div>

      <div style={{ marginTop: "20px", border: "1px solid gray", padding: "15px", borderRadius: "8px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold" }}>🔍 Keyword Search</h2>
        <input
          type="text"
          placeholder="e.g. exam"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: "100%", padding: "8px", marginTop: "10px" }}
        />
        <br />
        <button onClick={handleKeywordSearch} style={{ marginTop: "10px" }}>
          Search by Keyword
        </button>
      </div>

      <div style={{ marginTop: "20px", border: "1px solid gray", padding: "15px", borderRadius: "8px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold" }}>🤖 Embedding Search</h2>
        <textarea
          placeholder="e.g. ways of examination"
          value={embeddingQuery}
          onChange={(e) => setEmbeddingQuery(e.target.value)}
          rows={4}
          style={{ width: "100%, padding: \"8px\", marginTop: \"10px\"" }}
        />
        <br />
        <button onClick={handleEmbeddingSearch} style={{ marginTop: "10px" }}>
          Search by Semantic Similarity
        </button>
      </div>

            <section style={sectionStyle}>
        <h2>🧠 Ask a Question (Local LLM)</h2>
        <input
          type="text"
          placeholder="e.g. Who is responsible for approval?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={inputStyle}
        />
        <button onClick={handleLocalRagAnswer} style={buttonStyle}>Ask</button>
        {answer && <p style={{ marginTop: "10px" }}><strong>Answer:</strong> {answer}</p>}
      </section>

      {searchResults.length > 0 && (
        <div style={{ marginTop: "20px", border: "1px solid gray", padding: "15px", borderRadius: "8px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold" }}>📚 Search Results:</h2>
          {searchResults.map((result, index) => (
            <div key={index} style={{ marginTop: "10px", borderTop: "1px solid lightgray", paddingTop: "10px" }}>
              <h3 style={{ fontWeight: "bold" }}>{result.header}</h3>
              <p>{result.body}</p>
              {typeof result.score === "number" && (
                <p style={{ fontSize: "12px", color: "gray" }}>
                  Similarity score: {result.score.toFixed(3)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const sectionStyle = {
  marginTop: "20px",
  border: "1px solid gray",
  padding: "15px",
  borderRadius: "8px"
};

const inputStyle = {
  width: "100%",
  padding: "8px",
  marginTop: "10px"
};

const buttonStyle = {
  marginTop: "10px",
  padding: "6px 12px"
};
