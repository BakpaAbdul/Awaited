import { THEME, panelStyle, primaryButtonStyle, inputStyle } from "../lib/theme";

export function FlashBanner({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 999,
        background: "#059669",
        color: "white",
        padding: "12px 28px",
        borderRadius: 12,
        fontWeight: 600,
        fontSize: 14,
        boxShadow: "0 8px 32px rgba(5,150,105,0.4)",
        animation: "slideDown 0.3s ease",
      }}
    >
      {message}
    </div>
  );
}

export function NavBtn({ children, active, accent, admin, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        border: active ? "1px solid rgba(129,140,248,0.3)" : `1px solid ${THEME.panelBorder}`,
        background: active
          ? accent
            ? "linear-gradient(135deg, #6366F1, #818CF8)"
            : admin
              ? THEME.accentSurface
              : THEME.panelBackgroundStrong
          : accent
            ? "linear-gradient(135deg, #6366F1, #818CF8)"
            : THEME.panelBackgroundStrong,
        color: accent || active ? "#fff" : THEME.textSecondary,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: accent || active ? "0 10px 22px rgba(79,70,229,0.16)" : "none",
      }}
    >
      {children}
    </button>
  );
}

export function StatChip({ label, value, color, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 12,
        border: active ? `1px solid ${color}` : `1px solid ${THEME.panelBorder}`,
        background: active ? `${color}18` : THEME.panelBackgroundStrong,
        color: THEME.textPrimary,
        cursor: onClick ? "pointer" : "default",
        boxShadow: THEME.panelShadow,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: 12, color: THEME.textSecondary }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{value}</span>
    </button>
  );
}

export function TrustNotice({ onNavigate, compact = false }) {
  return (
    <div
      style={{
        ...panelStyle,
        marginBottom: compact ? 20 : 24,
        padding: compact ? "16px 18px" : "18px 20px",
        background: "rgba(56,189,248,0.1)",
        border: "1px solid rgba(56,189,248,0.14)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 240 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#0369a1",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            Trust Notice
          </div>
          <div style={{ fontSize: compact ? 14 : 15, fontWeight: 700, color: THEME.textPrimary, marginBottom: 6 }}>
            Awaited shows user-submitted scholarship signals, not official scholarship decisions.
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: THEME.textSecondary }}>
            Treat every report as community intelligence. Verify final decisions through the official scholarship portal,
            email, or provider website, and never post personal identifiers.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <FooterLink onClick={() => onNavigate("privacy")}>Privacy</FooterLink>
          <FooterLink onClick={() => onNavigate("community")}>Rules</FooterLink>
          <FooterLink onClick={() => onNavigate("disclaimer")}>Disclaimer</FooterLink>
        </div>
      </div>
    </div>
  );
}

export function EmptyFeedState({ onSubmit }) {
  return (
    <div style={{ ...panelStyle, textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>⌛</div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: THEME.textPrimary, marginBottom: 8, marginTop: 0 }}>
        No public scholarship reports yet
      </h3>
      <p
        style={{
          color: THEME.textSecondary,
          fontSize: 14,
          lineHeight: 1.6,
          maxWidth: 560,
          margin: "0 auto 18px",
        }}
      >
        Awaited is now running with a clean live dataset. The next public report will come from a real community
        submission, not seeded beta content.
      </p>
      <button onClick={onSubmit} style={{ ...primaryButtonStyle, width: "auto", padding: "12px 22px" }}>
        Submit the first report
      </button>
    </div>
  );
}

export function FilterSelect({ value, onChange, options, label }) {
  return (
    <select value={value} onChange={onChange} aria-label={label} style={{ ...inputStyle, width: "auto", minWidth: 140 }}>
      {options.map((option) => (
        <option
          key={option}
          value={option}
          style={{ background: THEME.panelBackgroundStrong, color: THEME.textPrimary }}
        >
          {option}
        </option>
      ))}
    </select>
  );
}

export function FooterLink({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: THEME.panelBackgroundStrong,
        border: `1px solid ${THEME.panelBorder}`,
        borderRadius: 999,
        padding: "7px 12px",
        color: THEME.textSecondary,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function SiteFooter({ onNavigate }) {
  return (
    <footer style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px 28px" }}>
      <div
        style={{
          borderTop: `1px solid ${THEME.panelBorderSoft}`,
          paddingTop: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 12, color: THEME.textMuted }}>
          Awaited is a community reporting platform. Scholarship outcomes here are user-submitted and not official
          decisions.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <FooterLink onClick={() => onNavigate("privacy")}>Privacy Policy</FooterLink>
          <FooterLink onClick={() => onNavigate("community")}>Community Rules</FooterLink>
          <FooterLink onClick={() => onNavigate("disclaimer")}>Disclaimer</FooterLink>
        </div>
      </div>
    </footer>
  );
}

export function LoginPanel({
  adminEmail,
  adminPw,
  adminAuthError,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onCancel,
}) {
  return (
    <div style={{ maxWidth: 420, margin: "60px auto" }}>
      <div style={{ ...panelStyle, borderRadius: 16, padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 6,
            color: THEME.textPrimary,
          }}
        >
          Admin Sign In
        </h2>
        <p style={{ color: THEME.textMuted, fontSize: 13, marginBottom: 24 }}>
          Use the Awaited admin account. Production now requires a real Supabase user session, not a shared browser
          password.
        </p>
        <input
          type="email"
          value={adminEmail}
          onChange={onEmailChange}
          placeholder="Admin email"
          aria-label="Admin email"
          style={{ ...inputStyle, textAlign: "center", marginBottom: 12 }}
        />
        <input
          type="password"
          value={adminPw}
          onChange={onPasswordChange}
          onKeyDown={(event) => (event.key === "Enter" ? onSubmit() : undefined)}
          placeholder="Password"
          aria-label="Admin password"
          style={{ ...inputStyle, textAlign: "center", marginBottom: 12 }}
        />
        {adminAuthError ? (
          <div style={{ color: "#b91c1c", fontSize: 12, marginBottom: 12 }}>{adminAuthError}</div>
        ) : null}
        <button
          onClick={onSubmit}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #6366F1, #818CF8)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Enter Admin
        </button>
        <button
          onClick={onCancel}
          style={{ background: "none", border: "none", color: THEME.textSoft, fontSize: 12, cursor: "pointer", marginTop: 12 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function InlineEmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div style={{ ...panelStyle, textAlign: "center", padding: 40 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: THEME.textPrimary, marginTop: 0, marginBottom: 8 }}>{title}</h3>
      <p style={{ color: THEME.textMuted, fontSize: 13, marginBottom: onAction ? 12 : 0 }}>{description}</p>
      {onAction ? (
        <button onClick={onAction} style={{ ...primaryButtonStyle, width: "auto", padding: "10px 18px" }}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
