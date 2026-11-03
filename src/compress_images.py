"""Make web versions of the approved kit art (run from the repo root): python src/compress_images.py

Sources are the unmodified approved PNGs in src/brand/ (from the Fitz & Gauge asset kit). They are only resized and
re-encoded as WebP, never redrawn or recoloured. Each gets a small size for phones and 1x screens and a full-size version
for 4K, served with srcset. Output goes to site/img/.
"""

from pathlib import Path

from PIL import Image

SRC = Path(__file__).parent / "brand"
OUT = Path(__file__).parent.parent / "site" / "img"
OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.iterdir():
    old.unlink()

JOBS = [
    # source, output stem, widths, quality
    ("fitz-and-gauge-official-logo.png", "logo", [420, 800], 90),   # header logo: 280 CSS px at 1x, 385 at 4K
    ("fitz_34_idea.png", "fitz", [560, 1122], 88),                   # hero (and portrait crop): up to ~560 CSS px wide at 4K
    ("gauge_front_wave.png", "gauge", [540, 1086], 88),
]


def save(im, name, quality):
    path = OUT / name
    im.save(path, "WEBP", quality=quality, method=6)
    print(f"{name:<26} {im.width}x{im.height}  {path.stat().st_size / 1024:6.1f} KB")


for src, stem, widths, q in JOBS:
    im = Image.open(SRC / src).convert("RGBA")
    for w in widths:
        r = im if w >= im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        save(r, f"{stem}-{w}.webp", q)

# Episode thumbnails (src/episode-art/<slug>.png, 1672x941): 640 for cards, 1280 for 4K and 2x screens.
for art in sorted((Path(__file__).parent / "episode-art").glob("*.png")):
    im = Image.open(art).convert("RGB")
    for w in (640, 1280):
        save(im.resize((w, round(im.height * w / im.width)), Image.LANCZOS), f"ep-{art.stem}-{w}.webp", 82)

# Workshop backdrop: the kit's 3840x2160 remaster for 4K, a 1920 version for everything else.
bg = Image.open(SRC / "workshop-background-3840x2160.webp").convert("RGB")
save(bg, "workshop-3840.webp", 80)
save(bg.resize((1920, 1080), Image.LANCZOS), "workshop-1920.webp", 80)
save(bg.resize((960, 540), Image.LANCZOS), "workshop-960.webp", 78)

# Social share image (Open Graph, 1200x630) from the channel banner.
banner = Image.open(Path(__file__).parent / "channel-banner.webp").convert("RGB")
w, h = banner.size
nw = round(h * 1200 / 630)
if w > nw:
    banner = banner.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
banner = banner.resize((1200, 630), Image.LANCZOS)
banner.save(OUT / "share.jpg", "JPEG", quality=82, optimize=True, progressive=True)
print(f"{'share.jpg':<26} 1200x630  {(OUT / 'share.jpg').stat().st_size / 1024:6.1f} KB")

# Favicons from the approved Gauge head mark.
head = Image.open(SRC / "gauge_watermark.png").convert("RGBA")
head = head.crop(head.getbbox())
side = max(head.size)
sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
sq.paste(head, ((side - head.width) // 2, (side - head.height) // 2))
sq.resize((180, 180), Image.LANCZOS).save(OUT / "apple-touch-icon.png", optimize=True)
sq.resize((48, 48), Image.LANCZOS).save(OUT / "favicon.png", optimize=True)
print("favicon.png 48x48, apple-touch-icon.png 180x180")
