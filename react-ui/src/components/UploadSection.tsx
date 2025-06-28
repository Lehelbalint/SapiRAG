import React, { useState } from "react";
import { uploadPdf } from "../services/workspaceService";
import { palette } from "../colors";
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';

type Props = {
  selectedBucket: string;
  pdfFile: File | null;
  setPdfFile: (f: File | null) => void;
  runWithLoader: (task: () => Promise<void>, txt: string) => void;
  refreshPdfList: () => Promise<void>;
  setUploadedFilename: (n: string) => void;
};

const UploadSection: React.FC<Props> = ({
  selectedBucket,
  pdfFile,
  setPdfFile,
  runWithLoader,
  refreshPdfList,
  setUploadedFilename,
}) => {
  const [msg, setMsg] = useState("");

  const handleUpload = () =>
    runWithLoader(async () => {
      if (!pdfFile || !selectedBucket) return;
      const ws = selectedBucket.replace("workspace-", "");
      const data = await uploadPdf(pdfFile, ws);
      setUploadedFilename(data.filename);
      setMsg(`✅ Uploaded: ${data.filename}`);

      const form = new FormData();
      form.append("filename", data.filename);
      form.append("workspace", ws);
      await fetch("http://127.0.0.1:8000/search/generate-embeddings", {
        method: "POST",
        body: form,
      });

      await refreshPdfList();
    }, "Uploading and generating embedding…");

  return (
    <section style={sectionStyle}>
      <h2 style={headerStyle}>Upload PDF</h2>
     <div style={{display: 'flex',flexDirection: 'column', alignItems: 'center'}}>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
        style={{ marginBottom: 12, marginLeft:80 }}
      />
      <button onClick={handleUpload} style={primaryButtonStyle}>
        <DriveFolderUploadIcon/>
         Upload
      </button>
      <p style={{ marginTop: 8, color: palette.subText }}>{msg}</p>
      </div>
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

export default UploadSection;
