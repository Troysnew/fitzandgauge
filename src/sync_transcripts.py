"""Copy each episode's fact-checked script into the site as a transcript, and make its share image.

Run from the website folder after an episode's script is final:
    python src/sync_transcripts.py ["D:/Youtube Pip"]

- src/transcripts/<slug>.json  <- <studio>/episodes/<slug>/script.json (speaker + text only, word for word)
- site/img/og-<slug>.jpg      <- src/episode-art/<slug>.png, 1200x630 (the link preview image)
The build shows the transcript only once the episode's video is out.
"""
import json
import sys
from pathlib import Path

from PIL import Image

SITE = Path(__file__).resolve().parent.parent
STUDIO = Path(sys.argv[1] if len(sys.argv) > 1 else "D:/Youtube Pip")
episodes = json.loads((SITE / "src/episodes.json").read_text(encoding="utf-8"))["episodes"]
(SITE / "src/transcripts").mkdir(exist_ok=True)

missing = []
for ep in episodes:
    slug = ep["slug"]
    script = STUDIO / "episodes" / slug / "script.json"
    if script.exists():
        lines = [{"speaker": l["speaker"], "text": l["text"]} for l in json.loads(script.read_text(encoding="utf-8"))]
        (SITE / "src/transcripts" / f"{slug}.json").write_text(json.dumps(lines, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    else:
        missing.append(f"transcript:{slug}")

    art = SITE / "src/episode-art" / f"{slug}.png"
    if art.exists():
        im = Image.open(art).convert("RGB")
        W, H = 1200, 630
        s = max(W / im.width, H / im.height)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        x, y = (im.width - W) // 2, (im.height - H) // 2
        im.crop((x, y, x + W, y + H)).save(SITE / "site/img" / f"og-{slug}.jpg", quality=84, optimize=True, progressive=True)
    else:
        missing.append(f"art:{slug}")

print(f"{len(episodes)} episodes; missing: {', '.join(missing) or 'none'}")
