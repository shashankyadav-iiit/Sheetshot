import { EXPORT_COUNT_KEY, FREE_EXPORTS, UNLOCKED_KEY } from "./constants";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/** Development-only local unlock. Production paid access is Google + Polar. */
export function isDevUnlocked(): boolean {
  if (!isDevUnlockAllowed() || !canUseStorage()) return false;
  return localStorage.getItem(UNLOCKED_KEY) === "true";
}

export function isUnlocked(accountPaid = false): boolean {
  return accountPaid || isDevUnlocked();
}

export function unlockLifetime(): void {
  if (!canUseStorage() || !isDevUnlockAllowed()) return;
  localStorage.setItem(UNLOCKED_KEY, "true");
}

export function getExportCount(): number {
  if (!canUseStorage()) return 0;
  const n = Number.parseInt(localStorage.getItem(EXPORT_COUNT_KEY) ?? "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function remainingFreeExports(accountPaid = false): number {
  if (isUnlocked(accountPaid)) return Number.POSITIVE_INFINITY;
  return Math.max(0, FREE_EXPORTS - getExportCount());
}

export function canExport(accountPaid = false): boolean {
  return isUnlocked(accountPaid) || getExportCount() < FREE_EXPORTS;
}

export function recordExport(accountPaid = false): void {
  if (!canUseStorage() || isUnlocked(accountPaid)) return;
  localStorage.setItem(EXPORT_COUNT_KEY, String(getExportCount() + 1));
}

export function isDevUnlockAllowed(): boolean {
  return process.env.NODE_ENV === "development";
}
