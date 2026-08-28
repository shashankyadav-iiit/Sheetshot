"use client";

import { PRICE_USD, PRODUCT_NAME } from "@/lib/constants";
import { isDevUnlockAllowed, unlockLifetime } from "@/lib/entitlement";

type PaywallProps = {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
};

export function Paywall({ open, onClose, onUnlocked }: PaywallProps) {
  if (!open) return null;
  const dev = isDevUnlockAllowed();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close paywall"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="paywall-title"
        className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-[0_24px_80px_rgba(23,20,17,0.18)]"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Free exports used</p>
        <h2 id="paywall-title" className="mt-2 font-display text-3xl leading-tight text-ink">
          Three tries. Then it&apos;s {PRODUCT_NAME} for ${PRICE_USD}.
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Unlock this browser forever. No account, no subscription. OCR still runs on your
          machine — we only send you to Polar to pay.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <a
            href="/checkout"
            className="inline-flex h-11 items-center justify-center rounded-full bg-accent text-sm font-medium text-white hover:bg-accent-hover"
          >
            Unlock for ${PRICE_USD}
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-full border border-line text-sm text-muted hover:text-ink"
          >
            Not now
          </button>
        </div>
        {dev && (
          <div className="mt-5 rounded-xl border border-dashed border-line-strong bg-paper px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
              Local DEV unlock
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              NODE_ENV=development only. Writes <code>sheetshot_unlocked=true</code> in
              localStorage so you can test the paid path without Polar.
            </p>
            <button
              type="button"
              className="mt-2 text-xs font-medium text-accent hover:text-accent-hover"
              onClick={() => {
                unlockLifetime();
                window.dispatchEvent(new Event("sheetshot-entitlement"));
                onUnlocked();
              }}
            >
              Unlock this browser (dev)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
