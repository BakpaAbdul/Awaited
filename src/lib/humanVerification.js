const HUMAN_TRUST_STORAGE_KEY = "awaited:human-trust:v1";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getStoredHumanTrust() {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(HUMAN_TRUST_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.expiresAt) {
      window.localStorage.removeItem(HUMAN_TRUST_STORAGE_KEY);
      return null;
    }

    const expiresAt = new Date(parsed.expiresAt).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      window.localStorage.removeItem(HUMAN_TRUST_STORAGE_KEY);
      return null;
    }

    return {
      token: String(parsed.token),
      expiresAt: new Date(expiresAt).toISOString(),
    };
  } catch {
    return null;
  }
}

export function hasStoredHumanTrust() {
  return Boolean(getStoredHumanTrust());
}

export function getStoredHumanTrustToken() {
  return getStoredHumanTrust()?.token || "";
}

export function storeHumanTrust({ token, expiresAt }) {
  if (!canUseStorage() || !token || !expiresAt) {
    return;
  }

  try {
    window.localStorage.setItem(
      HUMAN_TRUST_STORAGE_KEY,
      JSON.stringify({
        token,
        expiresAt,
      }),
    );
  } catch {
    // Ignore storage failures and fall back to per-action verification.
  }
}

export function clearHumanTrust() {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(HUMAN_TRUST_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
