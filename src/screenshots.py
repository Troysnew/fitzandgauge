"""Full-page screenshots of a URL at phone and desktop widths (headless Edge), trimmed to the page:

    python src/screenshots.py http://127.0.0.1:4321/ out-prefix [chrome.exe]

Writes <out-prefix>-mobile.png (390 px wide) and <out-prefix>-desktop.png (1440 px wide).
"""

import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

DEFAULT_CHROME = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"  # headless Edge; Remotion's headless shell hangs here


MIN_WINDOW = 500  # headless Edge won't lay out narrower windows, so phone widths render inside an iframe


def shot(chrome, url, width, height, out):
    with tempfile.TemporaryDirectory() as profile:
        target = url
        if width < MIN_WINDOW:
            frame = Path(profile) / "frame.html"
            frame.write_text(f'<body style="margin:0"><iframe src="{url}" width="{width}" height="{height}" style="border:0;display:block"></iframe>')
            target = frame.as_uri()
        subprocess.run([chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--user-data-dir={profile}", "--force-device-scale-factor=1",
                        f"--window-size={max(width, MIN_WINDOW)},{height}", f"--screenshot={out}", "--virtual-time-budget=4000", target],
                       check=True, capture_output=True, timeout=90)
    im = np.asarray(Image.open(out).convert("RGB")).astype(int)
    # Trim the empty canvas below the page (rows identical to the very last row).
    last = im[-1]
    rows = np.nonzero(np.abs(im - last).sum((1, 2)) > 0)[0]
    bottom = rows.max() + 2 if len(rows) else im.shape[0]
    Image.open(out).crop((0, 0, width, min(bottom, im.shape[0]))).save(out, optimize=True)
    print(f"{out}: {width}x{min(bottom, im.shape[0])}")


def main():
    url, prefix = sys.argv[1], str(Path(sys.argv[2]).resolve())
    chrome = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_CHROME
    shot(chrome, url, 390, 12000, f"{prefix}-mobile.png")
    shot(chrome, url, 1440, 8000, f"{prefix}-desktop.png")


if __name__ == "__main__":
    main()
