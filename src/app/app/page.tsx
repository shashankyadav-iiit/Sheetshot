import type { Metadata } from "next";
import { Suspense } from "react";
import { AppClient } from "@/components/AppClient";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "App",
  description: "Drop a table screenshot and download CSV or .xlsx. Processing stays in the browser.",
};

export default function AppPage() {
  return (
    <>
      <Header variant="app" />
      <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted">Loading…</div>}>
        <AppClient />
      </Suspense>
    </>
  );
}
