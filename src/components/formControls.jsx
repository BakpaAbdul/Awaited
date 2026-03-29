import { useEffect, useId, useRef } from "react";
import { hasStoredHumanTrust } from "../lib/humanVerification";
import { inputStyle, THEME } from "../lib/theme";
import { loadTurnstileScript } from "../lib/turnstile";
import { turnstileSiteKey } from "../lib/supabaseClient";

export function getInputStateStyle(hasError = false) {
  return hasError
    ? {
        ...inputStyle,
        border: "1px solid rgba(220,38,38,0.45)",
        boxShadow: "0 0 0 3px rgba(220,38,38,0.08)",
      }
    : inputStyle;
}

export function FieldError({ id, message }) {
  if (!message) {
    return null;
  }

  return (
    <div id={id} role="alert" style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>
      {message}
    </div>
  );
}

export function FormField({ label, children, style, hint, error, required, htmlFor }) {
  const fallbackId = useId();
  const fieldId = htmlFor || fallbackId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;

  return (
    <div style={style}>
      <label
        htmlFor={fieldId}
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: THEME.textMuted,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
        {required ? " *" : ""}
      </label>
      {typeof children === "function"
        ? children({ fieldId, errorId, hintId })
        : children}
      {hint ? (
        <div id={hintId} style={{ color: THEME.textSoft, fontSize: 12, marginTop: 6 }}>
          {hint}
        </div>
      ) : null}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function TurnstileGate({ onVerify, resetKey }) {
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
          theme: "light",
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
