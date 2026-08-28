import Link from "next/link";
import { Header } from "@/components/Header";
import { LandingHero } from "@/components/LandingHero";
import { Logo } from "@/components/Logo";
import { FREE_EXPORTS, PRICE_USD, TAGLINE } from "@/lib/constants";

export default function HomePage() {
  return (
    <>
      <Header variant="marketing" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">Sheetshot</p>
        <h1 className="mt-3 max-w-3xl font-display text-[2.35rem] leading-[1.08] tracking-tight text-ink sm:text-6xl">
          A screenshot of a table
          <span className="italic text-accent"> should just be a spreadsheet.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
          Drop a photo of a bank statement, marks sheet, price list, or Excel on a monitor. Get a
          real grid you can edit and download. The image never leaves this device.
        </p>
        <p className="mt-4 text-sm text-ink">
          ${PRICE_USD} lifetime · {FREE_EXPORTS} free exports · CSV and .xlsx
        </p>

        <div className="mt-10">
          <LandingHero />
        </div>

        <section className="mt-20 grid gap-6 sm:grid-cols-3">
          <Proof
            kicker="In-browser"
            title="Zero COGS OCR"
            body="Tesseract runs in WebAssembly on your machine. No paid vision API, no queue, no GPU bill per screenshot."
          />
          <Proof
            kicker="Private"
            title="Pixels stay here"
            body="Sheetshot never uploads your image. Privacy isn’t a policy page — it’s the architecture."
          />
          <Proof
            kicker="Downloads"
            title="CSV and .xlsx"
            body="Edit the grid, then download CSV, Excel, or copy TSV straight into Sheets. Indian grouping like 1,00,000 stays one cell."
          />
        </section>

        <section className="mt-16 grid gap-10 rounded-2xl border border-line bg-surface p-6 sm:grid-cols-[1.2fr_0.8fr] sm:p-10">
          <div>
            <h2 className="font-display text-3xl text-ink">How the grid is built</h2>
            <ol className="mt-5 space-y-3 text-sm leading-6 text-muted">
              <li>
                <span className="font-medium text-ink">1. Prepare.</span> We downscale, fix EXIF
                rotation, invert dark screenshots, and deskew a few degrees.
              </li>
              <li>
                <span className="font-medium text-ink">2. Read.</span> OCR returns words plus
                bounding boxes — not a blob of text.
              </li>
              <li>
                <span className="font-medium text-ink">3. Cluster.</span> Rows by Y, columns by X.
                You fix cells before export.
              </li>
            </ol>
          </div>
          <div className="flex flex-col justify-between rounded-xl bg-paper px-5 py-5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                Lifetime
              </p>
              <p className="mt-2 font-display text-5xl text-ink">${PRICE_USD}</p>
              <p className="mt-1 text-sm text-muted">
                Once, this browser. {FREE_EXPORTS} successful exports to try it. No account.
              </p>
            </div>
            <Link
              href="/app"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-accent text-sm font-medium text-white hover:bg-accent-hover"
            >
              Start for free
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo size="sm" />
          <p>{TAGLINE}</p>
        </div>
      </footer>
    </>
  );
}

function Proof({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">{kicker}</p>
      <h2 className="mt-2 font-display text-2xl text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}
