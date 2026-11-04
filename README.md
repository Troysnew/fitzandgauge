# Fitz & Gauge website

Source for [fitzandgauge.com](https://fitzandgauge.com/): tiny questions, brilliant answers, a little chaos.

The site is static and published by GitHub Pages from the `docs/` folder on `main`.

## Rebuild

```bash
python src/compress_images.py   # only when images change
node src/build.mjs              # writes docs/
```

- Episodes, topics, links and the form endpoint: `src/episodes.json`
- Sources for each episode: `src/sources/<slug>.md`
- YouTube links for posted episodes: `src/videos.json`, filled in by `node src/update_videos.mjs` (reads the channel's public feed and matches titles), then rebuild
- Styles: `src/site.css`; page templates: `src/build.mjs`
