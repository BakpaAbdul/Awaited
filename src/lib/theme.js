export const THEME = {
  pageBackground: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 48%, #e5e7eb 100%)",
  textPrimary: "#0f172a",
  textSecondary: "#334155",
  textMuted: "#64748b",
  textSoft: "#475569",
  panelBackground: "rgba(255,255,255,0.9)",
  panelBackgroundStrong: "#ffffff",
  panelBackgroundSubtle: "#f8fafc",
  panelBackgroundMuted: "#f1f5f9",
  panelBorder: "rgba(148,163,184,0.22)",
  panelBorderStrong: "rgba(148,163,184,0.32)",
  panelBorderSoft: "rgba(148,163,184,0.18)",
  panelShadow: "0 18px 48px rgba(15,23,42,0.08)",
  dashedBorder: "rgba(71,85,105,0.32)",
  accentText: "#4f46e5",
  accentSurface: "rgba(99,102,241,0.1)",
  accentBorder: "rgba(99,102,241,0.18)",
};

export const panelStyle = {
  background: THEME.panelBackground,
  border: `1px solid ${THEME.panelBorder}`,
  borderRadius: 14,
  padding: "20px 22px",
  boxShadow: THEME.panelShadow,
  backdropFilter: "blur(10px)",
};

export const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: `1px solid ${THEME.panelBorderStrong}`,
  background: THEME.panelBackgroundStrong,
  color: THEME.textPrimary,
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export const panelTitle = {
  fontSize: 14,
  fontWeight: 700,
  color: THEME.textPrimary,
  marginBottom: 14,
  marginTop: 0,
};

export const primaryButtonStyle = {
  padding: "14px 0",
  borderRadius: 12,
  border: "none",
  width: "100%",
  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 14px 28px rgba(79,70,229,0.2)",
};
