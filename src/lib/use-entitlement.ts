"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { FREE_EXPORTS } from "./constants";
import { canExport, isDevUnlocked, remainingFreeExports } from "./entitlement";

type EntitlementPayload = {
  paid?: boolean;
  googleAuth?: boolean;
};

export function useEntitlementState() {
  const { data: session, status } = useSession();
  const [polarPaid, setPolarPaid] = useState(false);
  const [googleAuth, setGoogleAuth] = useState(false);
  const [localTick, setLocalTick] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const bump = () => setLocalTick((n) => n + 1);
    window.addEventListener("sheetshot-entitlement", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("sheetshot-entitlement", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/entitlement", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as EntitlementPayload;
        if (typeof data.googleAuth === "boolean") setGoogleAuth(data.googleAuth);
        setPolarPaid(data.paid === true);
      } catch {
        if (!cancelled) setPolarPaid(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.email, session?.paid, localTick]);

  const accountPaid = polarPaid || session?.paid === true;
  const unlocked = accountPaid || (hydrated && isDevUnlocked());
  const remaining = hydrated ? remainingFreeExports(accountPaid) : FREE_EXPORTS;
  const entitled = accountPaid || !hydrated || canExport(accountPaid);

  return {
    unlocked,
    remaining: Number.isFinite(remaining) ? remaining : FREE_EXPORTS,
    canExport: entitled,
    accountPaid,
    signedIn: Boolean(session?.user?.email),
    user: session?.user ?? null,
    googleAuth,
    sessionStatus: status,
  };
}
