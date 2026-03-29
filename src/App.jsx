import { useEffect, useMemo, useState } from "react";
import { LEVELS, STATUSES, STATUS_CONFIG } from "./lib/constants";
import { appDataStore, DATA_BACKEND_MODE } from "./lib/appDataStore";
import {
  buildScholarshipSuggestions,
  DATABASE_SCHOLARSHIP_NAMES,
  findMatchingScholarshipName,
  getCanonicalScholarshipName,
  getScholarshipRecord,
  isDatabaseScholarship,
  sortScholarshipNames,
} from "./lib/scholarships";

// ─── Main App ────────────────────────────────────────────────────────────────
export default function AwaitedApp() {
  const [appData, setAppData] = useState(() => appDataStore.getInitialAppData());
  const [activeDataMode, setActiveDataMode] = useState(DATA_BACKEND_MODE);
  const [isHydrating, setIsHydrating] = useState(DATA_BACKEND_MODE === "supabase");
  const [syncError, setSyncError] = useState("");
  const [view, setView] = useState("feed");
  const [selectedScholarship, setSelectedScholarship] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterLevel, setFilterLevel] = useState("All");
  const [filterCountry, setFilterCountry] = useState("All");
  const [showSuccess, setShowSuccess] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [newComments, setNewComments] = useState({});

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [adminPwError, setAdminPwError] = useState(false);
  const [adminTab, setAdminTab] = useState("moderation");
  const [newVerified, setNewVerified] = useState("");

  const results = appData.results;
  const manualVerifiedList = appData.verifiedList;
  const customScholarships = appData.customScholarships || [];
  const verifiedList = useMemo(
    () => sortScholarshipNames([...DATABASE_SCHOLARSHIP_NAMES, ...manualVerifiedList]),
    [manualVerifiedList],
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateAppData() {
      try {
        const { appData: nextData, activeMode, syncError: nextSyncError } = await appDataStore.hydrateAppData();
        if (!cancelled) {
          setAppData(nextData);
          setActiveDataMode(activeMode);
          setSyncError(nextSyncError);
        }
      } catch (error) {
        if (!cancelled) {
          setSyncError(error instanceof Error ? error.message : "Failed to load data.");
        }
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    }

    hydrateAppData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (DATA_BACKEND_MODE !== "supabase") {
      return undefined;
    }

    return appDataStore.subscribeToAppData(
      (nextData) => {
        setAppData(nextData);
        setActiveDataMode("supabase");
        setSyncError("");
      },
      (error) => {
        setSyncError(error instanceof Error ? error.message : "Realtime sync failed.");
      },
    );
  }, []);

  const isVerifiedScholarship = (name) => isDatabaseScholarship(name) || Boolean(findMatchingScholarshipName(name, manualVerifiedList));

  const applyStoreMutation = async (operation, { onSuccess } = {}) => {
    try {
      const nextData = await operation();
      setAppData(nextData);
      setSyncError("");
      onSuccess?.(nextData);
      return nextData;
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Failed to save changes.");
      return null;
    }
  };

  const visibleResults = useMemo(() => results.filter(r => !r.hidden || isAdmin), [results, isAdmin]);

  const countries = useMemo(() => [...new Set(visibleResults.map(r => r.country))].sort(), [visibleResults]);
  const scholarships = useMemo(() => [...new Set(visibleResults.map(r => r.scholarship))].sort(), [visibleResults]);

  const filtered = useMemo(() => {
    return visibleResults.filter(r => {
      const matchSearch = !searchQuery || r.scholarship.toLowerCase().includes(searchQuery.toLowerCase()) || r.country.toLowerCase().includes(searchQuery.toLowerCase()) || r.field.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === "All" || r.status === filterStatus;
      const matchLevel = filterLevel === "All" || r.level === filterLevel;
      const matchCountry = filterCountry === "All" || r.country === filterCountry;
      return matchSearch && matchStatus && matchLevel && matchCountry;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [visibleResults, searchQuery, filterStatus, filterLevel, filterCountry]);

  const stats = useMemo(() => {
    const visible = results.filter(r => !r.hidden);
    const s = { total: visible.length };
    STATUSES.forEach(st => s[st] = visible.filter(r => r.status === st).length);
    return s;
  }, [results]);

  // Analytics
  const analytics = useMemo(() => {
    const visible = results.filter(r => !r.hidden);
    const hidden = results.filter(r => r.hidden);
    const byMonth = {};
    visible.forEach(r => { const m = r.date.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + 1; });
    const byScholarship = {};
    visible.forEach(r => { byScholarship[r.scholarship] = (byScholarship[r.scholarship] || 0) + 1; });
    const topScholarships = Object.entries(byScholarship).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const byCountry = {};
    visible.forEach(r => { byCountry[r.country] = (byCountry[r.country] || 0) + 1; });
    const topCountries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const byLevel = {};
    LEVELS.forEach(l => byLevel[l] = visible.filter(r => r.level === l).length);
    const byStatus = {};
    STATUSES.forEach(s => byStatus[s] = visible.filter(r => r.status === s).length);
    const totalComments = visible.reduce((sum, r) => sum + r.comments.length, 0);
    return { byMonth, topScholarships, topCountries, byLevel, byStatus, totalComments, hiddenCount: hidden.length, totalVisible: visible.length };
  }, [results]);

  const scholarshipData = useMemo(() => {
    if (!selectedScholarship) return null;
    const entries = visibleResults.filter(r => r.scholarship === selectedScholarship);
    const statusCounts = {};
    STATUSES.forEach(s => statusCounts[s] = entries.filter(r => r.status === s).length);
    return { entries, statusCounts, name: selectedScholarship, record: getScholarshipRecord(selectedScholarship) };
  }, [selectedScholarship, visibleResults]);

  const handleSubmit = async (entry) => {
    await applyStoreMutation(() => appDataStore.submitResult(entry), {
      onSuccess: () => {
        setView("feed");
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      },
    });
  };

  const handleAddComment = async (resultId, text) => {
    if (!text.trim()) return;
    await applyStoreMutation(() => appDataStore.addComment(resultId, text.trim()), {
      onSuccess: () => {
        setNewComments(prev => ({ ...prev, [resultId]: "" }));
      },
    });
  };

  const handleToggleHide = async (id, hidden) => {
    await applyStoreMutation(() => appDataStore.setResultHidden(id, hidden, adminSecret));
  };

  const handleDelete = async (id) => {
    await applyStoreMutation(() => appDataStore.deleteResult(id, adminSecret));
  };

  const handleDeleteComment = async (commentId) => {
    await applyStoreMutation(() => appDataStore.deleteComment(commentId, adminSecret));
  };

  const handleAdminLogin = async () => {
    try {
      const password = adminPw;
      const isValid = await appDataStore.verifyAdminPassword(password);

      if (isValid) {
        setIsAdmin(true);
        setAdminSecret(password);
        setAdminPwError(false);
        setAdminPw("");
        setSyncError("");
      } else {
        setAdminPwError(true);
      }
    } catch (error) {
      setAdminPwError(true);
      setSyncError(error instanceof Error ? error.message : "Admin login failed.");
    }
  };

  const addManualVerifiedScholarship = async (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const canonicalName = getCanonicalScholarshipName(trimmedName);
    const matchedName =
      findMatchingScholarshipName(canonicalName, [...manualVerifiedList, ...customScholarships]) ||
      findMatchingScholarshipName(trimmedName, [...manualVerifiedList, ...customScholarships]) ||
      canonicalName;

    if (!matchedName || isDatabaseScholarship(matchedName)) {
      setNewVerified("");
      return;
    }

    await applyStoreMutation(() => appDataStore.addVerifiedScholarship(matchedName, adminSecret), {
      onSuccess: () => {
        setNewVerified("");
      },
    });
  };

  const handleAddVerified = async () => {
    await addManualVerifiedScholarship(newVerified);
  };

  const handleRemoveVerified = async (name) => {
    await applyStoreMutation(() => appDataStore.removeVerifiedScholarship(name, adminSecret));
  };

  const openScholarship = (name) => { setSelectedScholarship(name); setView("scholarship"); };
  const goFeed = () => { setView("feed"); setSelectedScholarship(null); };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", minHeight: "100vh", background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)", color: "#E2E8F0" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />

      {showSuccess && (
        <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: "#059669", color: "white", padding: "12px 28px", borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: "0 8px 32px rgba(5,150,105,0.4)", animation: "slideDown 0.3s ease" }}>
          ✓ Result submitted anonymously
        </div>
      )}

      {/* Header */}
      <header style={{ padding: "20px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, cursor: "pointer" }} onClick={goFeed}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, background: "linear-gradient(135deg, #38BDF8, #818CF8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Awaited</span>
          <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase" }}>Beta</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <NavBtn active={view === "feed"} onClick={goFeed}>Browse</NavBtn>
          <NavBtn active={view === "submit"} onClick={() => setView("submit")} accent>+ Submit</NavBtn>
          {isAdmin ? (
            <>
              <NavBtn active={view === "admin"} onClick={() => setView("admin")} admin>⚙ Admin</NavBtn>
              <button onClick={() => { setIsAdmin(false); setAdminSecret(""); if (view === "admin") goFeed(); }} style={{ background: "none", border: "none", color: "#64748B", fontSize: 11, cursor: "pointer", padding: "4px 8px" }}>Logout</button>
            </>
          ) : (
            <button onClick={() => setView("login")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, color: "#475569", fontSize: 11, cursor: "pointer", padding: "6px 12px" }}>Admin</button>
          )}
        </div>
      </header>

      {isAdmin && view !== "admin" && (
        <div style={{ background: "rgba(99,102,241,0.1)", borderBottom: "1px solid rgba(99,102,241,0.2)", padding: "8px 28px", fontSize: 12, color: "#A5B4FC", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366F1" }} />
          Admin mode active — hidden items visible with reduced opacity. Manage content from the Admin panel.
        </div>
      )}

      {activeDataMode === "supabase" && (
        <div style={{ background: "rgba(5,150,105,0.08)", borderBottom: "1px solid rgba(5,150,105,0.18)", padding: "8px 28px", fontSize: 12, color: "#6EE7B7", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
          Shared backend active — submissions, moderation, and live updates sync across users through Supabase.
        </div>
      )}

      {activeDataMode === "browser-local" && DATA_BACKEND_MODE === "supabase" && (
        <div style={{ background: "rgba(217,119,6,0.08)", borderBottom: "1px solid rgba(217,119,6,0.16)", padding: "8px 28px", fontSize: 12, color: "#FBBF24", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" }} />
          Supabase is configured, but this session is currently using browser-local fallback because the backend could not be reached.
        </div>
      )}

      {activeDataMode === "browser-local" && DATA_BACKEND_MODE === "browser-local" && (
        <div style={{ background: "rgba(217,119,6,0.08)", borderBottom: "1px solid rgba(217,119,6,0.16)", padding: "8px 28px", fontSize: 12, color: "#FBBF24", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" }} />
          Browser-local fallback active — data survives refreshes on this device, but shared sync will only work after Supabase env vars are configured.
        </div>
      )}

      {isHydrating && (
        <div style={{ background: "rgba(56,189,248,0.08)", borderBottom: "1px solid rgba(56,189,248,0.16)", padding: "8px 28px", fontSize: 12, color: "#7DD3FC" }}>
          Loading shared scholarship data…
        </div>
      )}

      {syncError && (
        <div style={{ background: "rgba(220,38,38,0.08)", borderBottom: "1px solid rgba(220,38,38,0.16)", padding: "8px 28px", fontSize: 12, color: "#FCA5A5" }}>
          {syncError}
        </div>
      )}

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 64px" }}>

        {/* Login */}
        {view === "login" && (
          <div style={{ maxWidth: 380, margin: "60px auto" }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Admin Access</h2>
              <p style={{ color: "#64748B", fontSize: 13, marginBottom: 24 }}>Enter your admin password to continue</p>
              <input type="password" value={adminPw} onChange={e => { setAdminPw(e.target.value); setAdminPwError(false); }} onKeyDown={e => e.key === "Enter" && handleAdminLogin()} placeholder="Password" style={{ ...inputStyle, textAlign: "center", marginBottom: 12 }} />
              {adminPwError && <div style={{ color: "#DC2626", fontSize: 12, marginBottom: 12 }}>Incorrect password</div>}
              <button onClick={handleAdminLogin} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #6366F1, #818CF8)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Enter</button>
              <button onClick={goFeed} style={{ background: "none", border: "none", color: "#475569", fontSize: 12, cursor: "pointer", marginTop: 12 }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Admin Panel */}
        {view === "admin" && isAdmin && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <button onClick={goFeed} style={{ background: "none", border: "none", color: "#64748B", fontSize: 13, cursor: "pointer", padding: 0 }}>← Back</button>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, margin: 0 }}>Admin Panel</h2>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, border: "1px solid rgba(255,255,255,0.06)" }}>
              {[["moderation", "🛡 Moderation"], ["analytics", "📊 Analytics"], ["scholarships", "🎓 Scholarships"]].map(([key, label]) => (
                <button key={key} onClick={() => setAdminTab(key)} style={{
                  flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: adminTab === key ? "rgba(99,102,241,0.15)" : "transparent",
                  color: adminTab === key ? "#A5B4FC" : "#64748B",
                }}>{label}</button>
              ))}
            </div>

            {/* Moderation Tab */}
            {adminTab === "moderation" && (
              <div>
                <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>{results.filter(r => r.hidden).length} hidden · {results.length} total submissions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...results].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(r => (
                    <div key={r.id} style={{
                      background: r.hidden ? "rgba(220,38,38,0.05)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${r.hidden ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.06)"}`,
                      borderRadius: 12, padding: "14px 18px", opacity: r.hidden ? 0.6 : 1,
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, fontSize: 14, textDecoration: r.hidden ? "line-through" : "none" }}>{r.scholarship}</span>
                            <StatusBadge status={r.status} />
                            {r.hidden && <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Hidden</span>}
                            {!isVerifiedScholarship(r.scholarship) && <span style={{ fontSize: 10, color: "#D97706", fontWeight: 500 }}>⚠ Unverified name</span>}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748B" }}>{r.country} · {r.level} · {r.field} {r.nationality ? `· ${r.nationality}` : ""} · {r.date}</div>
                          {r.note && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 6, lineHeight: 1.5 }}>{r.note}</div>}
                          {r.comments.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              {r.comments.map((c) => (
                                <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#64748B", marginBottom: 4 }}>
                                  <span style={{ flex: 1 }}>💬 {c.text} <span style={{ color: "#475569" }}>({c.time})</span></span>
                                  <button onClick={() => handleDeleteComment(c.id)} style={{ background: "none", border: "none", color: "#DC2626", fontSize: 11, cursor: "pointer", padding: "2px 6px", flexShrink: 0, opacity: 0.6 }}
                                    onMouseOver={e => e.target.style.opacity = 1} onMouseOut={e => e.target.style.opacity = 0.6}>del</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                          <AdminBtn onClick={() => handleToggleHide(r.id, !r.hidden)} color={r.hidden ? "#059669" : "#D97706"}>{r.hidden ? "Unhide" : "Hide"}</AdminBtn>
                          <AdminBtn onClick={() => handleDelete(r.id)} color="#DC2626">Delete</AdminBtn>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {adminTab === "analytics" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  <AnalyticsCard label="Visible Results" value={analytics.totalVisible} color="#38BDF8" />
                  <AnalyticsCard label="Hidden / Spam" value={analytics.hiddenCount} color="#DC2626" />
                  <AnalyticsCard label="Total Comments" value={analytics.totalComments} color="#818CF8" />
                  <AnalyticsCard label="Catalog + Verified" value={verifiedList.length} color="#059669" />
                </div>

                <div style={panelStyle}>
                  <h3 style={panelTitle}>Status Distribution</h3>
                  <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 12, background: "rgba(255,255,255,0.05)" }}>
                    {STATUSES.map(s => analytics.byStatus[s] > 0 ? <div key={s} style={{ width: `${(analytics.byStatus[s] / analytics.totalVisible) * 100}%`, background: STATUS_CONFIG[s].color, transition: "width 0.3s" }} title={`${s}: ${analytics.byStatus[s]}`} /> : null)}
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    {STATUSES.map(s => (
                      <div key={s} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_CONFIG[s].color }} />
                        <span style={{ color: "#94A3B8" }}>{s}</span>
                        <span style={{ color: "#E2E8F0", fontWeight: 700 }}>{analytics.byStatus[s]}</span>
                        <span style={{ color: "#475569" }}>({analytics.totalVisible > 0 ? Math.round((analytics.byStatus[s] / analytics.totalVisible) * 100) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={panelStyle}>
                  <h3 style={panelTitle}>Top Scholarships by Reports</h3>
                  {analytics.topScholarships.map(([name, count]) => {
                    const maxCount = analytics.topScholarships[0]?.[1] || 1;
                    return (
                      <div key={name} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                          <span style={{ color: "#E2E8F0", fontWeight: 500 }}>{isVerifiedScholarship(name) ? "✓ " : "⚠ "}{name}</span>
                          <span style={{ color: "#64748B" }}>{count}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(count / maxCount) * 100}%`, background: "linear-gradient(90deg, #6366F1, #818CF8)", borderRadius: 3, transition: "width 0.3s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={panelStyle}>
                    <h3 style={panelTitle}>Top Countries</h3>
                    {analytics.topCountries.map(([name, count]) => (
                      <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ color: "#94A3B8" }}>{name}</span>
                        <span style={{ color: "#E2E8F0", fontWeight: 600 }}>{count}</span>
                      </div>
                    ))}
                  </div>
                  <div style={panelStyle}>
                    <h3 style={panelTitle}>By Study Level</h3>
                    {LEVELS.map(l => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ color: "#94A3B8" }}>{l}</span>
                        <span style={{ color: "#E2E8F0", fontWeight: 600 }}>{analytics.byLevel[l]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={panelStyle}>
                  <h3 style={panelTitle}>Submissions by Month</h3>
                  {Object.entries(analytics.byMonth).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => {
                    const maxCount = Math.max(...Object.values(analytics.byMonth));
                    return (
                      <div key={month} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <span style={{ width: 70, fontSize: 12, color: "#64748B", flexShrink: 0 }}>{month}</span>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(count / maxCount) * 100}%`, background: "linear-gradient(90deg, #38BDF8, #818CF8)", borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 600, width: 24, textAlign: "right" }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Verified Scholarships Tab */}
            {adminTab === "scholarships" && (
              <div>
                <div style={{ ...panelStyle, marginBottom: 16 }}>
                  <h3 style={panelTitle}>Scholarship Catalog</h3>
                  <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
                    Awaited now uses your imported scholarship database as the official catalog. Community-added names can still be submitted, and admins can manually verify them here.
                  </p>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <input type="text" value={newVerified} onChange={e => setNewVerified(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddVerified()} placeholder="Manually verify a community-added scholarship..." style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={handleAddVerified} disabled={!newVerified.trim()} style={{
                      padding: "10px 20px", borderRadius: 10, border: "none",
                      background: newVerified.trim() ? "linear-gradient(135deg, #6366F1, #818CF8)" : "rgba(255,255,255,0.05)",
                      color: newVerified.trim() ? "#fff" : "#475569", fontSize: 13, fontWeight: 600, cursor: newVerified.trim() ? "pointer" : "default",
                    }}>Add</button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: "#38BDF8" }}>{DATABASE_SCHOLARSHIP_NAMES.length} database scholarships</span>
                    <span style={{ fontSize: 12, color: "#A78BFA" }}>{manualVerifiedList.length} manual verified names</span>
                    <span style={{ fontSize: 12, color: "#F59E0B" }}>{customScholarships.length} community-added names</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {verifiedList.map(name => {
                      const count = results.filter(r => r.scholarship === name && !r.hidden).length;
                      const databaseBacked = isDatabaseScholarship(name);
                      return (
                        <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "#059669", fontSize: 12 }}>✓</span>
                            <span style={{ fontSize: 13, color: "#E2E8F0" }}>{name}</span>
                            <span style={{ fontSize: 10, color: databaseBacked ? "#38BDF8" : "#A78BFA", textTransform: "uppercase", letterSpacing: 0.8 }}>
                              {databaseBacked ? "Database" : "Manual"}
                            </span>
                            <span style={{ fontSize: 11, color: "#475569" }}>({count} reports)</span>
                          </div>
                          {!databaseBacked && (
                            <button onClick={() => handleRemoveVerified(name)} style={{ background: "none", border: "none", color: "#DC2626", fontSize: 11, cursor: "pointer", opacity: 0.5, padding: "4px 8px" }}
                              onMouseOver={e => e.target.style.opacity = 1} onMouseOut={e => e.target.style.opacity = 0.5}>Remove</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {customScholarships.length > 0 && (
                  <div style={{ ...panelStyle, marginBottom: 16 }}>
                    <h3 style={panelTitle}>Community-added Scholarships</h3>
                    <p style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
                      These names were submitted by users even though they are not in the imported database. They stay available in autocomplete and scholarship pages.
                    </p>
                    {customScholarships.map((name) => (
                      <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.1)", marginBottom: 6, gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <span style={{ color: "#F59E0B", fontSize: 11 }}>⊕</span>
                          <span style={{ fontSize: 13, color: "#E2E8F0" }}>{name}</span>
                          {isVerifiedScholarship(name) && <span style={{ fontSize: 10, color: "#A78BFA", textTransform: "uppercase", letterSpacing: 0.8 }}>Verified</span>}
                        </div>
                        {!isVerifiedScholarship(name) && (
                          <AdminBtn onClick={() => addManualVerifiedScholarship(name)} color="#059669" small>Verify Name</AdminBtn>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(() => {
                  const unverified = results.filter(r => !isVerifiedScholarship(r.scholarship) && !r.hidden);
                  if (unverified.length === 0) return null;
                  return (
                    <div style={panelStyle}>
                      <h3 style={panelTitle}>⚠ Submissions with Unverified Names ({unverified.length})</h3>
                      <p style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>Review and either add the name to the verified list or hide the submission.</p>
                      {unverified.map(r => (
                        <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "rgba(217,119,6,0.05)", border: "1px solid rgba(217,119,6,0.1)", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <span style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 500 }}>{r.scholarship}</span>
                            <span style={{ fontSize: 12, color: "#64748B", marginLeft: 8 }}>{r.country} · {r.level}</span>
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <AdminBtn onClick={() => addManualVerifiedScholarship(r.scholarship)} color="#059669" small>Verify Name</AdminBtn>
                            <AdminBtn onClick={() => handleToggleHide(r.id, true)} color="#D97706" small>Hide</AdminBtn>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Feed View */}
        {view === "feed" && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
              <StatChip label="Total Reports" value={stats.total} color="#94A3B8" />
              {STATUSES.map(s => (
                <StatChip key={s} label={s} value={stats[s]} color={STATUS_CONFIG[s].color} onClick={() => setFilterStatus(filterStatus === s ? "All" : s)} active={filterStatus === s} />
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              <input type="text" placeholder="Search scholarships, countries, fields..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: 1, minWidth: 220, padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#E2E8F0", fontSize: 14, outline: "none" }} />
              <FilterSelect value={filterLevel} onChange={e => setFilterLevel(e.target.value)} options={["All", ...LEVELS]} label="Level" />
              <FilterSelect value={filterCountry} onChange={e => setFilterCountry(e.target.value)} options={["All", ...countries]} label="Country" />
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {scholarships.map(s => {
                const count = visibleResults.filter(r => r.scholarship === s && !r.hidden).length;
                if (count === 0 && !isAdmin) return null;
                return (
                  <button key={s} onClick={() => openScholarship(s)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#94A3B8", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 4 }}
                    onMouseOver={e => { e.currentTarget.style.background = "rgba(129,140,248,0.15)"; e.currentTarget.style.color = "#A5B4FC"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#94A3B8"; }}>
                    {isVerifiedScholarship(s) && <span style={{ color: "#059669", fontSize: 10 }}>✓</span>}
                    {s} ({count})
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>∅</div>
                <div style={{ fontSize: 15 }}>No results match your filters</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map(r => (
                  <ResultCard key={r.id} result={r} expanded={expandedCard === r.id} onToggle={() => setExpandedCard(expandedCard === r.id ? null : r.id)} onScholarshipClick={openScholarship}
                    commentText={newComments[r.id] || ""} onCommentChange={(val) => setNewComments(prev => ({ ...prev, [r.id]: val }))} onCommentSubmit={(text) => handleAddComment(r.id, text)}
                    isAdmin={isAdmin} onToggleHide={() => handleToggleHide(r.id, !r.hidden)} onDelete={() => handleDelete(r.id)} verified={isVerifiedScholarship(r.scholarship)} />
                ))}
              </div>
            )}
            <div style={{ textAlign: "center", marginTop: 32, color: "#475569", fontSize: 13 }}>Showing {filtered.length} of {visibleResults.filter(r => !r.hidden).length} results</div>
          </>
        )}

        {view === "submit" && (
          <SubmitForm
            onSubmit={handleSubmit}
            onCancel={goFeed}
            verifiedScholarships={verifiedList}
            customScholarships={customScholarships}
          />
        )}

        {view === "scholarship" && scholarshipData && (
          <ScholarshipView data={scholarshipData} onBack={goFeed} expandedCard={expandedCard} setExpandedCard={setExpandedCard}
            newComments={newComments} setNewComments={setNewComments} onCommentSubmit={handleAddComment}
            isAdmin={isAdmin} onToggleHide={handleToggleHide} onDelete={handleDelete} verified={isVerifiedScholarship(scholarshipData.name)} />
        )}
      </main>

      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        input::placeholder, textarea::placeholder { color: #475569; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function NavBtn({ children, active, accent, admin, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
      border: accent || admin ? "none" : "1px solid rgba(255,255,255,0.1)",
      background: accent ? "linear-gradient(135deg, #6366F1, #818CF8)" : admin ? "rgba(99,102,241,0.15)" : active ? "rgba(255,255,255,0.08)" : "transparent",
      color: accent ? "#fff" : admin ? "#A5B4FC" : active ? "#E2E8F0" : "#94A3B8",
    }}>{children}</button>
  );
}

function StatChip({ label, value, color, onClick, active }) {
  return (
    <div onClick={onClick} style={{
      padding: "8px 16px", borderRadius: 10, cursor: onClick ? "pointer" : "default", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8,
      background: active ? `${color}22` : "rgba(255,255,255,0.03)", border: `1px solid ${active ? color + "44" : "rgba(255,255,255,0.06)"}`,
    }}>
      <span style={{ fontSize: 18, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function FilterSelect({ value, onChange, options, label }) {
  return (
    <select value={value} onChange={onChange} style={{
      padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.05)", color: value === "All" ? "#64748B" : "#E2E8F0", fontSize: 13, outline: "none", cursor: "pointer", minWidth: 100,
    }}>
      {options.map(o => <option key={o} value={o} style={{ background: "#1E293B" }}>{o === "All" ? `All ${label}s` : o}</option>)}
    </select>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: c.color, background: c.bg + "22", border: `1px solid ${c.color}33` }}>
      <span style={{ fontSize: 10 }}>{c.icon}</span> {status}
    </span>
  );
}

function AdminBtn({ children, onClick, color, small }) {
  return (
    <button onClick={onClick} style={{
      padding: small ? "4px 10px" : "5px 12px", borderRadius: 6, border: `1px solid ${color}44`,
      background: `${color}11`, color, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
    }}
      onMouseOver={e => e.target.style.background = `${color}22`}
      onMouseOut={e => e.target.style.background = `${color}11`}>
      {children}
    </button>
  );
}

function AnalyticsCard({ label, value, color }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748B" }}>{label}</div>
    </div>
  );
}

function ResultCard({ result: r, expanded, onToggle, onScholarshipClick, commentText, onCommentChange, onCommentSubmit, isAdmin, onToggleHide, onDelete, verified }) {
  return (
    <div style={{
      background: r.hidden ? "rgba(220,38,38,0.03)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${r.hidden ? "rgba(220,38,38,0.1)" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 14, overflow: "hidden", transition: "all 0.2s", opacity: r.hidden ? 0.5 : 1,
    }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 16, cursor: "pointer" }} onClick={onToggle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            {verified && <span style={{ color: "#059669", fontSize: 11 }} title="Verified scholarship">✓</span>}
            <span onClick={e => { e.stopPropagation(); onScholarshipClick(r.scholarship); }} style={{ fontSize: 15, fontWeight: 600, color: "#E2E8F0", cursor: "pointer", borderBottom: "1px dashed rgba(255,255,255,0.2)", textDecoration: r.hidden ? "line-through" : "none" }}
              onMouseOver={e => e.target.style.color = "#A5B4FC"} onMouseOut={e => e.target.style.color = "#E2E8F0"}>
              {r.scholarship}
            </span>
            <StatusBadge status={r.status} />
            {r.hidden && <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 600 }}>HIDDEN</span>}
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#64748B", flexWrap: "wrap" }}>
            <span>📍 {r.country}</span><span>🎓 {r.level}</span><span>📚 {r.field}</span>
            {r.nationality && <span>🌍 {r.nationality}</span>}
            {r.gpa && <span>📊 GPA: {r.gpa}</span>}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: "#475569" }}>{r.date}</div>
          {r.comments.length > 0 && <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>💬 {r.comments.length}</div>}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px" }}>
          {r.note && (
            <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6, marginBottom: 16, padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 10, borderLeft: `3px solid ${STATUS_CONFIG[r.status].color}44` }}>
              {r.note}
            </div>
          )}

          {isAdmin && (
            <div style={{ display: "flex", gap: 6, marginBottom: 14, padding: "8px 12px", background: "rgba(99,102,241,0.06)", borderRadius: 8, border: "1px solid rgba(99,102,241,0.1)" }}>
              <span style={{ fontSize: 11, color: "#A5B4FC", marginRight: "auto", display: "flex", alignItems: "center" }}>⚙ Admin</span>
              <AdminBtn onClick={onToggleHide} color={r.hidden ? "#059669" : "#D97706"}>{r.hidden ? "Unhide" : "Hide"}</AdminBtn>
              <AdminBtn onClick={onDelete} color="#DC2626">Delete</AdminBtn>
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Discussion ({r.comments.length})</div>
            {r.comments.map((c) => (
              <div key={c.id} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, marginBottom: 6, fontSize: 13, color: "#94A3B8" }}>
                <span style={{ color: "#64748B", fontSize: 11 }}>Anonymous · {c.time}</span>
                <div style={{ marginTop: 4 }}>{c.text}</div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input type="text" placeholder="Add a comment anonymously..." value={commentText}
                onChange={e => onCommentChange(e.target.value)} onKeyDown={e => e.key === "Enter" && onCommentSubmit(commentText)}
                style={{ flex: 1, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 13, outline: "none" }} />
              <button onClick={() => onCommentSubmit(commentText)} style={{
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: commentText?.trim() ? "linear-gradient(135deg, #6366F1, #818CF8)" : "rgba(255,255,255,0.05)",
                color: commentText?.trim() ? "#fff" : "#475569", fontSize: 12, fontWeight: 600, cursor: commentText?.trim() ? "pointer" : "default",
              }}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmitForm({ onSubmit, onCancel, verifiedScholarships, customScholarships }) {
  const [form, setForm] = useState({
    scholarship: "", country: "", level: "Masters", field: "", status: "Applied",
    date: new Date().toISOString().split("T")[0], nationality: "", gpa: "", note: "",
  });
  const [suggestions, setSuggestions] = useState([]);
  const trimmedScholarship = form.scholarship.trim();
  const exactKnownMatch = findMatchingScholarshipName(trimmedScholarship, [...verifiedScholarships, ...customScholarships]);
  const exactDatabaseMatch = isDatabaseScholarship(trimmedScholarship);

  const set = (key) => (e) => {
    const val = e.target.value;
    setForm(prev => ({ ...prev, [key]: val }));
    if (key === "scholarship" && val.length > 0) {
      setSuggestions(buildScholarshipSuggestions(val, { verifiedScholarships, customScholarships }));
    } else if (key === "scholarship") { setSuggestions([]); }
  };

  const valid = form.scholarship.trim() && form.country.trim() && form.field.trim();

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <button onClick={onCancel} style={{ background: "none", border: "none", color: "#64748B", fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}>← Back to results</button>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 32 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#E2E8F0" }}>Submit Your Result</h2>
        <p style={{ color: "#64748B", fontSize: 13, marginBottom: 28 }}>100% anonymous. We use your imported scholarship database for suggestions, but users can still submit scholarships outside that list.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <FormField label="Scholarship Name *">
            <div style={{ position: "relative" }}>
              <input value={form.scholarship} onChange={set("scholarship")} placeholder="e.g. Chevening, Fulbright, DAAD..." style={inputStyle} />
              {suggestions.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, marginTop: 4, overflow: "hidden" }}>
                  {suggestions.map(s => (
                    <div key={`${s.source}-${s.name}`} onClick={() => { setForm(prev => ({ ...prev, scholarship: s.name })); setSuggestions([]); }}
                      style={{ padding: "8px 14px", fontSize: 13, color: "#E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
                      onMouseOver={e => e.currentTarget.style.background = "rgba(99,102,241,0.15)"}
                      onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span style={{ color: s.source === "database" || s.source === "verified" ? "#059669" : "#F59E0B", fontSize: 11 }}>
                          {s.source === "community" ? "⊕" : "✓"}
                        </span>
                        <span>{s.name}</span>
                      </span>
                      <span style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.8, flexShrink: 0 }}>
                        {s.source === "database" ? "DB" : s.source === "verified" ? "Verified" : "Community"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {trimmedScholarship && exactDatabaseMatch && (
              <div style={{ fontSize: 11, color: "#059669", marginTop: 4 }}>✓ Matched to the imported scholarship database</div>
            )}
            {trimmedScholarship && !exactDatabaseMatch && exactKnownMatch && (
              <div style={{ fontSize: 11, color: "#A78BFA", marginTop: 4 }}>✓ Known community/manual scholarship name</div>
            )}
            {trimmedScholarship && !exactKnownMatch && suggestions.length === 0 && (
              <div style={{ fontSize: 11, color: "#D97706", marginTop: 4 }}>⚠ Not in the imported database yet. Users can still submit it and it will be added as a community scholarship.</div>
            )}
          </FormField>

          <div style={{ display: "flex", gap: 12 }}>
            <FormField label="Country *" style={{ flex: 1 }}>
              <input value={form.country} onChange={set("country")} placeholder="e.g. United Kingdom" style={inputStyle} />
            </FormField>
            <FormField label="Study Level *" style={{ flex: 1 }}>
              <select value={form.level} onChange={set("level")} style={inputStyle}>
                {LEVELS.map(l => <option key={l} value={l} style={{ background: "#1E293B" }}>{l}</option>)}
              </select>
            </FormField>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <FormField label="Field of Study *" style={{ flex: 1 }}>
              <input value={form.field} onChange={set("field")} placeholder="e.g. Economics, Engineering..." style={inputStyle} />
            </FormField>
            <FormField label="Status *" style={{ flex: 1 }}>
              <select value={form.status} onChange={set("status")} style={inputStyle}>
                {STATUSES.map(s => <option key={s} value={s} style={{ background: "#1E293B" }}>{s}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="Date Notified">
            <input type="date" value={form.date} onChange={set("date")} style={inputStyle} />
          </FormField>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, marginTop: 4 }}>
            <p style={{ color: "#475569", fontSize: 12, marginBottom: 12 }}>Optional — share only what you want</p>
            <div style={{ display: "flex", gap: 12 }}>
              <FormField label="Nationality" style={{ flex: 1 }}>
                <input value={form.nationality} onChange={set("nationality")} placeholder="Optional" style={inputStyle} />
              </FormField>
              <FormField label="GPA" style={{ flex: 1 }}>
                <input value={form.gpa} onChange={set("gpa")} placeholder="Optional" style={inputStyle} />
              </FormField>
            </div>
          </div>

          <FormField label="Notes / Tips">
            <textarea value={form.note} onChange={set("note")} placeholder="Share your experience, timeline, tips for others..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </FormField>

          <button onClick={() => valid && onSubmit(form)} disabled={!valid} style={{
            padding: "14px 0", borderRadius: 12, border: "none", width: "100%",
            background: valid ? "linear-gradient(135deg, #6366F1, #818CF8)" : "rgba(255,255,255,0.05)",
            color: valid ? "#fff" : "#475569", fontSize: 15, fontWeight: 700, cursor: valid ? "pointer" : "default", marginTop: 8, transition: "all 0.2s",
          }}>Submit Anonymously</button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children, style }) {
  return (
    <div style={style}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
  color: "#E2E8F0", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

const panelStyle = {
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px",
};

const panelTitle = { fontSize: 14, fontWeight: 700, color: "#E2E8F0", marginBottom: 14, marginTop: 0 };

function ScholarshipView({ data, onBack, expandedCard, setExpandedCard, newComments, setNewComments, onCommentSubmit, isAdmin, onToggleHide, onDelete, verified }) {
  const { entries, statusCounts, name, record } = data;
  const total = entries.length;

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#64748B", fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}>← Back to all results</button>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          {verified && <span style={{ color: "#059669", fontSize: 14 }} title="Verified scholarship">✓</span>}
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: "#E2E8F0", margin: 0 }}>{name}</h2>
        </div>
        <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 16, background: "rgba(255,255,255,0.05)" }}>
          {STATUSES.map(s => statusCounts[s] > 0 ? <div key={s} style={{ width: `${(statusCounts[s] / total) * 100}%`, background: STATUS_CONFIG[s].color, transition: "width 0.3s" }} /> : null)}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {STATUSES.map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_CONFIG[s].color }} />
              <span style={{ color: "#94A3B8" }}>{s}:</span>
              <span style={{ color: "#E2E8F0", fontWeight: 600 }}>{statusCounts[s]}</span>
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 13, color: "#64748B" }}>{total} reports</div>
        </div>
      </div>
      {record && (
        <div style={{ ...panelStyle, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
            <MetadataItem label="Country" value={record.country} />
            <MetadataItem label="Funder" value={record.funder} />
            <MetadataItem label="Funding Type" value={record.type} />
            <MetadataItem label="Typical Deadline" value={record.typical_deadline} />
            <MetadataItem label="Results Timeline" value={record.results_timeline} />
            <MetadataItem label="Levels" value={record.levels?.join(", ")} />
          </div>
          {record.description && <p style={{ color: "#94A3B8", fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>{record.description}</p>}
          {record.eligibility_notes && <p style={{ color: "#64748B", fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>{record.eligibility_notes}</p>}
          {record.website && (
            <a href={record.website} target="_blank" rel="noreferrer" style={{ color: "#38BDF8", fontSize: 13, textDecoration: "none" }}>
              Visit official scholarship website →
            </a>
          )}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).map(r => (
          <ResultCard key={r.id} result={r} expanded={expandedCard === r.id} onToggle={() => setExpandedCard(expandedCard === r.id ? null : r.id)} onScholarshipClick={() => {}}
            commentText={newComments[r.id] || ""} onCommentChange={(val) => setNewComments(prev => ({ ...prev, [r.id]: val }))} onCommentSubmit={(text) => onCommentSubmit(r.id, text)}
            isAdmin={isAdmin} onToggleHide={() => onToggleHide(r.id, !r.hidden)} onDelete={() => onDelete(r.id)} verified={verified} />
        ))}
      </div>
    </div>
  );
}

function MetadataItem({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#E2E8F0", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}
