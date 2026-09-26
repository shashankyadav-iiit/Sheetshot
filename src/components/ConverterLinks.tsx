import Link from "next/link";
import { TAGLINE } from "@/lib/constants";
import { LANDING_PAGES } from "@/lib/landing-pages";
import { Logo } from "./Logo";

export function ConverterLinks() {
  return (
    <nav aria-label="Converters">
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        {LANDING_PAGES.map((p) => (
          <li key={p.slug}>
            <Link href={`/${p.slug}`} className="hover:text-ink">
              {p.linkLabel}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <Logo size="sm" />
          <p>{TAGLINE}</p>
        </div>
        <div className="mt-6">
          <ConverterLinks />
        </div>
      </div>
    </footer>
  );
}
