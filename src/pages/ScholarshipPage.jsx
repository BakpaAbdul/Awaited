import { useEffect, useMemo, useState } from "react";
import { getStatusConfig } from "../lib/constants";
import { panelStyle, panelTitle, THEME } from "../lib/theme";
import { MetadataItem, ResultCard } from "../components/results";

const SCHOLARSHIP_PAGE_SIZE = 12;

export default function ScholarshipPage({
  data,
  onBack,
  onCommentSubmit,
  isAdmin,
  onApprove,
  onReject,
  onToggleHide,
  onDelete,
  verified,
}) {
  const { entries, statusCounts, name, record, displayStatuses } = data;
  const [expandedCard, setExpandedCard] = useState(null);
  const [newComments, setNewComments] = useState({});
  const [visibleCount, setVisibleCount] = useState(SCHOLARSHIP_PAGE_SIZE);
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [entries],
  );
  const total = entries.filter((entry) => entry.reviewState === "approved" && !entry.hidden).length;
  const visibleEntries = sortedEntries.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(SCHOLARSHIP_PAGE_SIZE);
  }, [name]);

  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: THEME.textMuted, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}
      >
        ← Back to all results
      </button>
      <div style={{ ...panelStyle, borderRadius: 16, padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          {verified ? <span style={{ color: "#059669", fontSize: 14 }}>✓</span> : null}
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 24,
              fontWeight: 700,
              color: THEME.textPrimary,
              margin: 0,
            }}
          >
            {name}
          </h2>
        </div>
        <div
          style={{
            display: "flex",
            height: 8,
            borderRadius: 4,
            overflow: "hidden",
            marginBottom: 16,
            background: THEME.panelBackgroundMuted,
          }}
        >
          {displayStatuses.map((status) =>
            statusCounts[status] > 0 ? (
              <div
                key={status}
                style={{
                  width: `${(statusCounts[status] / Math.max(total, 1)) * 100}%`,
                  background: getStatusConfig(status).color,
                }}
              />
            ) : null,
          )}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {displayStatuses.map((status) => (
            <div key={status} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: getStatusConfig(status).color }} />
              <span style={{ color: THEME.textSecondary }}>{status}:</span>
              <span style={{ color: THEME.textPrimary, fontWeight: 600 }}>{statusCounts[status]}</span>
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 13, color: THEME.textMuted }}>{total} public reports</div>
        </div>
      </div>
      {record ? (
        <div style={{ ...panelStyle, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
            <MetadataItem label="Country" value={record.country} />
            <MetadataItem label="Funder" value={record.funder} />
            <MetadataItem label="Funding Type" value={record.type} />
            <MetadataItem label="Typical Deadline" value={record.typical_deadline} />
            <MetadataItem label="Results Timeline" value={record.results_timeline} />
            <MetadataItem label="Levels" value={record.levels?.join(", ")} />
          </div>
          {record.description ? (
            <p style={{ color: THEME.textSecondary, fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>{record.description}</p>
          ) : null}
          {record.eligibility_notes ? (
            <p style={{ color: THEME.textMuted, fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>{record.eligibility_notes}</p>
          ) : null}
          {record.website ? (
            <a href={record.website} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontSize: 13, textDecoration: "none" }}>
              Visit official scholarship website →
            </a>
          ) : null}
        </div>
      ) : null}
      {entries.length === 0 ? (
        <div style={{ ...panelStyle, textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>⌛</div>
          <h3 style={{ ...panelTitle, marginBottom: 8 }}>No public reports yet</h3>
          <p style={{ color: THEME.textMuted, fontSize: 13, margin: 0 }}>
            This scholarship already has a catalog page, but Awaited has not published any public reports for it yet.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleEntries.map((result) => (
              <ResultCard
                key={result.id}
                result={result}
                expanded={expandedCard === result.id}
                onToggle={() => setExpandedCard(expandedCard === result.id ? null : result.id)}
                onScholarshipClick={() => {}}
                commentText={newComments[result.id] || ""}
                onCommentChange={(value) => setNewComments((current) => ({ ...current, [result.id]: value }))}
                onCommentSubmit={(text, moderation) => onCommentSubmit(result.id, text, moderation)}
                isAdmin={isAdmin}
                onApprove={() => onApprove(result.id)}
                onReject={() => onReject(result.id)}
                onToggleHide={() => onToggleHide(result.id, !result.hidden)}
                onDelete={() => onDelete(result.id)}
                verified={verified}
              />
            ))}
          </div>

          {sortedEntries.length > visibleEntries.length ? (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
              <button
                onClick={() => setVisibleCount((current) => current + SCHOLARSHIP_PAGE_SIZE)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: `1px solid ${THEME.panelBorder}`,
                  background: THEME.panelBackgroundStrong,
                  color: THEME.textPrimary,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Load more reports
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
