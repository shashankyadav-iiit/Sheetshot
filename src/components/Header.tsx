"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FREE_EXPORTS, PRICE_USD } from "@/lib/constants";
import { isUnlocked, remainingFreeExports } from "@/lib/entitlement";
import { Logo } from "./Logo";

export function Header({ variant }: { variant: "marketing" | "app" }) {
  const [unlocked, setUnlocked] = useState(false);
  const [remaining, setRemaining] = useState(FREE_EXPORTS);

  useEffect(() => {
    const sync = () => {
      setUnlocked(isUnlocked());
      const left = remainingFreeExports();
      setRemaining(Number.isFinite(left) ? left : FREE_EXPORTS);
    };
    sync();
    window.addEventListener("sheetshot-entitlement", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sheetshot-entitlement", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo size="sm" />
        {variant === "marketing" ? (
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/app" className="hidden text-muted hover:text-ink sm:inline">
              Open app
            </Link>
            <Link
              href="/app"
              className="rounded-full bg-ink px-3.5 py-1.5 font-medium text-surface hover:bg-ink/90"
            >
              Get started
            </Link>
          </nav>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            {unlocked ? (
              <span className="hidden text-muted sm:inline">Lifetime unlocked</span>
            ) : (
              <span className="text-muted">
                {remaining > 0 ? (
                  <>
                    <span className="font-medium text-ink">{remaining}</span> free export
                    {remaining === 1 ? "" : "s"} left
                  </>
                ) : (
                  "Free exports used"
                )}
              </span>
            )}
            {!unlocked && (
              <a
                href="/checkout"
                className="rounded-full bg-accent px-3.5 py-1.5 font-medium text-white hover:bg-accent-hover"
              >
                Unlock ${PRICE_USD}
              </a>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
