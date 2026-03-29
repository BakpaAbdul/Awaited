import { useEffect, useRef, useState } from "react";
import { STATUS_CONFIG } from "../lib/constants";
import { inputStyle, panelStyle, panelTitle, primaryButtonStyle, THEME } from "../lib/theme";
import { hasStoredHumanTrust } from "../lib/humanVerification";
import { turnstileSiteKey } from "../lib/supabaseClient";
import { TurnstileGate } from "./formControls";

export function StatusBadge({ status }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        justifyContent: "center",
        minWidth: 122,
        padding: "7px 16px",
        borderRadius: 999,
        background: `${STATUS_CONFIG[status].color}18`,
        color: STATUS_CONFIG[status].color,
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      <span>{STATUS_CONFIG[status].icon}</span>
      {status}
    </span>
  );
}

export function formatResultDate(value) {
  if (!value) {
    return "";
  }

  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) {
    return String(value);
  }

  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const SUMMARY_CHIP_CONFIG = {
  country: { background: "#fee2e2", color: "#b91c1c" },
  level: { background: "#dbeafe", color: "#1d4ed8" },
  field: { background: "#ede9fe", color: "#6d28d9" },
  cycleYear: { background: "#dcfce7", color: "#15803d" },
  applicationRound: { background: "#fef3c7", color: "#b45309" },
  nationality: { background: "#cffafe", color: "#0f766e" },
  gpa: { background: "#e0f2fe", color: "#0369a1" },
};

export function getResultSummaryItems(result) {
  return [
    result.country ? { key: "country", label: result.country } : null,
    result.level ? { key: "level", label: result.level } : null,
    result.field ? { key: "field", label: result.field } : null,
    result.cycleYear ? { key: "cycleYear", label: result.cycleYear } : null,
    result.applicationRound ? { key: "applicationRound", label: result.applicationRound } : null,
    result.nationality ? { key: "nationality", label: result.nationality } : null,
    result.gpa ? { key: "gpa", label: `GPA: ${result.gpa}` } : null,
  ].filter(Boolean);
}

export function SummaryChip({ item, compact = false }) {
  const config = SUMMARY_CHIP_CONFIG[item.key] || {
    background: THEME.panelBackgroundMuted,
    color: THEME.textPrimary,
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: compact ? "4px 8px" : "5px 10px",
        borderRadius: 10,
        background: config.background,
        color: config.color,
        fontSize: compact ? 11 : 12,
        fontWeight: 700,
        lineHeight: 1.1,
      }}
    >
      {item.label}
    </span>
  );
}

export function ModerationChip({ reviewState, reason }) {
  if (!reviewState || reviewState === "approved") {
    return null;
  }

  const config =
    reviewState === "pending"
      ? { color: "#F59E0B", label: "Pending" }
      : { color: "#EF4444", label: "Rejected" };

  return (
    <span
      title={reason || config.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: `${config.color}18`,
        color: config.color,
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.8,
      }}
    >
      {config.label}
    </span>
  );
}

export function AdminBtn({ children, color, onClick, small }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: small ? "6px 10px" : "8px 12px",
        borderRadius: 8,
        border: `1px solid ${color}44`,
        background: `${color}18`,
        color,
        fontSize: small ? 11 : 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function AnalyticsCard({ label, value, color }) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 14,
        background: THEME.panelBackgroundStrong,
        border: `1px solid ${THEME.panelBorder}`,
        boxShadow: THEME.panelShadow,
      }}
    >
      <div style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

export function MetadataItem({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        background: THEME.panelBackgroundSubtle,
        border: `1px solid ${THEME.panelBorderSoft}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: THEME.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, color: THEME.textPrimary, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

export function ModerationResultRow({
  result,
  verified,
  onApprove,
  onReject,
  onDelete,
  onVerifyName,
  onToggleHide,
}) {
  const summaryItems = getResultSummaryItems(result);

  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: "rgba(245,158,11,0.05)",
        border: "1px solid rgba(245,158,11,0.12)",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: THEME.textPrimary }}>{result.scholarship}</span>
            <StatusBadge status={result.status} />
            <ModerationChip reviewState={result.reviewState} reason={result.moderationReason} />
            {!verified ? <span style={{ fontSize: 10, color: "#D97706" }}>Unknown scholarship</span> : null}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }}>
            {summaryItems.map((item) => (
              <SummaryChip key={`${result.id}-${item.key}-${item.label}`} item={item} compact />
            ))}
            {result.date ? (
              <span style={{ fontSize: 12, color: THEME.textMuted }}>{formatResultDate(result.date)}</span>
            ) : null}
          </div>
          {(result.university || result.program) && (
            <div style={{ fontSize: 12, color: THEME.textSoft, marginBottom: 6 }}>
              {[result.university, result.program].filter(Boolean).join(" · ")}
            </div>
          )}
          {result.note ? (
            <div style={{ fontSize: 13, color: THEME.textSecondary, marginBottom: 6 }}>{result.note}</div>
          ) : null}
          {result.moderationReason ? (
            <div style={{ fontSize: 12, color: "#D97706" }}>Reason: {result.moderationReason}</div>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <AdminBtn onClick={onApprove} color="#059669">
            Approve
          </AdminBtn>
          <AdminBtn onClick={onReject} color="#D97706">
            Reject
          </AdminBtn>
          {onToggleHide ? (
            <AdminBtn onClick={onToggleHide} color={result.hidden ? "#059669" : "#EF4444"}>
              {result.hidden ? "Unhide" : "Hide"}
            </AdminBtn>
          ) : null}
          {!verified ? (
            <AdminBtn onClick={onVerifyName} color="#6366F1">
              Verify Name
            </AdminBtn>
          ) : null}
          <AdminBtn onClick={onDelete} color="#DC2626">
            Delete
          </AdminBtn>
        </div>
      </div>
    </div>
  );
}

export function ResultCard({
  result,
  expanded,
  onToggle,
  onScholarshipClick,
  commentText,
  onCommentChange,
  onCommentSubmit,
  isAdmin,
  onApprove,
  onReject,
  onToggleHide,
  onDelete,
  verified,
}) {
  const [honeypot, setHoneypot] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [focusComposerOnExpand, setFocusComposerOnExpand] = useState(false);
  const commentInputRef = useRef(null);
  const requiresCaptcha = turnstileSiteKey && !hasStoredHumanTrust();
  const summaryItems = getResultSummaryItems(result);
  const detailsId = `result-details-${result.id}`;
  const timelineMetadata = [
    { label: "Cycle Year", value: result.cycleYear },
    { label: "Application Round", value: result.applicationRound },
    { label: "University", value: result.university },
    { label: "Program", value: result.program },
    { label: "Applied Date", value: formatResultDate(result.appliedDate) },
    { label: "Interview Date", value: formatResultDate(result.interviewDate) },
    { label: "Latest Update", value: formatResultDate(result.date) },
    { label: "Final Decision", value: formatResultDate(result.finalDecisionDate) },
    { label: "Nationality", value: result.nationality },
    { label: "GPA", value: result.gpa },
  ].filter((item) => item.value);

  const handleSendComment = async () => {
    const resultMeta = await onCommentSubmit(commentText, {
      honeypot,
      captchaToken,
    });

    if (resultMeta) {
      setHoneypot("");
      setCaptchaToken("");
      setCaptchaResetKey((value) => value + 1);
    }
  };

  const visibleComments = isAdmin
    ? result.comments
    : result.comments.filter((comment) => comment.reviewState === "approved");

  useEffect(() => {
    if (expanded && focusComposerOnExpand) {
      commentInputRef.current?.focus();
      setFocusComposerOnExpand(false);
    }
  }, [expanded, focusComposerOnExpand]);

  const handleReplyClick = (event) => {
    event.stopPropagation();

    if (!expanded) {
      setFocusComposerOnExpand(true);
      onToggle();
      return;
    }

    commentInputRef.current?.focus();
  };

  return (
    <div
      style={{
        background: result.hidden ? "rgba(220,38,38,0.03)" : THEME.panelBackgroundStrong,
        border: `1px solid ${result.hidden ? "rgba(220,38,38,0.1)" : THEME.panelBorder}`,
        borderRadius: 14,
        overflow: "hidden",
        opacity: result.hidden ? 0.55 : 1,
        boxShadow: THEME.panelShadow,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={expanded}
        aria-controls={detailsId}
        style={{
          width: "100%",
          padding: "16px 20px",
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          cursor: "pointer",
          background: "transparent",
          textAlign: "left",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            {verified ? <span style={{ color: "#059669", fontSize: 11 }} title="Verified scholarship">✓</span> : null}
            <span
              onClick={(event) => {
                event.stopPropagation();
                onScholarshipClick(result.scholarship);
              }}
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: THEME.textPrimary,
                cursor: "pointer",
                borderBottom: `1px dashed ${THEME.dashedBorder}`,
                textDecoration: result.hidden ? "line-through" : "none",
              }}
            >
              {result.scholarship}
            </span>
            <ModerationChip reviewState={result.reviewState} reason={result.moderationReason} />
            {result.hidden ? <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 700 }}>HIDDEN</span> : null}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {summaryItems.map((item) => (
              <SummaryChip key={`${result.id}-${item.key}-${item.label}`} item={item} />
            ))}
          </div>
          {(result.university || result.program) && (
            <div style={{ display: "flex", gap: 14, fontSize: 12, color: THEME.textSoft, flexWrap: "wrap", marginTop: 6 }}>
              {result.university ? <span>🏫 {result.university}</span> : null}
              {result.program ? <span>🧪 {result.program}</span> : null}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <StatusBadge status={result.status} />
            <button
              type="button"
              onClick={handleReplyClick}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${THEME.panelBorder}`,
                background: THEME.panelBackgroundSubtle,
                color: THEME.textPrimary,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reply
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: THEME.textSoft, fontSize: 12 }}>
            <span>{formatResultDate(result.date)}</span>
            {visibleComments.length > 0 ? <span>💬 {visibleComments.length}</span> : null}
          </div>
        </div>
      </div>

      {expanded ? (
        <div id={detailsId} style={{ borderTop: `1px solid ${THEME.panelBorderSoft}`, padding: "16px 20px" }}>
          {timelineMetadata.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {timelineMetadata.map((item) => (
                <MetadataItem key={`${result.id}-${item.label}`} label={item.label} value={item.value} />
              ))}
            </div>
          ) : null}

          {result.note ? (
            <div
              style={{
                fontSize: 13,
                color: THEME.textSecondary,
                lineHeight: 1.6,
                marginBottom: 16,
                padding: "12px 16px",
                background: THEME.panelBackgroundSubtle,
                borderRadius: 10,
                borderLeft: `3px solid ${STATUS_CONFIG[result.status].color}44`,
              }}
            >
              {result.note}
            </div>
          ) : null}

          {isAdmin ? (
            <div
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 14,
                padding: "8px 12px",
                background: THEME.accentSurface,
                borderRadius: 8,
                border: `1px solid ${THEME.accentBorder}`,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: THEME.accentText,
                  marginRight: "auto",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                ⚙ Admin
              </span>
              {result.reviewState !== "approved" ? (
                <AdminBtn onClick={onApprove} color="#059669">
                  Approve
                </AdminBtn>
              ) : null}
              {result.reviewState !== "rejected" ? (
                <AdminBtn onClick={onReject} color="#D97706">
                  Reject
                </AdminBtn>
              ) : null}
              <AdminBtn onClick={onToggleHide} color={result.hidden ? "#059669" : "#D97706"}>
                {result.hidden ? "Unhide" : "Hide"}
              </AdminBtn>
              <AdminBtn onClick={onDelete} color="#DC2626">
                Delete
              </AdminBtn>
            </div>
          ) : null}

          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: THEME.textMuted,
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Discussion ({visibleComments.length})
            </div>
            {visibleComments.map((comment) => (
              <div
                key={comment.id}
                style={{
                  padding: "8px 12px",
                  background: THEME.panelBackgroundSubtle,
                  borderRadius: 8,
                  marginBottom: 6,
                  fontSize: 13,
                  color: THEME.textSecondary,
                  border: `1px solid ${THEME.panelBorderSoft}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: THEME.textMuted, fontSize: 11 }}>Anonymous · {comment.time}</span>
                  {isAdmin ? (
                    <ModerationChip reviewState={comment.reviewState} reason={comment.moderationReason} />
                  ) : null}
                </div>
                <div style={{ marginTop: 4 }}>{comment.text}</div>
              </div>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              <input
                ref={commentInputRef}
                type="text"
                aria-label={`Add anonymous comment for ${result.scholarship}`}
                placeholder="Add a comment anonymously..."
                value={commentText}
                onChange={(event) => onCommentChange(event.target.value)}
                onKeyDown={(event) => (event.key === "Enter" ? handleSendComment() : undefined)}
                style={{ ...inputStyle, padding: "8px 14px" }}
              />
              <input
                type="text"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
                tabIndex={-1}
                autoComplete="off"
                style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
                aria-hidden="true"
              />
              {requiresCaptcha ? <TurnstileGate resetKey={captchaResetKey} onVerify={setCaptchaToken} /> : null}
              <button
                onClick={handleSendComment}
                style={{
                  ...primaryButtonStyle,
                  width: "auto",
                  alignSelf: "flex-end",
                  padding: "8px 16px",
                  fontSize: 12,
                }}
                disabled={requiresCaptcha ? !captchaToken : !commentText.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function LoadingPanel({ message = "Loading…" }) {
  return (
    <div style={{ ...panelStyle, textAlign: "center", padding: 32 }}>
      <h3 style={{ ...panelTitle, marginBottom: 8 }}>Loading</h3>
      <p style={{ color: THEME.textMuted, margin: 0, fontSize: 13 }}>{message}</p>
    </div>
  );
}
