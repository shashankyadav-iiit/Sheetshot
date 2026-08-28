import Link from "next/link";

export function Mark({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-grid grid-cols-2 gap-px bg-ink p-px"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="bg-surface" />
      <span className="bg-surface" />
      <span className="bg-surface" />
      <span className="bg-accent" />
    </span>
  );
}

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "sm" | "md" }) {
  const text = size === "sm" ? "text-[15px]" : "text-lg";
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-ink no-underline">
      <Mark size={size === "sm" ? 16 : 18} />
      <span className={`font-display font-semibold tracking-tight ${text}`}>Sheetshot</span>
    </Link>
  );
}
