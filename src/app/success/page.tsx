"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { unlockLifetime } from "@/lib/entitlement";

function SuccessBody() {
  const params = useSearchParams();
  const checkoutId = params.get("checkout_id") ?? params.get("checkoutId");

  useEffect(() => {
    unlockLifetime();
    window.dispatchEvent(new Event("sheetshot-entitlement"));
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Unlocked</p>
      <h1 className="mt-3 font-display text-4xl leading-tight text-ink">
        This browser is lifetime Sheetshot.
      </h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        We stored <code className="font-mono text-ink">sheetshot_unlocked=true</code> in localStorage.
        Exports are unlimited on this device. There is no account to log into.
      </p>
      {checkoutId && (
        <p className="mt-3 font-mono text-xs text-faint">Polar checkout {checkoutId}</p>
      )}
      <Link
        href="/app"
        className="mt-8 inline-flex h-11 w-fit items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-surface hover:bg-ink/90"
      >
        Go to the app
      </Link>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <>
      <Header variant="app" />
      <Suspense fallback={<main className="px-4 py-16 text-sm text-muted">Confirming…</main>}>
        <SuccessBody />
      </Suspense>
    </>
  );
}
