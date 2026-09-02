"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { confirmPolarEntitlement, refreshSessionInBackground } from "@/lib/confirm-success";
import { startGoogleSignIn } from "@/lib/start-google-sign-in";

function SuccessBody() {
  const params = useSearchParams();
  const checkoutId = params.get("checkout_id") ?? params.get("checkoutId");
  const { status, update } = useSession();
  const [state, setState] = useState<"loading" | "paid" | "unpaid" | "error">("loading");
  const [email, setEmail] = useState<string | null>(null);
  const checked = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (checked.current) return;
    checked.current = true;

    let cancelled = false;
    const run = async () => {
      const outcome = await confirmPolarEntitlement({
        checkoutId,
        shouldStop: () => cancelled,
      });
      if (cancelled) return;
      setEmail(outcome.email);
      if (outcome.state === "paid") {
        // Never block Unlocked on next-auth session.update() — it can hang on Polar.
        setState("paid");
        window.dispatchEvent(new Event("sheetshot-entitlement"));
        refreshSessionInBackground(update);
        return;
      }
      setState(outcome.state);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [status, checkoutId, update]);

  const callbackUrl = checkoutId
    ? `/success?checkout_id=${encodeURIComponent(checkoutId)}`
    : "/success";
  const view = status === "unauthenticated" ? "need-signin" : state;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      {view === "loading" && (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Confirming</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-ink">
            Checking Polar for this Google account…
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            Lifetime unlock is tied to the email you signed in with, not this browser.
          </p>
        </>
      )}

      {view === "need-signin" && (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Sign in</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-ink">
            Sign in with Google to finish unlocking.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            Polar has the order. Sign in so we can attach lifetime Sheetshot to that Google account
            on this device and every later one.
          </p>
          <button
            type="button"
            className="mt-8 inline-flex h-11 w-fit items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover"
            onClick={() => {
              void startGoogleSignIn(callbackUrl);
            }}
          >
            Sign in with Google
          </button>
        </>
      )}

      {view === "paid" && (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Unlocked</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-ink">
            This Google account is lifetime Sheetshot.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            Polar has a paid Sheetshot Lifetime order for{" "}
            <span className="text-ink">{email ?? "your account"}</span>. Sign in with the same
            Google account on any device to keep working.
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
        </>
      )}

      {view === "unpaid" && (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Not found</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-ink">
            Polar has no paid order for this Google account.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            You&apos;re signed in as <span className="text-ink">{email ?? "this account"}</span>.
            Use the same Google email you paid with, or unlock again.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/checkout"
              className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Go to checkout
            </a>
            <Link
              href="/app"
              className="inline-flex h-11 items-center justify-center rounded-full border border-line px-5 text-sm text-muted hover:text-ink"
            >
              Back to app
            </Link>
          </div>
        </>
      )}

      {view === "error" && (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Error</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-ink">
            We couldn&apos;t reach Polar.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            Try again in a moment. Your payment is on Polar — signing in later will still pick it
            up.
          </p>
          <Link
            href="/app"
            className="mt-8 inline-flex h-11 w-fit items-center justify-center rounded-full border border-line px-5 text-sm text-muted hover:text-ink"
          >
            Back to app
          </Link>
        </>
      )}
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
