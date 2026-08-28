#!/usr/bin/env python3
"""Render a 1200x630 branded Open Graph image to public/og.png."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og.png"

FONT_SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
FONT_SERIF_ITALIC = "/usr/share/fonts/truetype/liberation/LiberationSerif-BoldItalic.ttf"
FONT_SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FONT_SANS_MED = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

PAPER = "#f3efe6"
PAPER_2 = "#e8e0d2"
INK = "#171411"
MUTED = "#6a6258"
LINE = "#d6cec0"
SURFACE = "#fffdf8"
ACCENT = "#c2410c"


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def main() -> None:
    width, height = 1200, 630
    img = Image.new("RGB", (width, height), PAPER)
    draw = ImageDraw.Draw(img)

    # Soft right-side panel
    draw.rounded_rectangle([680, 70, 1140, 560], radius=28, fill=SURFACE, outline=LINE, width=2)

    # Mini spreadsheet in the panel
    table = [
        ("Item", "Qty", "Amount"),
        ("Basmati Rice", "12", "15,000"),
        ("Toor Dal", "40", "7,560"),
        ("Sunflower Oil", "25", "4,450"),
        ("Tata Salt", "50", "1,400"),
    ]
    tx, ty = 720, 130
    col_w = [200, 80, 100]
    row_h = 62
    table_w = sum(col_w)
    header_font = load_font(FONT_SANS_MED, 20)
    cell_font = load_font(FONT_SANS, 20)

    draw.rectangle([tx, ty, tx + table_w, ty + row_h], fill=PAPER_2)
    for r, row in enumerate(table):
        y = ty + r * row_h
        if r > 0 and r % 2 == 0:
            draw.rectangle([tx, y, tx + table_w, y + row_h], fill="#faf8f3")
        x = tx
        for i, cell in enumerate(row):
            font = header_font if r == 0 else cell_font
            fill = MUTED if r == 0 else INK
            bbox = draw.textbbox((0, 0), cell, font=font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            if i == 0:
                cx = x + 18
            else:
                cx = x + col_w[i] - 18 - tw
            draw.text((cx, y + (row_h - th) // 2 - 2), cell, font=font, fill=fill)
            x += col_w[i]
        draw.line([(tx, y + row_h), (tx + table_w, y + row_h)], fill=LINE, width=1)

    # 2x2 mark (matches Logo)
    mark = 56
    gap = 3
    cell = (mark - gap) // 2
    mx, my = 88, 168
    draw.rectangle([mx, my, mx + mark, my + mark], fill=INK)
    draw.rectangle([mx + 2, my + 2, mx + 2 + cell, my + 2 + cell], fill=SURFACE)
    draw.rectangle([mx + 2 + cell + gap, my + 2, mx + mark - 2, my + 2 + cell], fill=SURFACE)
    draw.rectangle([mx + 2, my + 2 + cell + gap, mx + 2 + cell, my + mark - 2], fill=SURFACE)
    draw.rectangle(
        [mx + 2 + cell + gap, my + 2 + cell + gap, mx + mark - 2, my + mark - 2],
        fill=ACCENT,
    )

    title_font = load_font(FONT_SERIF, 72)
    draw.text((88, 250), "Sheetshot", font=title_font, fill=INK)

    tag_font = load_font(FONT_SERIF_ITALIC, 28)
    tag_lines = ["A screenshot of a table", "should just be a spreadsheet."]
    y = 350
    for line in tag_lines:
        draw.text((88, y), line, font=tag_font, fill=ACCENT)
        y += 40

    meta_font = load_font(FONT_SANS, 20)
    draw.text((88, 470), "In-browser OCR  ·  $9 lifetime", font=meta_font, fill=MUTED)

    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    main()
