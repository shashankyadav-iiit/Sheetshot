import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { LandingHero } from "@/components/LandingHero";
import { LandingFooter } from "@/components/ConverterLinks";
import { FREE_EXPORTS, PRICE_USD, SITE_NAME, SITE_URL, TAGLINE } from "@/lib/constants";
import { LANDING_SLUGS, getLandingPage } from "@/lib/landing-pages";

// Only the slugs defined in LANDING_PAGES exist; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LANDING_SLUGS.map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) return {};
  const url = `/${page.slug}`;
  const ogTitle = `${page.title} · ${SITE_NAME}`;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description: page.description,
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: `${SITE_NAME} — ${TAGLINE}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: page.description,
      images: ["/og.png"],
    },
  };
}

export default async function LandingPageRoute({ params }: Props) {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) notFound();

  const pageUrl = `${SITE_URL}/${page.slug}`;
  const related = page.related
    .map((s) => getLandingPage(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: pageUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any (web browser)",
      description: page.description,
      offers: {
        "@type": "Offer",
        price: String(PRICE_USD),
        priceCurrency: "USD",
        description: `${FREE_EXPORTS} free exports, then a one-time lifetime unlock`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: page.linkLabel, item: pageUrl },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD must be emitted as raw JSON; content is static and escaped below.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Header variant="marketing" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <nav aria-label="Breadcrumb" className="text-xs text-muted">
          <Link href="/" className="hover:text-ink">
            {SITE_NAME}
          </Link>
          <span className="mx-1.5">/</span>
          <span>{page.linkLabel}</span>
        </nav>
        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
          {page.kicker}
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-[2.2rem] leading-[1.08] tracking-tight text-ink sm:text-5xl">
          {page.h1}
          <span className="italic text-accent">{page.h1Accent}</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">{page.intro}</p>
        <p className="mt-4 text-sm text-ink">
          {FREE_EXPORTS} free exports · then ${PRICE_USD} once, lifetime · CSV and .xlsx · nothing uploaded
        </p>

        <div className="mt-10">
          <LandingHero />
        </div>

        <section className="mt-16" aria-labelledby="how-heading">
          <h2 id="how-heading" className="font-display text-3xl text-ink">
            How it works
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {page.steps.map(([title, body], i) => (
              <li key={title} className="rounded-2xl border border-line bg-surface p-5">
                <p className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 font-display text-xl text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16 grid gap-10 sm:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl text-ink">Good for</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-muted">
              {page.useCases.map((u) => (
                <li key={u} className="flex gap-2">
                  <span className="text-accent" aria-hidden>
                    ▪
                  </span>
                  {u}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-2xl text-ink">Tips for accurate results</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-muted">
              {page.tips.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-accent" aria-hidden>
                    ▪
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-16 rounded-2xl border border-line bg-surface p-6 sm:p-10">
          <h2 className="font-display text-3xl text-ink">{page.bodyHeading}</h2>
          <div className="mt-5 max-w-3xl space-y-4 text-sm leading-7 text-muted">
            {page.body.map((para) => (
              <p key={para.slice(0, 32)}>{para}</p>
            ))}
          </div>
          <Link
            href="/app"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Open Sheetshot — free to try
          </Link>
        </section>

        <section className="mt-20" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-display text-3xl text-ink">
            FAQ
          </h2>
          <dl className="mt-8 divide-y divide-line border-y border-line">
            {page.faqs.map((item) => (
              <div
                key={item.q}
                className="grid gap-2 py-6 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] sm:gap-10"
              >
                <dt className="font-medium text-ink">{item.q}</dt>
                <dd className="text-sm leading-6 text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {related.length > 0 && (
          <section className="mt-16" aria-labelledby="related-heading">
            <h2 id="related-heading" className="font-display text-2xl text-ink">
              Related converters
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/${r.slug}`}
                    className="inline-flex rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-ink hover:border-ink/20"
                  >
                    {r.linkLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <LandingFooter />
    </>
  );
}
