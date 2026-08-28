#!/usr/bin/env python3
"""Render OCR-friendly synthetic table screenshots into public/samples/."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "samples"
OUT.mkdir(parents=True, exist_ok=True)

FONT_REG = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def cell_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def render_table(
    path: Path,
    headers: list[str],
    rows: list[list[str]],
    alignments: list[str] | None = None,
) -> None:
    pad_x, pad_y = 28, 16
    margin = 48
    header_font = load_font(FONT_BOLD, 22)
    cell_font = load_font(FONT_REG, 22)

    probe = Image.new("RGB", (10, 10), "white")
    draw = ImageDraw.Draw(probe)

    n_cols = len(headers)
    alignments = alignments or ["left"] * n_cols
    col_w = []
    for c in range(n_cols):
        texts = [headers[c]] + [row[c] for row in rows]
        font_for = [header_font] + [cell_font] * len(rows)
        width = max(cell_size(draw, t, f)[0] for t, f in zip(texts, font_for))
        col_w.append(width + pad_x * 2)

    row_h = 56
    header_h = 60
    width = margin * 2 + sum(col_w)
    height = margin * 2 + header_h + row_h * len(rows)

    img = Image.new("RGB", (width, height), "#f7f2e8")
    # Inner “screenshot” sheet
    sheet = Image.new("RGB", (width - 24, height - 24), "#ffffff")
    img.paste(sheet, (12, 12))
    draw = ImageDraw.Draw(img)

    origin_x, origin_y = margin, margin
    # Outer table border
    table_w = sum(col_w)
    table_h = header_h + row_h * len(rows)
    draw.rectangle(
        [origin_x, origin_y, origin_x + table_w, origin_y + table_h],
        outline="#1a1714",
        width=2,
    )

    # Header fill
    draw.rectangle(
        [origin_x, origin_y, origin_x + table_w, origin_y + header_h],
        fill="#efe8dc",
        outline="#1a1714",
        width=2,
    )

    def draw_row(texts: list[str], y: int, fonts: list[ImageFont.FreeTypeFont], fill: str | None):
        x = origin_x
        if fill:
            draw.rectangle(
                [origin_x + 2, y + 1, origin_x + table_w - 2, y + (header_h if y == origin_y else row_h) - 1],
                fill=fill,
            )
        for i, text in enumerate(texts):
            h = header_h if y == origin_y else row_h
            # vertical rules
            if i > 0:
                draw.line([(x, y), (x, y + h)], fill="#1a1714", width=1)
            tw, th = cell_size(draw, text, fonts[i])
            if alignments[i] == "right":
                tx = x + col_w[i] - pad_x - tw
            else:
                tx = x + pad_x
            ty = y + (h - th) // 2 - 2
            draw.text((tx, ty), text, font=fonts[i], fill="#171411")
            x += col_w[i]

    draw_row(headers, origin_y, [header_font] * n_cols, None)

    for r, row in enumerate(rows):
        y = origin_y + header_h + r * row_h
        draw.line([(origin_x, y), (origin_x + table_w, y)], fill="#1a1714", width=1)
        bg = "#fbfaf6" if r % 2 else None
        draw_row(row, y, [cell_font] * n_cols, bg)

    img.save(path, "PNG", optimize=True)
    print(f"wrote {path} ({img.size[0]}x{img.size[1]})")


def main() -> None:
    render_table(
        OUT / "price-list.png",
        headers=["Item", "Qty", "Rate", "Amount"],
        rows=[
            ["Basmati Rice 5kg", "12", "1,250", "15,000"],
            ["Toor Dal 1kg", "40", "189", "7,560"],
            ["Sunflower Oil 1L", "25", "178", "4,450"],
            ["Aashirvaad Atta 10kg", "8", "475", "3,800"],
            ["Tata Salt 1kg", "50", "28", "1,400"],
            ["Wholesale Cashew", "2", "50,000", "1,00,000"],
        ],
        alignments=["left", "right", "right", "right"],
    )
    render_table(
        OUT / "marks-sheet.png",
        headers=["Name", "Maths", "Physics", "Chemistry", "Total"],
        rows=[
            ["Ananya Iyer", "88", "91", "84", "263"],
            ["Rahul Mehta", "76", "69", "81", "226"],
            ["Sara Khan", "94", "90", "92", "276"],
            ["Vikram Rao", "61", "73", "68", "202"],
        ],
        alignments=["left", "right", "right", "right", "right"],
    )


if __name__ == "__main__":
    main()
