import React, { useState } from "react";
import {
  createBucket,
  deleteWorkspace,
  deletePdf,
  getBuckets,
  listPdfs,
} from "../services/workspaceService";
import { SearchScope } from "../types";
import { palette } from "../colors";
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

type Props = {
  buckets: string[];
  selectedBucket: string;
  onSelectBucket: (b: string) => void;
  searchScope: SearchScope;
  onChangeSearchScope: (s: SearchScope) => void;
  pdfFiles: string[];
  selectedPdf: string;
  onSelectPdf: (f: string) => void;
  runWithLoader: (task: () => Promise<void>, txt: string) => void;
  setBuckets: (b: string[]) => void;
  setPdfFiles: (p: string[]) => void;
  uploadedFilename: string;
};

const WorkspaceSection: React.FC<Props> = (props) => {
  const {
    buckets,
    selectedBucket,
    onSelectBucket,
    searchScope,
    onChangeSearchScope,
    pdfFiles,
    selectedPdf,
    onSelectPdf,
    runWithLoader,
    setBuckets,
    setPdfFiles,
    uploadedFilename,
  } = props;

  const [newBucketName, setNewBucketName] = useState("");

  const refreshBuckets = async () => setBuckets(await getBuckets());

  const handleCreateBucket = () =>
    runWithLoader(async () => {
      if (!newBucketName) return;
      await createBucket(newBucketName);
      setNewBucketName("");
      await refreshBuckets();
    }, "Creating a workspace…");

  const handleDeleteWorkspace = () =>
    runWithLoader(async () => {
      if (!selectedBucket) return;
      await deleteWorkspace(selectedBucket.replace("workspace-", ""));
      await refreshBuckets();
      onSelectBucket("");
    }, "Deleting workspace…");

  const handleDeletePdf = () =>
    runWithLoader(async () => {
      if (!selectedBucket || !uploadedFilename) return;
      if (!confirm(`Are you sure you want to delete: ${uploadedFilename}?`)) return;
      const ws = selectedBucket.replace("workspace-", "");
      await deletePdf(ws, uploadedFilename);
      setPdfFiles(await listPdfs(ws));
    }, "Deleting PDF…");

  return (
    <section style={sectionStyle}>
      <h2 style={sectionHeaderStyle}>Workspace</h2>

      <select
        value={selectedBucket}
        onChange={(e) => onSelectBucket(e.target.value)}
        style={selectStyle}
      >
        <option value="">-- Select workspace --</option>
        {buckets.map((b) => (
          <option key={b} value={b}>
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
        {(["file", "workspace"] as SearchScope[]).map((v) => (
          <label key={v} style={radioLabelStyle}>
            <input
              type="radio"
              value={v}
              checked={searchScope === v}
              onChange={() => onChangeSearchScope(v)}
            />
            {v === "file" ? "Selected file" : "Full workspace"}
          </label>
        ))}
      </div>

      {pdfFiles.length > 0 && (
        <>
          <h3 style={subHeaderStyle}>PDF‑ek</h3>
          <select
            value={selectedPdf}
            onChange={(e) => onSelectPdf(e.target.value)}
            style={selectStyle}
            disabled={searchScope === "workspace"}
          >
            <option value="">-- Válassz PDF‑et --</option>
            {pdfFiles.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </>
      )}

      <div style={buttonRowStyle}>
        <button onClick={handleCreateBucket} style={primaryButtonStyle}>
        <AddIcon fontSize="small" />
        Create workspace
        </button>
        <button onClick={handleDeleteWorkspace} style={dangerButtonStyle}>
        <DeleteOutlineIcon fontSize="small" />
          Delete workspace
        </button>
        {selectedPdf && (
          <button onClick={handleDeletePdf} style={dangerButtonStyle}>
            <DeleteOutlineIcon fontSize="small" />
            Delete PDF
          </button>
        )}
      </div>
    </section>
  );
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginTop: 24,
  background: "#ffffff",
  border: "1px solid #e0e6ef",
  borderRadius: 10,
  padding: 20,
  boxShadow: "0 3px 6px rgba(0,0,0,0.05)",
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
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${palette.border}`,
  borderRadius: 6,
  padding: "10px 12px",
  fontSize: 14,
  marginBottom: 12,
} as const;
const selectStyle = { ...inputStyle, background: "#fff" };
const radioGroupStyle = { display: "flex", gap: 20, margin: "8px 0 12px" };
const radioLabelStyle = { display: "flex", gap: 6 };
const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 12,
};
const primaryButtonStyle = {
  border: "none",
  borderRadius: 6,
  display: 'flex',
  padding: "10px 18px",
  fontSize: 14,
  cursor: "pointer",
  background: palette.primary,
  color: "#fff",
};
const dangerButtonStyle = { ...primaryButtonStyle, background: palette.danger,   display: 'flex', };



export default WorkspaceSection;
