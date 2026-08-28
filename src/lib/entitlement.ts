import { EXPORT_COUNT_KEY, FREE_EXPORTS, UNLOCKED_KEY } from "./constants";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function isUnlocked(): boolean {
  if (!canUseStorage()) return false;
  return localStorage.getItem(UNLOCKED_KEY) === "true";
}

export function unlockLifetime(): void {
  if (!canUseStorage()) return;
  localStorage.setItem(UNLOCKED_KEY, "true");
}

export function getExportCount(): number {
  if (!canUseStorage()) return 0;
  const n = Number.parseInt(localStorage.getItem(EXPORT_COUNT_KEY) ?? "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function remainingFreeExports(): number {
  if (isUnlocked()) return Number.POSITIVE_INFINITY;
  return Math.max(0, FREE_EXPORTS - getExportCount());
}

export function canExport(): boolean {
  return isUnlocked() || getExportCount() < FREE_EXPORTS;
}

export function recordExport(): void {
  if (!canUseStorage() || isUnlocked()) return;
  localStorage.setItem(EXPORT_COUNT_KEY, String(getExportCount() + 1));
}

export function isDevUnlockAllowed(): boolean {
  return process.env.NODE_ENV === "development";
}
