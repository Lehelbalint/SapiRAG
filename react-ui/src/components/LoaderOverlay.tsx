import React from "react";
import { palette } from "../colors";

type Props = { loading: boolean; text: string };

const LoaderOverlay: React.FC<Props> = ({ loading, text }) => {
  if (!loading) return null;

  return (
    <>
      <style>{spinnerKeyframes}</style>
      <div style={overlayStyle}>
        <div style={spinnerStyle} />
        <p style={overlayTextStyle}>{text}</p>
      </div>
    </>
  );
};

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
  @keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }
`;
const spinnerStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: "50%",
  border: "8px solid #eef1f6",
  borderTop: `8px solid ${palette.primary}`,
  animation: "spin 1.2s linear infinite",
};

export default LoaderOverlay;
