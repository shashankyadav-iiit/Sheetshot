import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center px-4 py-24">
      <Logo />
      <h1 className="mt-8 font-display text-4xl text-ink">That page isn’t here.</h1>
      <p className="mt-3 text-sm text-muted">Try the app, or go back to the landing page.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="rounded-full bg-ink px-4 py-2 text-sm text-surface">
          Home
        </Link>
        <Link href="/app" className="rounded-full border border-line px-4 py-2 text-sm">
          Open app
        </Link>
      </div>
    </main>
  );
}
