"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { PRICE_USD, PRODUCT_NAME } from "@/lib/constants";
import { isDevUnlockAllowed, unlockLifetime } from "@/lib/entitlement";

function UnlockBody() {
  const router = useRouter();
  const reason = useSearchParams().get("reason");
  const missingPolar = reason === "not-configured";
  const dev = isDevUnlockAllowed();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Checkout</p>
      <h1 className="mt-3 font-display text-4xl leading-tight text-ink">
        {missingPolar ? "Polar isn’t configured yet." : `${PRODUCT_NAME} is $${PRICE_USD}.`}
      </h1>
      {missingPolar ? (
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
            starts a Polar session.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted">
          You’ll be sent to Polar for a one-time payment, then back to /success which unlocks this
          browser.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href="/checkout"
          className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Unlock for ${PRICE_USD}
        </a>
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
