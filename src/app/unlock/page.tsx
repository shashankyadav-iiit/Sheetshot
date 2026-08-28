"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { FREE_EXPORTS, PRICE_USD, PRODUCT_NAME, SITE_URL } from "@/lib/constants";
import { isDevUnlockAllowed, unlockLifetime } from "@/lib/entitlement";

function UnlockBody() {
  const router = useRouter();
  const reason = useSearchParams().get("reason");
  const missingPolar = reason === "not-configured";
  const missingGoogle = reason === "google-not-configured";
  const stub = missingPolar || missingGoogle;
  const dev = isDevUnlockAllowed();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Checkout</p>
      <h1 className="mt-3 font-display text-4xl leading-tight text-ink">
        {missingGoogle
          ? "Google sign-in isn’t configured yet."
          : missingPolar
            ? "Polar isn’t configured yet."
            : `${PRODUCT_NAME} is $${PRICE_USD}.`}
      </h1>
      {missingGoogle ? (
        <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
          <p>
            The Sign in button still works — this page is what you get until Google OAuth env vars
            are set. The app does not crash. The first {FREE_EXPORTS} anonymous exports stay free.
          </p>
          <p>Create a Google OAuth client, then set:</p>
          <pre className="overflow-x-auto rounded-xl bg-ink px-4 py-3 font-mono text-[11px] leading-5 text-surface">
{`AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_URL=${SITE_URL}`}
          </pre>
          <p>
            Authorized redirect URIs:
            <br />
            <code className="text-ink">{SITE_URL}/api/auth/callback/google</code>
            <br />
            <code className="text-ink">http://localhost:3000/api/auth/callback/google</code>
          </p>
          <p>Full steps are in the README. After that, Sign in with Google, then Unlock.</p>
        </div>
      ) : missingPolar ? (
        <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
          <p>
            The Unlock button still works — this page is what you get until env vars are set. The
            app does not crash.
          </p>
          <p>
            Create a one-time ${PRICE_USD} USD product named <strong className="text-ink">{PRODUCT_NAME}</strong> in
            Polar, then set:
          </p>
          <pre className="overflow-x-auto rounded-xl bg-ink px-4 py-3 font-mono text-[11px] leading-5 text-surface">
{`POLAR_ACCESS_TOKEN=...
POLAR_PRODUCT_ID=...
SUCCESS_URL=https://your-domain.com/success?checkout_id={CHECKOUT_ID}
POLAR_SERVER=sandbox`}
          </pre>
          <p>
            Full steps are in the README. After that,{" "}
            <a href="/checkout" className="text-accent hover:text-accent-hover">
              /checkout
            </a>{" "}
            starts a Polar session for the signed-in Google email.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted">
          Sign in with Google first. Polar checkout uses that email so lifetime unlock follows the
          account, not just this browser.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {!stub && (
          <a
            href="/checkout"
            className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Unlock for ${PRICE_USD}
          </a>
        )}
        <Link
          href="/app"
          className="inline-flex h-11 items-center justify-center rounded-full border border-line px-5 text-sm text-muted hover:text-ink"
        >
          Back to app
        </Link>
      </div>

      {dev && (
        <div className="mt-10 rounded-xl border border-dashed border-line-strong bg-surface px-4 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
            Local DEV unlock
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Only rendered when NODE_ENV=development. Sets localStorage{" "}
            <code>sheetshot_unlocked=true</code>.
          </p>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-accent hover:text-accent-hover"
            onClick={() => {
              unlockLifetime();
              window.dispatchEvent(new Event("sheetshot-entitlement"));
              router.push("/app");
            }}
          >
            Unlock this browser (dev)
          </button>
        </div>
      )}
    </main>
  );
}

export default function UnlockPage() {
  return (
    <>
      <Header variant="app" />
      <Suspense fallback={<main className="px-4 py-16 text-sm text-muted">Loading…</main>}>
        <UnlockBody />
      </Suspense>
    </>
  );
}
