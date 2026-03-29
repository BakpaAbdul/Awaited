import { panelStyle, panelTitle, THEME } from "../lib/theme";
import { FooterLink } from "../components/siteChrome";

export default function PolicyPage({ title, intro, sections, onBack, onNavigate }) {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: THEME.textMuted, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}
      >
        ← Back to results
      </button>
      <div style={{ ...panelStyle, padding: "28px 30px", marginBottom: 18 }}>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            fontWeight: 700,
            color: THEME.textPrimary,
            marginTop: 0,
            marginBottom: 10,
          }}
        >
          {title}
        </h2>
        <p style={{ color: THEME.textSecondary, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{intro}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sections.map((section) => (
          <div key={section.heading} style={panelStyle}>
            <h3 style={{ ...panelTitle, fontSize: 16, marginBottom: 10 }}>{section.heading}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.items.map((item) => (
                <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "#38BDF8", fontSize: 13, lineHeight: 1.7 }}>•</span>
                  <p style={{ margin: 0, color: THEME.textSecondary, fontSize: 14, lineHeight: 1.7 }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...panelStyle, marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: THEME.textMuted, marginRight: "auto" }}>Read the rest of the trust pages:</span>
        <FooterLink onClick={() => onNavigate("privacy")}>Privacy</FooterLink>
        <FooterLink onClick={() => onNavigate("community")}>Community Rules</FooterLink>
        <FooterLink onClick={() => onNavigate("disclaimer")}>Disclaimer</FooterLink>
      </div>
    </div>
  );
}
