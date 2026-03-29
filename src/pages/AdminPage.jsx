import { useMemo, useState } from "react";
import { AdminBlogPanel } from "../components/communitySections";
import { AdminBtn, AnalyticsCard, ModerationChip, ModerationResultRow } from "../components/results";
import { panelStyle, panelTitle, inputStyle, THEME } from "../lib/theme";
import { DATABASE_SCHOLARSHIP_NAMES, isDatabaseScholarship } from "../lib/scholarships";

export default function AdminPage({
  adminUser,
  results,
  forumThreads,
  blogPosts,
  manualVerifiedList,
  customScholarships,
  verifiedList,
  approvedVisibleResults,
  isVerifiedScholarship,
  onBack,
  onApproveResult,
  onRejectResult,
  onToggleHideResult,
  onDeleteResult,
  onSetCommentReviewState,
  onDeleteComment,
  onSetForumThreadReviewState,
  onDeleteForumThread,
  onSetForumReplyReviewState,
  onDeleteForumReply,
  onAddVerifiedScholarship,
  onRemoveVerifiedScholarship,
  onSaveBlogPost,
  onDeleteBlogPost,
  onOpenPost,
}) {
  const [adminTab, setAdminTab] = useState("moderation");
  const [newVerified, setNewVerified] = useState("");

  const pendingResults = useMemo(
    () => results.filter((result) => result.reviewState === "pending"),
    [results],
  );

  const pendingComments = useMemo(() => {
    return results
      .flatMap((result) =>
        result.comments.map((comment) => ({
          ...comment,
          scholarship: result.scholarship,
          resultId: result.id,
        })),
      )
      .filter((comment) => comment.reviewState === "pending");
  }, [results]);

  const pendingForumThreads = useMemo(
    () => forumThreads.filter((thread) => thread.reviewState === "pending"),
    [forumThreads],
  );

  const pendingForumReplies = useMemo(() => {
    return forumThreads
      .flatMap((thread) =>
        thread.replies.map((reply) => ({
          ...reply,
          threadId: thread.id,
          threadTitle: thread.title,
        })),
      )
      .filter((reply) => reply.reviewState === "pending");
  }, [forumThreads]);

  const analytics = useMemo(() => {
    const byScholarship = {};
    const byStatus = {};
    const byCountry = {};

    approvedVisibleResults.forEach((result) => {
      byScholarship[result.scholarship] = (byScholarship[result.scholarship] || 0) + 1;
      byStatus[result.status] = (byStatus[result.status] || 0) + 1;
      byCountry[result.country] = (byCountry[result.country] || 0) + 1;
    });

    return {
      byStatus,
      topScholarships: Object.entries(byScholarship)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
      topCountries: Object.entries(byCountry)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6),
      hiddenCount: results.filter((result) => result.hidden).length,
      pendingCount: results.filter((result) => result.reviewState === "pending").length,
      totalComments: approvedVisibleResults.reduce(
        (sum, result) => sum + result.comments.filter((comment) => comment.reviewState === "approved").length,
        0,
      ),
      totalVisible: approvedVisibleResults.length,
    };
  }, [approvedVisibleResults, results]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: THEME.textMuted, fontSize: 13, cursor: "pointer", padding: 0 }}
        >
          ← Back
        </button>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 24,
            fontWeight: 700,
            margin: 0,
            color: THEME.textPrimary,
          }}
        >
          Admin Panel
        </h2>
        <div style={{ fontSize: 12, color: THEME.textMuted, marginLeft: "auto" }}>Signed in as {adminUser?.email}</div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 24,
          background: THEME.panelBackgroundSubtle,
          borderRadius: 12,
          padding: 4,
          border: `1px solid ${THEME.panelBorder}`,
          flexWrap: "wrap",
        }}
      >
        {[
          ["moderation", "🛡 Moderation"],
          ["analytics", "📊 Analytics"],
          ["scholarships", "🎓 Scholarships"],
          ["blog", "📝 Blog"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setAdminTab(key)}
            style={{
              flex: "1 1 180px",
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: adminTab === key ? THEME.accentSurface : "transparent",
              color: adminTab === key ? THEME.accentText : THEME.textMuted,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {adminTab === "moderation" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <AnalyticsCard label="Pending Results" value={pendingResults.length} color="#F59E0B" />
            <AnalyticsCard label="Pending Comments" value={pendingComments.length} color="#F59E0B" />
            <AnalyticsCard label="Pending Threads" value={pendingForumThreads.length} color="#F59E0B" />
            <AnalyticsCard label="Pending Replies" value={pendingForumReplies.length} color="#F59E0B" />
            <AnalyticsCard
              label="Rejected Results"
              value={results.filter((result) => result.reviewState === "rejected").length}
              color="#EF4444"
            />
            <AnalyticsCard
              label="Hidden Results"
              value={results.filter((result) => result.hidden).length}
              color="#DC2626"
            />
          </div>

          {pendingResults.length > 0 ? (
            <div style={panelStyle}>
              <h3 style={panelTitle}>Queue: Pending Results</h3>
              <p style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 12 }}>
                New reports can be auto-queued when they use an unknown scholarship name, trip throttles, or look suspicious.
              </p>
              {pendingResults.map((result) => (
                <ModerationResultRow
                  key={`pending-result-${result.id}`}
                  result={result}
                  verified={isVerifiedScholarship(result.scholarship)}
                  onApprove={() => onApproveResult(result.id)}
                  onReject={() => onRejectResult(result.id)}
                  onDelete={() => onDeleteResult(result.id)}
                  onVerifyName={() => onAddVerifiedScholarship(result.scholarship)}
                />
              ))}
            </div>
          ) : null}

          {pendingComments.length > 0 ? (
            <div style={panelStyle}>
              <h3 style={panelTitle}>Queue: Pending Comments</h3>
              {pendingComments.map((comment) => (
                <div
                  key={`pending-comment-${comment.id}`}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(245,158,11,0.05)",
                    border: "1px solid rgba(245,158,11,0.12)",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: THEME.textPrimary, marginBottom: 4 }}>
                        {comment.scholarship}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 6 }}>
                        Commented on {comment.time}
                      </div>
                      <div style={{ fontSize: 13, color: THEME.textSecondary, marginBottom: 6 }}>{comment.text}</div>
                      {comment.moderationReason ? (
                        <ModerationChip reviewState="pending" reason={comment.moderationReason} />
                      ) : null}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <AdminBtn onClick={() => onSetCommentReviewState(comment.id, "approved")} color="#059669">
                        Approve
                      </AdminBtn>
                      <AdminBtn
                        onClick={() => onSetCommentReviewState(comment.id, "rejected", "Rejected during moderation")}
                        color="#D97706"
                      >
                        Reject
                      </AdminBtn>
                      <AdminBtn onClick={() => onDeleteComment(comment.id)} color="#DC2626">
                        Delete
                      </AdminBtn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {pendingForumThreads.length > 0 ? (
            <div style={panelStyle}>
              <h3 style={panelTitle}>Queue: Pending Forum Threads</h3>
              {pendingForumThreads.map((thread) => (
                <div
                  key={`pending-thread-${thread.id}`}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(245,158,11,0.05)",
                    border: "1px solid rgba(245,158,11,0.12)",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: THEME.textPrimary, marginBottom: 4 }}>
                        {thread.title}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 6 }}>
                        {new Date(thread.createdAt).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 13, color: THEME.textSecondary, marginBottom: 6, whiteSpace: "pre-wrap" }}>
                        {thread.body}
                      </div>
                      {thread.moderationReason ? (
                        <ModerationChip reviewState="pending" reason={thread.moderationReason} />
                      ) : null}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <AdminBtn onClick={() => onSetForumThreadReviewState(thread.id, "approved")} color="#059669">
                        Approve
                      </AdminBtn>
                      <AdminBtn
                        onClick={() => onSetForumThreadReviewState(thread.id, "rejected", "Rejected during moderation")}
                        color="#D97706"
                      >
                        Reject
                      </AdminBtn>
                      <AdminBtn onClick={() => onDeleteForumThread(thread.id)} color="#DC2626">
                        Delete
                      </AdminBtn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {pendingForumReplies.length > 0 ? (
            <div style={panelStyle}>
              <h3 style={panelTitle}>Queue: Pending Forum Replies</h3>
              {pendingForumReplies.map((reply) => (
                <div
                  key={`pending-forum-reply-${reply.id}`}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(245,158,11,0.05)",
                    border: "1px solid rgba(245,158,11,0.12)",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: THEME.textPrimary, marginBottom: 4 }}>
                        {reply.threadTitle}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 6 }}>
                        {new Date(reply.createdAt).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 13, color: THEME.textSecondary, marginBottom: 6, whiteSpace: "pre-wrap" }}>
                        {reply.body}
                      </div>
                      {reply.moderationReason ? (
                        <ModerationChip reviewState="pending" reason={reply.moderationReason} />
                      ) : null}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <AdminBtn onClick={() => onSetForumReplyReviewState(reply.id, "approved")} color="#059669">
                        Approve
                      </AdminBtn>
                      <AdminBtn
                        onClick={() => onSetForumReplyReviewState(reply.id, "rejected", "Rejected during moderation")}
                        color="#D97706"
                      >
                        Reject
                      </AdminBtn>
                      <AdminBtn onClick={() => onDeleteForumReply(reply.id)} color="#DC2626">
                        Delete
                      </AdminBtn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div style={panelStyle}>
            <h3 style={panelTitle}>All Submitted Results</h3>
            <div style={{ fontSize: 13, color: THEME.textMuted, marginBottom: 16 }}>
              {results.length} total results across approved, pending, rejected, and hidden states
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...results]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((result) => (
                  <ModerationResultRow
                    key={`all-result-${result.id}`}
                    result={result}
                    verified={isVerifiedScholarship(result.scholarship)}
                    onApprove={() => onApproveResult(result.id)}
                    onReject={() => onRejectResult(result.id)}
                    onToggleHide={() => onToggleHideResult(result.id, !result.hidden)}
                    onDelete={() => onDeleteResult(result.id)}
                    onVerifyName={() => onAddVerifiedScholarship(result.scholarship)}
                  />
                ))}
            </div>
          </div>
        </div>
      ) : null}

      {adminTab === "analytics" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <AnalyticsCard label="Visible Results" value={analytics.totalVisible} color="#38BDF8" />
            <AnalyticsCard label="Pending Queue" value={analytics.pendingCount} color="#F59E0B" />
            <AnalyticsCard label="Hidden / Spam" value={analytics.hiddenCount} color="#DC2626" />
            <AnalyticsCard label="Total Comments" value={analytics.totalComments} color="#818CF8" />
          </div>

          <div style={panelStyle}>
            <h3 style={panelTitle}>Top Scholarships by Reports</h3>
            {analytics.topScholarships.map(([name, count]) => {
              const maxCount = analytics.topScholarships[0]?.[1] || 1;
              return (
                <div key={name} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: THEME.textPrimary, fontWeight: 500 }}>{name}</span>
                    <span style={{ color: THEME.textMuted }}>{count}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: THEME.panelBackgroundMuted, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(count / maxCount) * 100}%`,
                        background: "linear-gradient(90deg, #6366F1, #818CF8)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={panelStyle}>
            <h3 style={panelTitle}>Top Countries by Reports</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {analytics.topCountries.map(([country, count]) => (
                <div key={country} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                  <span style={{ color: THEME.textPrimary }}>{country}</span>
                  <span style={{ color: THEME.textMuted }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {adminTab === "scholarships" ? (
        <div>
          <div style={{ ...panelStyle, marginBottom: 16 }}>
            <h3 style={panelTitle}>Scholarship Catalog</h3>
            <p style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 16 }}>
              Database-backed scholarships are seeded into the backend and stay canonical. Community-added names remain
              possible, but they can now be verified manually or left queued in moderation.
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                value={newVerified}
                onChange={(event) => setNewVerified(event.target.value)}
                onKeyDown={async (event) => {
                  if (event.key === "Enter") {
                    await onAddVerifiedScholarship(newVerified);
                    setNewVerified("");
                  }
                }}
                placeholder="Manually verify a community-added scholarship..."
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={async () => {
                  await onAddVerifiedScholarship(newVerified);
                  setNewVerified("");
                }}
                disabled={!newVerified.trim()}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: newVerified.trim()
                    ? "linear-gradient(135deg, #6366F1, #818CF8)"
                    : THEME.panelBackgroundMuted,
                  color: newVerified.trim() ? "#fff" : THEME.textSoft,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: newVerified.trim() ? "pointer" : "default",
                }}
              >
                Add
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: "#38BDF8" }}>{DATABASE_SCHOLARSHIP_NAMES.length} database scholarships</span>
              <span style={{ fontSize: 12, color: "#A78BFA" }}>{manualVerifiedList.length} manual verified names</span>
              <span style={{ fontSize: 12, color: "#D97706" }}>{customScholarships.length} community-added names</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {verifiedList.map((name) => {
                const count = approvedVisibleResults.filter((result) => result.scholarship === name).length;
                const databaseBacked = isDatabaseScholarship(name);
                return (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 14px",
                      borderRadius: 8,
                      background: THEME.panelBackgroundStrong,
                      border: `1px solid ${THEME.panelBorderSoft}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#059669", fontSize: 12 }}>✓</span>
                      <span style={{ fontSize: 13, color: THEME.textPrimary }}>{name}</span>
                      <span
                        style={{
                          fontSize: 10,
                          color: databaseBacked ? "#38BDF8" : "#A78BFA",
                          textTransform: "uppercase",
                          letterSpacing: 0.8,
                        }}
                      >
                        {databaseBacked ? "Database" : "Manual"}
                      </span>
                      <span style={{ fontSize: 11, color: THEME.textSoft }}>({count} reports)</span>
                    </div>
                    {!databaseBacked ? (
                      <button
                        onClick={() => onRemoveVerifiedScholarship(name)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#DC2626",
                          fontSize: 11,
                          cursor: "pointer",
                          opacity: 0.6,
                          padding: "4px 8px",
                        }}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {adminTab === "blog" ? (
        <AdminBlogPanel posts={blogPosts} onSavePost={onSaveBlogPost} onDeletePost={onDeleteBlogPost} onOpenPost={onOpenPost} />
      ) : null}
    </div>
  );
}
