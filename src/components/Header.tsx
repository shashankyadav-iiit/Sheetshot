"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { PRICE_USD } from "@/lib/constants";
import { startGoogleSignIn } from "@/lib/start-google-sign-in";
import { useEntitlementState } from "@/lib/use-entitlement";
import { Logo } from "./Logo";

export function Header({ variant }: { variant: "marketing" | "app" }) {
  const { unlocked, remaining, signedIn, user } = useEntitlementState();

  const onSignIn = () => {
    void startGoogleSignIn(variant === "marketing" ? "/app" : window.location.href);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo size="sm" />
        {variant === "marketing" ? (
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/app" className="hidden text-muted hover:text-ink sm:inline">
              Open app
            </Link>
            <AuthButtons
              signedIn={signedIn}
              unlocked={unlocked}
              user={user}
              onSignIn={onSignIn}
            />
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
            <AuthButtons
              signedIn={signedIn}
              unlocked={unlocked}
              user={user}
              onSignIn={onSignIn}
            />
          </div>
        )}
      </div>
    </header>
  );
}

function AuthButtons({
  signedIn,
  unlocked,
  user,
  onSignIn,
}: {
  signedIn: boolean;
  unlocked: boolean;
  user: { name?: string | null; email?: string | null; image?: string | null } | null;
  onSignIn: () => void;
}) {
  if (!signedIn) {
    return (
      <button
        type="button"
        onClick={onSignIn}
        className="text-muted hover:text-ink"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {user?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt=""
          title={user.email ?? user.name ?? "Signed in"}
          className="h-7 w-7 rounded-full border border-line object-cover"
        />
      ) : (
        <span
          title={user?.email ?? user?.name ?? "Signed in"}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-paper-2 text-[11px] font-medium text-muted"
        >
          {(user?.name || user?.email || "?").slice(0, 1).toUpperCase()}
        </span>
      )}
      {!unlocked && (
        <span className="hidden max-w-[9rem] truncate text-muted sm:inline">
          {user?.name || user?.email}
        </span>
      )}
      <button
        type="button"
        onClick={() => void signOut({ callbackUrl: "/" })}
        className="text-muted hover:text-ink"
      >
        Sign out
      </button>
    </div>
  );
}
