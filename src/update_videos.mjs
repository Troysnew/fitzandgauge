// Finds newly posted Fitz & Gauge videos on YouTube and records their links in src/videos.json.
// It reads the channel's public RSS feed (no API key) and matches each video to an episode by its title.
// The site build then treats a linked episode as "out", so it becomes the Latest Mystery and gets a player.
// Usage: node src/update_videos.mjs   (prints what it added; the GitHub Action runs it daily, then rebuilds)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHANNEL_ID = "UC0PjCAnBRTX5VhH_w5XI9Xg"; // @FitzAndGauge
const FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const VIDEOS = path.join(ROOT, "src/videos.json");

const { episodes } = JSON.parse(readFileSync(path.join(ROOT, "src/episodes.json"), "utf8").replace(/^﻿/, ""));
const videos = existsSync(VIDEOS) ? JSON.parse(readFileSync(VIDEOS, "utf8")) : {};

// "Why are airplane windows round? #FitzAndGauge" and "Why are airplane windows round?" compare equal.
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const norm = (s) => decode(s).toLowerCase().replace(/#\w+/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// YouTube sometimes refuses the feed from cloud servers (the GitHub runner), so: try the channel feed and the
// channel's uploads-playlist feed, a few times each. If every try fails, warn and keep the links we already have
// (exit 0), so the site still rebuilds and the run doesn't fail for a reason that isn't ours.
const FEEDS = [FEED, `https://www.youtube.com/feeds/videos.xml?playlist_id=UU${CHANNEL_ID.slice(2)}`];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let xml = "";
const tried = [];
for (const url of FEEDS) {
  for (let i = 0; i < 3 && !xml; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; fitzandgauge-site-updater)", "Accept-Language": "en-US" } });
      if (res.ok) xml = await res.text();
      else tried.push(`${url} -> HTTP ${res.status}`);
    } catch (e) {
      tried.push(`${url} -> ${e.message}`);
    }
    if (!xml) await sleep(4000 * (i + 1));
  }
  if (xml) break;
}
let entries = xml
  ? [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
      title: decode(e.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""),
      url: e.match(/<link rel="alternate" href="([^"]+)"/)?.[1] ?? "",
    }))
  : [];
// The feed also 404s at random (seen from a home connection on Nov 7, not only from GitHub). Backup: the channel's
// public Shorts page, where each Short is a "shortsLockupViewModel" block with its title and video id.
if (!entries.length) {
  try {
    const res = await fetch("https://www.youtube.com/@FitzAndGauge/shorts", { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en-US" } });
    const html = res.ok ? await res.text() : "";
    entries = html.split("shortsLockupViewModel").slice(1).map((b) => {
      const title = b.match(/"primaryText":\{"content":"((?:[^"\\]|\\.)*)"/)?.[1];
      const id = b.match(/"videoId":"([\w-]{11})"/)?.[1];
      return { title: title ? JSON.parse(`"${title}"`) : "", url: id ? `https://www.youtube.com/shorts/${id}` : "" };
    }).filter((e) => e.title && e.url);
    // Long Case Files live on the Videos page, as "videoRenderer" blocks (untested until the first one is public).
    const vres = await fetch("https://www.youtube.com/@FitzAndGauge/videos", { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en-US" } });
    const vhtml = vres.ok ? await vres.text() : "";
    entries.push(...vhtml.split('"videoRenderer":{').slice(1).map((b) => {
      const id = b.match(/"videoId":"([\w-]{11})"/)?.[1];
      const title = b.match(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/)?.[1];
      return { title: title ? JSON.parse(`"${title}"`) : "", url: id ? `https://www.youtube.com/watch?v=${id}` : "" };
    }).filter((e) => e.title && e.url));
    if (!entries.length) tried.push(`Shorts page -> HTTP ${res.status}, no Shorts found`);
  } catch (e) {
    tried.push(`Shorts page -> ${e.message}`);
  }
}
if (!entries.length) {
  console.log(`::warning::Could not read the YouTube feed or Shorts page; keeping the existing video links.%0A${tried.join("%0A")}`);
  process.exit(0);
}

const added = [];
for (const ep of episodes) {
  if (ep.video || videos[ep.slug]) continue;
  // An episode can name its exact YouTube title in "youtubeTitle" if it differs from the site title.
  const want = norm(ep.youtubeTitle || ep.title);
  const hit = entries.find((v) => norm(v.title) === want);
  if (hit?.url) {
    videos[ep.slug] = hit.url;
    added.push(`${ep.slug} -> ${hit.url}`);
  }
}

const sorted = Object.fromEntries(Object.entries(videos).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(VIDEOS, JSON.stringify(sorted, null, 2) + "\n");
console.log(added.length ? `Added ${added.length} video link(s):\n${added.join("\n")}` : `No new videos (feed has ${entries.length} entries).`);
