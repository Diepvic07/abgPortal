const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeLoginEmail(value?: string | string[]): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : undefined;
}

/** Accept only root-relative paths, excluding protocol-relative and backslash URLs. */
export function safeLoginCallbackUrl(value?: string | string[], fallback = "/events"): string {
  if (typeof value !== 'string' || !value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  try {
    const parsed = new URL(value, "https://abgalumni.vn");
    return parsed.origin === "https://abgalumni.vn" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
  } catch {
    return fallback;
  }
}
