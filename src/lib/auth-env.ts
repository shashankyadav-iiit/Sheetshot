export function googleAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim());
}

export function authSecret(): string {
  return process.env.AUTH_SECRET?.trim() || "sheetshot-ci-placeholder-not-for-production";
}
