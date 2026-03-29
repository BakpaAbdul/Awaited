import { useEffect, useMemo, useRef, useState } from "react";
import { buildExcerpt } from "../lib/content";
import { hasStoredHumanTrust } from "../lib/humanVerification";
import { loadTurnstileScript } from "../lib/turnstile";
import { turnstileSiteKey } from "../lib/supabaseClient";

const panelStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: "20px 22px",
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "#E2E8F0",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #6366F1, #818CF8)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

function TurnstileGate({ onVerify, resetKey }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!turnstileSiteKey || hasStoredHumanTrust() || !containerRef.current) {
      return undefined;
    }

    let isActive = true;

    loadTurnstileScript()
      .then((turnstile) => {
        if (!isActive || !containerRef.current) {
          return;
        }

        containerRef.current.innerHTML = "";
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: turnstileSiteKey,
          theme: "dark",
          callback: (token) => onVerify(token),
          "expired-callback": () => onVerify(""),
          "error-callback": () => onVerify(""),
        });
      })
      .catch(() => onVerify(""));

    return () => {
      isActive = false;
      if (widgetIdRef.current && typeof window !== "undefined" && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [onVerify, resetKey]);

  if (!turnstileSiteKey || hasStoredHumanTrust()) {
    return null;
  }

  return <div ref={containerRef} style={{ minHeight: 68 }} />;
}

function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 20 }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        {eyebrow && <div style={{ fontSize: 11, color: "#38BDF8", textTransform: "uppercase", letterSpacing: 1.1, fontWeight: 700, marginBottom: 8 }}>{eyebrow}</div>}
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: "#E2E8F0", margin: 0 }}>{title}</h2>
        {description && <p style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.7, marginTop: 8, marginBottom: 0 }}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function ReviewChip({ reviewState, moderationReason }) {
  if (!reviewState || reviewState === "approved") {
    return null;
  }

  const config = reviewState === "pending"
    ? { color: "#F59E0B", label: "Pending" }
    : { color: "#EF4444", label: "Rejected" };

  return (
    <span title={moderationReason || config.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 9px", borderRadius: 999, background: `${config.color}18`, color: config.color, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
      {config.label}
    </span>
  );
}

export function BlogIndex({ posts, onOpenPost }) {
  const publishedPosts = posts.filter((post) => post.published);

  return (
    <div>
      <SectionHeader
        eyebrow="Awaited Journal"
        title="Blog"
        description="Write long-form updates, launch notes, scholarship explainers, and trend reports for your community."
      />

      {publishedPosts.length === 0 ? (
        <div style={{ ...panelStyle, textAlign: "center", padding: 36 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>✍️</div>
          <div style={{ fontSize: 16, color: "#E2E8F0", fontWeight: 700, marginBottom: 8 }}>No blog posts yet</div>
          <div style={{ fontSize: 13, color: "#64748B" }}>Your first published post will appear here.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {publishedPosts.map((post) => (
            <button
              key={post.id}
              onClick={() => onOpenPost(post.slug)}
              style={{ ...panelStyle, textAlign: "left", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
                <h3 style={{ margin: 0, color: "#E2E8F0", fontSize: 20, fontWeight: 700 }}>{post.title}</h3>
                <span style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap" }}>{formatDate(post.createdAt)}</span>
              </div>
              <p style={{ margin: 0, color: "#94A3B8", fontSize: 14, lineHeight: 1.7 }}>{post.excerpt || buildExcerpt(post.content)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BlogPostView({ post, onBack }) {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#64748B", fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}>
        ← Back to blog
      </button>
      <article style={{ ...panelStyle, padding: "28px 30px" }}>
        <div style={{ fontSize: 12, color: "#38BDF8", textTransform: "uppercase", letterSpacing: 1.1, fontWeight: 700, marginBottom: 10 }}>
          Blog Post
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, lineHeight: 1.2, marginTop: 0, marginBottom: 10, color: "#E2E8F0" }}>{post.title}</h1>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22, fontSize: 12, color: "#64748B" }}>
          <span>{formatDate(post.createdAt)}</span>
          {post.authorEmail && <span>By {post.authorEmail}</span>}
          {!post.published && <span style={{ color: "#F59E0B" }}>Draft</span>}
        </div>
        <div style={{ color: "#CBD5E1", fontSize: 15, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{post.content}</div>
      </article>
    </div>
  );
}

export function ForumIndex({ threads, isAdmin, onOpenThread, onCreateThread }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const requiresCaptcha = turnstileSiteKey && !hasStoredHumanTrust();

  const visibleThreads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const source = isAdmin ? threads : threads.filter((thread) => thread.reviewState === "approved");

    return source.filter((thread) => {
      if (!query) {
        return true;
      }

      return thread.title.toLowerCase().includes(query) || thread.body.toLowerCase().includes(query);
    });
  }, [threads, searchQuery, isAdmin]);

  const handleCreate = async () => {
    const created = await onCreateThread(
      { title, body },
      { honeypot, captchaToken },
    );

    if (created) {
      setTitle("");
      setBody("");
      setHoneypot("");
      setCaptchaToken("");
      setCaptchaResetKey((value) => value + 1);
    }
  };

  return (
    <div>
      <SectionHeader
        eyebrow="Community Forum"
        title="Forum"
        description="Let applicants compare timelines, ask questions, and share scholarship-specific experiences outside the structured result feed."
      />

      <div style={{ ...panelStyle, marginBottom: 18 }}>
        <div style={{ fontSize: 16, color: "#E2E8F0", fontWeight: 700, marginBottom: 10 }}>Start a new discussion</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Thread title" style={inputStyle} />
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="What do you want to ask or discuss?" rows={5} style={{ ...inputStyle, resize: "vertical" }} />
          <input type="text" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }} aria-hidden="true" />
          {requiresCaptcha && <TurnstileGate resetKey={captchaResetKey} onVerify={setCaptchaToken} />}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "#64748B" }}>Forum posts are anonymous and can be queued for moderation if they look risky.</div>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || !body.trim() || (requiresCaptcha && !captchaToken)}
              style={{ ...primaryButtonStyle, opacity: !title.trim() || !body.trim() || (requiresCaptcha && !captchaToken) ? 0.6 : 1 }}
            >
              Create Thread
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search discussions..." style={inputStyle} />
      </div>

      {visibleThreads.length === 0 ? (
        <div style={{ ...panelStyle, textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>💬</div>
          <div style={{ fontSize: 16, color: "#E2E8F0", fontWeight: 700, marginBottom: 8 }}>No forum threads yet</div>
          <div style={{ fontSize: 13, color: "#64748B" }}>Start the first discussion and invite the community in.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visibleThreads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => onOpenThread(thread.slug)}
              style={{ ...panelStyle, textAlign: "left", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <h3 style={{ margin: 0, color: "#E2E8F0", fontSize: 18, fontWeight: 700 }}>{thread.title}</h3>
                    {thread.locked && <span style={{ fontSize: 10, color: "#F59E0B", fontWeight: 700 }}>LOCKED</span>}
                    {isAdmin && <ReviewChip reviewState={thread.reviewState} moderationReason={thread.moderationReason} />}
                  </div>
                  <p style={{ margin: 0, color: "#94A3B8", fontSize: 14, lineHeight: 1.7 }}>{buildExcerpt(thread.body, 220)}</p>
                </div>
                <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <div style={{ fontSize: 12, color: "#64748B" }}>{formatDate(thread.createdAt)}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{thread.replies.length} replies</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ForumThreadView({ thread, isAdmin, onBack, onReplySubmit }) {
  const [replyText, setReplyText] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const visibleReplies = isAdmin ? thread.replies : thread.replies.filter((reply) => reply.reviewState === "approved");
  const requiresCaptcha = turnstileSiteKey && !hasStoredHumanTrust();

  const handleReply = async () => {
    const created = await onReplySubmit(
      thread.id,
      replyText,
      { honeypot, captchaToken },
    );

    if (created) {
      setReplyText("");
      setHoneypot("");
      setCaptchaToken("");
      setCaptchaResetKey((value) => value + 1);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#64748B", fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}>
        ← Back to forum
      </button>

      <div style={{ ...panelStyle, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, lineHeight: 1.2, margin: 0, color: "#E2E8F0" }}>{thread.title}</h1>
              {thread.locked && <span style={{ fontSize: 10, color: "#F59E0B", fontWeight: 700 }}>LOCKED</span>}
              {isAdmin && <ReviewChip reviewState={thread.reviewState} moderationReason={thread.moderationReason} />}
            </div>
            <div style={{ fontSize: 12, color: "#64748B" }}>{formatDate(thread.createdAt)} · {visibleReplies.length} visible replies</div>
          </div>
        </div>
        <div style={{ color: "#CBD5E1", fontSize: 15, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{thread.body}</div>
      </div>

      <div style={{ ...panelStyle, marginBottom: 18 }}>
        <div style={{ fontSize: 16, color: "#E2E8F0", fontWeight: 700, marginBottom: 12 }}>Replies</div>
        {visibleReplies.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748B" }}>No replies yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleReplies.map((reply) => (
              <div key={reply.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ color: "#64748B", fontSize: 11 }}>Anonymous · {formatDate(reply.createdAt)}</span>
                  {isAdmin && <ReviewChip reviewState={reply.reviewState} moderationReason={reply.moderationReason} />}
                </div>
                <div style={{ color: "#CBD5E1", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{reply.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...panelStyle, opacity: thread.locked ? 0.7 : 1 }}>
        <div style={{ fontSize: 16, color: "#E2E8F0", fontWeight: 700, marginBottom: 12 }}>Reply to this thread</div>
        {thread.locked ? (
          <div style={{ fontSize: 13, color: "#FBBF24" }}>This thread is locked. New replies are disabled.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} rows={4} placeholder="Share your experience or answer the question..." style={{ ...inputStyle, resize: "vertical" }} />
            <input type="text" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }} aria-hidden="true" />
            {requiresCaptcha && <TurnstileGate resetKey={captchaResetKey} onVerify={setCaptchaToken} />}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || (requiresCaptcha && !captchaToken)}
                style={{ ...primaryButtonStyle, opacity: !replyText.trim() || (requiresCaptcha && !captchaToken) ? 0.6 : 1 }}
              >
                Post Reply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminBlogPanel({ posts, onSavePost, onDeletePost, onOpenPost }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    published: false,
  });

  const sortedPosts = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: "",
      excerpt: "",
      content: "",
      published: false,
    });
  };

  const handleSave = async () => {
    const saved = await onSavePost({
      id: editingId,
      ...form,
    });

    if (saved) {
      resetForm();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, color: "#E2E8F0", fontSize: 18, fontWeight: 700 }}>{editingId ? "Edit Blog Post" : "Write Blog Post"}</h3>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748B" }}>Write posts in plain text. Line breaks are preserved on the public site.</p>
          </div>
          {editingId && (
            <button onClick={resetForm} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#94A3B8", fontSize: 12, cursor: "pointer", padding: "8px 12px" }}>
              New Draft
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Post title" style={inputStyle} />
          <input value={form.excerpt} onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))} placeholder="Optional short excerpt" style={inputStyle} />
          <textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} rows={12} placeholder="Write your blog post..." style={{ ...inputStyle, resize: "vertical" }} />

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#CBD5E1" }}>
            <input type="checkbox" checked={form.published} onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))} />
            Publish immediately
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              Excerpt preview: {form.excerpt.trim() || buildExcerpt(form.content) || "No excerpt yet"}
            </div>
            <button
              onClick={handleSave}
              disabled={!form.title.trim() || !form.content.trim()}
              style={{ ...primaryButtonStyle, opacity: !form.title.trim() || !form.content.trim() ? 0.6 : 1 }}
            >
              {editingId ? "Update Post" : "Save Post"}
            </button>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <h3 style={{ marginTop: 0, marginBottom: 14, color: "#E2E8F0", fontSize: 18, fontWeight: 700 }}>Existing Posts</h3>
        {sortedPosts.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748B" }}>No blog posts yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sortedPosts.map((post) => (
              <div key={post.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0" }}>{post.title}</span>
                      <span style={{ fontSize: 10, color: post.published ? "#10B981" : "#F59E0B", fontWeight: 700 }}>
                        {post.published ? "PUBLISHED" : "DRAFT"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>{formatDate(post.createdAt)} · {post.slug}</div>
                    <div style={{ fontSize: 13, color: "#94A3B8" }}>{post.excerpt || buildExcerpt(post.content)}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button
                      onClick={() => {
                        setEditingId(post.id);
                        setForm({
                          title: post.title,
                          excerpt: post.excerpt || "",
                          content: post.content,
                          published: post.published,
                        });
                      }}
                      style={{ ...primaryButtonStyle, padding: "8px 12px", fontSize: 12 }}
                    >
                      Edit
                    </button>
                    <button onClick={() => onOpenPost(post.slug)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#94A3B8", fontSize: 12, cursor: "pointer", padding: "8px 12px" }}>
                      Preview
                    </button>
                    <button onClick={() => onDeletePost(post.id)} style={{ background: "none", border: "1px solid rgba(220,38,38,0.18)", borderRadius: 10, color: "#FCA5A5", fontSize: 12, cursor: "pointer", padding: "8px 12px" }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
