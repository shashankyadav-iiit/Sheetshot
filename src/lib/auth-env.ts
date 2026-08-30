export function googleAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim());
}

export function authSecret(): string {
  return process.env.AUTH_SECRET?.trim() || "sheetshot-ci-placeholder-not-for-production";
}

/** Auth.js prefixes cookies with `__Secure-` / `__Host-` when this is true. */
export function useSecureAuthCookies(): boolean {
  const url = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (url) return url.startsWith("https://");
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}
