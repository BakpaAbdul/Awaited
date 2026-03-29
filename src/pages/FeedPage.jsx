import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { LEVELS, STATUSES, STATUS_CONFIG } from "../lib/constants";
import { inputStyle, THEME } from "../lib/theme";
import { ResultCard } from "../components/results";
import { EmptyFeedState, FilterSelect, StatChip, TrustNotice } from "../components/siteChrome";

const RESULTS_PAGE_SIZE = 18;

export default function FeedPage({
  visibleResults,
  isAdmin,
  onNavigate,
  onCommentSubmit,
  onApproveResult,
  onRejectResult,
  onToggleHideResult,
  onDeleteResult,
  isVerifiedScholarship,
  stats,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterLevel, setFilterLevel] = useState("All");
  const [filterCountry, setFilterCountry] = useState("All");
  const [expandedCard, setExpandedCard] = useState(null);
  const [newComments, setNewComments] = useState({});
  const [visibleCount, setVisibleCount] = useState(RESULTS_PAGE_SIZE);
  const deferredQuery = useDeferredValue(searchQuery);

  const countries = useMemo(
    () => [...new Set(visibleResults.map((result) => result.country))].sort(),
    [visibleResults],
  );
  const scholarships = useMemo(
    () => [...new Set(visibleResults.map((result) => result.scholarship))].sort(),
    [visibleResults],
  );

  const filtered = useMemo(() => {
    return visibleResults
      .filter((result) => {
        const query = deferredQuery.toLowerCase();
        const matchSearch =
          !query ||
          result.scholarship.toLowerCase().includes(query) ||
          result.country.toLowerCase().includes(query) ||
          result.field.toLowerCase().includes(query) ||
          result.cycleYear.toLowerCase().includes(query) ||
          result.university.toLowerCase().includes(query) ||
          result.program.toLowerCase().includes(query) ||
          result.applicationRound.toLowerCase().includes(query);
        const matchStatus = filterStatus === "All" || result.status === filterStatus;
        const matchLevel = filterLevel === "All" || result.level === filterLevel;
        const matchCountry = filterCountry === "All" || result.country === filterCountry;
        return matchSearch && matchStatus && matchLevel && matchCountry;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [visibleResults, deferredQuery, filterStatus, filterLevel, filterCountry]);

  useEffect(() => {
    setVisibleCount(RESULTS_PAGE_SIZE);
  }, [deferredQuery, filterStatus, filterLevel, filterCountry]);

  const visibleSlice = filtered.slice(0, visibleCount);

  return (
    <>
      <TrustNotice onNavigate={onNavigate} />

      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <StatChip label="Total Reports" value={stats.total} color="#94A3B8" />
        {STATUSES.map((status) => (
          <StatChip
            key={status}
            label={status}
            value={stats[status]}
            color={STATUS_CONFIG[status].color}
            onClick={() => setFilterStatus(filterStatus === status ? "All" : status)}
            active={filterStatus === status}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          aria-label="Search scholarship results"
          placeholder="Search scholarships, countries, fields..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 220, padding: "10px 16px" }}
        />
        <FilterSelect
          value={filterLevel}
          onChange={(event) => setFilterLevel(event.target.value)}
          options={["All", ...LEVELS]}
          label="Filter by study level"
        />
        <FilterSelect
          value={filterCountry}
          onChange={(event) => setFilterCountry(event.target.value)}
          options={["All", ...countries]}
          label="Filter by country"
        />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {scholarships.map((name) => {
          const count = visibleResults.filter((result) => result.scholarship === name).length;
          if (count === 0 && !isAdmin) {
            return null;
          }

          return (
            <button
              key={name}
              onClick={() => onNavigate("scholarship", { scholarshipName: name })}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: `1px solid ${THEME.panelBorder}`,
                background: THEME.panelBackgroundStrong,
                color: THEME.textSecondary,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {isVerifiedScholarship(name) ? <span style={{ color: "#059669", fontSize: 10 }}>✓</span> : null}
              {name} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        visibleResults.length === 0 ? (
          <EmptyFeedState onSubmit={() => onNavigate("submit")} />
        ) : (
          <div style={{ textAlign: "center", padding: 60, color: THEME.textSoft }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>∅</div>
            <div style={{ fontSize: 15 }}>No results match your filters</div>
          </div>
        )
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleSlice.map((result) => (
              <ResultCard
                key={result.id}
                result={result}
                expanded={expandedCard === result.id}
                onToggle={() => setExpandedCard(expandedCard === result.id ? null : result.id)}
                onScholarshipClick={(name) => onNavigate("scholarship", { scholarshipName: name })}
                commentText={newComments[result.id] || ""}
                onCommentChange={(value) => setNewComments((current) => ({ ...current, [result.id]: value }))}
                onCommentSubmit={(text, moderation) => onCommentSubmit(result.id, text, moderation)}
                isAdmin={isAdmin}
                onApprove={() => onApproveResult(result.id)}
                onReject={() => onRejectResult(result.id)}
                onToggleHide={() => onToggleHideResult(result.id, !result.hidden)}
                onDelete={() => onDeleteResult(result.id)}
                verified={isVerifiedScholarship(result.scholarship)}
              />
            ))}
          </div>

          {filtered.length > visibleSlice.length ? (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
              <button
                onClick={() => setVisibleCount((current) => current + RESULTS_PAGE_SIZE)}
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
                Load more results
              </button>
            </div>
          ) : null}
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32, color: THEME.textSoft, fontSize: 13 }}>
        Showing {visibleSlice.length} of {filtered.length} matching results
      </div>
    </>
  );
}
