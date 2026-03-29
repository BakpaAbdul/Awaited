import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { getDisplayStatuses, LEVELS } from "../lib/constants";
import { inputStyle, THEME } from "../lib/theme";
import { ResultCard } from "../components/results";
import { EmptyFeedState, FilterSelect, TrustNotice } from "../components/siteChrome";

const RESULTS_PAGE_SIZE = 18;
const POPULAR_SCHOLARSHIP_LIMIT = 8;

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
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState("All");
  const [filterCountry, setFilterCountry] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showAllScholarships, setShowAllScholarships] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [newComments, setNewComments] = useState({});
  const [visibleCount, setVisibleCount] = useState(RESULTS_PAGE_SIZE);
  const deferredQuery = useDeferredValue(searchQuery);

  const countries = useMemo(
    () => [...new Set(visibleResults.map((result) => result.country))].sort(),
    [visibleResults],
  );

  const availableStatuses = useMemo(
    () => getDisplayStatuses(visibleResults.map((result) => result.status)),
    [visibleResults],
  );

  const rankedScholarships = useMemo(
    () =>
      Object.entries(
        visibleResults.reduce((accumulator, result) => {
          accumulator[result.scholarship] = (accumulator[result.scholarship] || 0) + 1;
          return accumulator;
        }, {}),
      )
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])),
    [visibleResults],
  );

  const filtered = useMemo(() => {
    return visibleResults
      .filter((result) => {
        const query = deferredQuery.toLowerCase();
        const searchableText = [
          result.scholarship,
          result.country,
          result.field,
          result.cycleYear,
          result.university,
          result.program,
          result.applicationRound,
          result.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchSearch = !query || searchableText.includes(query);
        const matchLevel = filterLevel === "All" || result.level === filterLevel;
        const matchCountry = filterCountry === "All" || result.country === filterCountry;
        const matchStatus = filterStatus === "All" || result.status === filterStatus;
        return matchSearch && matchLevel && matchCountry && matchStatus;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [visibleResults, deferredQuery, filterLevel, filterCountry, filterStatus]);

  useEffect(() => {
    setVisibleCount(RESULTS_PAGE_SIZE);
  }, [deferredQuery, filterLevel, filterCountry, filterStatus]);

  const visibleSlice = filtered.slice(0, visibleCount);
  const scholarshipShortcuts = showAllScholarships
    ? rankedScholarships
    : rankedScholarships.slice(0, POPULAR_SCHOLARSHIP_LIMIT);

  return (
    <>
      <TrustNotice onNavigate={onNavigate} />

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
        <FilterSelect
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          options={["All", ...availableStatuses]}
          label="Filter by status"
        />
      </div>

      {rankedScholarships.length > 0 ? (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Most active scholarships
            </div>
            {rankedScholarships.length > POPULAR_SCHOLARSHIP_LIMIT ? (
              <button
                type="button"
                onClick={() => setShowAllScholarships((current) => !current)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `1px solid ${THEME.panelBorder}`,
                  background: THEME.panelBackgroundStrong,
                  color: THEME.textPrimary,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {showAllScholarships ? "Show fewer" : `Show all ${rankedScholarships.length}`}
              </button>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {scholarshipShortcuts.map(([name, count]) => {
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
        </div>
      ) : null}

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
