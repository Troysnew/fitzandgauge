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

const res = await fetch(FEED, { headers: { "User-Agent": "fitzandgauge.com site updater" } });
if (!res.ok) throw new Error(`YouTube feed returned HTTP ${res.status}`);
const xml = await res.text();
const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
  title: decode(e.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""),
  url: e.match(/<link rel="alternate" href="([^"]+)"/)?.[1] ?? "",
}));

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
