// Builds the static site into docs/ (GitHub Pages publishes main:/docs):
//   node src/build.mjs
// Inputs: src/episodes.json (episodes, topics, links, form endpoint), src/sources/<slug>.md (one list item per source:
// "- <url>" then the claim it supports, indented, plus an optional indented "Archive: <web.archive.org url>" line), src/site.css, src/art/*.svg (kit illustrations plus the episode art
// from src/draw_art.py) and the web images in site/img (python src/compress_images.py). The layout follows the approved
// mockup in src/mockup-approved.png. All links are relative, so the site works both at
// https://fitzandgauge.github.io/website/ and at https://fitzandgauge.com/.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs");
const DOMAIN = "fitzandgauge.com";
const SITE_URL = `https://${DOMAIN}/`;
const data = JSON.parse(readFileSync(path.join(ROOT, "src/episodes.json"), "utf8").replace(/^﻿/, ""));
const { channel, categories, episodes, form } = data;
// YouTube links found by src/update_videos.mjs (run daily by the GitHub Action) fill in any episode without a "video".
const VIDEOS_FILE = path.join(ROOT, "src/videos.json");
const foundVideos = existsSync(VIDEOS_FILE) ? JSON.parse(readFileSync(VIDEOS_FILE, "utf8")) : {};
for (const ep of episodes) if (!ep.video && foundVideos[ep.slug]) ep.video = foundVideos[ep.slug];
const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

// Version tag for styles.css and app.js: changes whenever either file changes, so browsers fetch the new copy instead of
// pairing a cached old stylesheet with new images.
const ASSET_VERSION = createHash("sha256")
  .update(readFileSync(path.join(ROOT, "src/site.css")))
  .update(readFileSync(path.join(ROOT, "src/app.js")))
  .digest("hex")
  .slice(0, 10);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ext = 'target="_blank" rel="noopener"';

// ---------------------------------------------------------------- sources

const readSources = (slug) => {
  const file = path.join(ROOT, "src/sources", `${slug}.md`);
  if (!existsSync(file)) return [];
  const out = [];
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const item = line.match(/^- (https?:\/\/\S+)\s*$/);
    const archive = line.match(/^\s{2,}Archive: (https?:\/\/\S+)\s*$/); // Internet Archive backup copy of the source above
    if (item) out.push({ url: item[1], claim: "" });
    else if (archive && out.length) out[out.length - 1].archive = archive[1];
    else if (out.length && /^\s{2,}\S/.test(line)) out[out.length - 1].claim += (out[out.length - 1].claim ? " " : "") + line.trim();
    else if (out.length && line.trim() === "") continue;
    else if (out.length && !/^\s/.test(line)) break; // anything after the list (internal notes) is not published
  }
  return out;
};

// ---------------------------------------------------------------- episodes: what's latest

// The featured "Latest Mystery" is the newest episode that is actually out, meaning it has a video link; before the
// first one it is the next one coming up. Going by the premiere date alone would show an episode as out before it posts,
// so each episode's YouTube link is added when it goes live: by hand in episodes.json, or automatically in videos.json.
const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
// Change this by hand whenever the privacy text changes (a build date would change every day the Action runs).
const PRIVACY_UPDATED = "2026-11-07";
const byDate = [...episodes].sort((a, b) => a.premiere.localeCompare(b.premiere));
const released = byDate.filter((e) => e.video);
const featured = released.at(-1) || byDate[0];
const others = byDate.filter((e) => e !== featured);
// The grid shows only episodes that are out (newest first). Upcoming ones get a short "Coming this week" strip, and their
// pages stay out of search until the video exists (noindex, not in the sitemap).
const gridEps = released.filter((e) => e !== featured).reverse();
const soonEps = byDate.filter((e) => !e.video && e !== featured).slice(0, 5);
const isUpcoming = (ep) => !ep.video;
const watchLabel = (ep) => (ep.video ? "Watch the Mystery" : isUpcoming(ep) ? `Premieres ${esc(ep.premiereLabel)}` : "Watch on YouTube");
const watchHref = (ep) => ep.video || channel.youtube;
const watchAria = (ep) => esc(ep.video ? `Watch ${ep.title} on YouTube` : isUpcoming(ep) ? `${ep.title} premieres ${ep.premiereLabel} on YouTube` : `${ep.title} on the Fitz & Gauge YouTube channel`);

// ---------------------------------------------------------------- shared pieces

const ICON = {
  youtube: `<svg class="yt" viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="5" width="21" height="14" rx="4.5" fill="#E93132"/><path d="M10 9l5.5 3-5.5 3z" fill="#fff"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="17.3" cy="6.7" r="1.3" fill="currentColor"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.5 3c.4 2.4 2 4 4.5 4.2v3.5c-1.7 0-3.2-.5-4.5-1.4v6.2a6 6 0 1 1-6-6c.3 0 .7 0 1 .1v3.6a2.5 2.5 0 1 0 1.5 2.3V3z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v6h4v-6h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8z"/></svg>`,
  ask: `<span class="ask-q" aria-hidden="true">?</span>`,
  play: `<span class="play-glyph" aria-hidden="true">▶</span>`,
  arrow: `<svg class="hand-arrow" viewBox="0 0 80 40" aria-hidden="true"><path d="M4 22c10-14 22-14 28-2s16 14 28 0" fill="none" stroke="#F0B914" stroke-width="6" stroke-linecap="round"/><path d="M52 12l11 8-12 6" fill="none" stroke="#F0B914" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};
const gear = (prefix) => `<img class="heading-gear" src="${prefix}img/icon-gear-96.webp" srcset="${prefix}img/icon-gear-96.webp 96w, ${prefix}img/icon-gear-192.webp 192w" sizes="(min-width: 2200px) 72px, 48px" width="96" height="96" alt="" aria-hidden="true" />`;
const rays = (prefix, cls) => `<img class="${cls}" src="${prefix}img/art/decor-rays.svg" alt="" aria-hidden="true" width="320" height="190" />`;
const social = [
  ["YouTube", channel.youtube, ICON.youtube],
  ["Instagram", channel.instagram, ICON.instagram],
  ["TikTok", channel.tiktok, ICON.tiktok],
  ["Facebook", channel.facebook, ICON.facebook],
];

const head = ({ title, description, prefix, canonical, noindex, image, ld }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />${noindex ? '\n<meta name="robots" content="noindex" />' : ""}
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${SITE_URL}${canonical}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Fitz &amp; Gauge" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${SITE_URL}${canonical}" />
<meta property="og:image" content="${SITE_URL}img/${image || "share.jpg"}" />${ld ? `\n<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : ""}
<meta name="twitter:card" content="summary_large_image" />
<meta name="theme-color" content="#2E7F86" />
<link rel="icon" type="image/png" href="${prefix}img/favicon.png" />
<link rel="apple-touch-icon" href="${prefix}img/apple-touch-icon.png" />
<link rel="preload" href="${prefix}fonts/fredoka-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="${prefix}styles.css?v=${ASSET_VERSION}" />
<script data-goatcounter="https://fitzandgauge.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</head>
<body>`;

const logo = (prefix) =>
  `<img src="${prefix}img/logo-420.webp" srcset="${prefix}img/logo-420.webp 420w, ${prefix}img/logo-800.webp 800w" sizes="(min-width: 2200px) 385px, 280px" width="420" height="140" alt="Fitz &amp; Gauge" />`;

const header = (prefix, page) => {
  const h = (hash) => (page === "home" ? hash : `${prefix}index.html${hash}`);
  const nav = [["Home", h("#home")], ["Case Files", h("#case-files")], ["Mysteries", h("#mysteries")], ["Topics", h("#topics")], ["About", h("#about")]];
  return `<header class="site-header"><div class="header-inner wrap">
<a class="brand" href="${prefix}index.html" aria-label="Fitz and Gauge home">${logo(prefix)}${rays(prefix, "brand-rays")}</a>
<button type="button" class="menu-toggle" id="menuBtn" aria-label="Open menu" aria-expanded="false" aria-controls="nav"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button>
<nav class="site-nav" id="nav" aria-label="Primary navigation">${nav.map(([label, href], i) => `<a${page === "home" && i === 0 ? ' class="active" aria-current="page"' : ""} href="${href}">${label}</a>`).join("")}<a class="sub-nav" href="${channel.subscribe}" ${ext}>${ICON.youtube} Subscribe</a><a class="ask-nav" href="${h("#ask")}">${ICON.ask} Suggest a Topic</a></nav>
</div></header>`;
};

const footer = (prefix, page) => {
  const h = (hash) => (page === "home" ? hash : `${prefix}index.html${hash}`);
  return `<footer class="site-footer"><div class="wrap footer-inner">
<a class="footer-logo" href="${prefix}index.html" aria-label="Fitz and Gauge home">${logo(prefix)}</a>
<p class="footer-tag">The obvious fix, and why engineers didn&#39;t use it.</p>
<div class="social-links">${social.map(([name, href, icon]) => `<a href="${href}" ${ext} aria-label="Fitz &amp; Gauge on ${name}">${icon}<span>${name}</span></a>`).join("")}</div>
<nav aria-label="Footer navigation"><a href="${h("#home")}">Home</a><a href="${h("#case-files")}">Case Files</a><a href="${h("#mysteries")}">Mysteries</a><a href="${h("#topics")}">Topics</a><a href="${h("#about")}">About</a><a href="${prefix}privacy.html">Privacy</a></nav>
</div><div class="wrap footer-small">© 2026 Fitz &amp; Gauge · @fitzandgauge everywhere</div></footer>
<script src="${prefix}app.js?v=${ASSET_VERSION}" defer></script>
</body>
</html>
`;
};

const shortsLabel = (prefix) => `<span class="shorts-label"><img src="${prefix}img/art/decor-shorts-icon.svg" alt="" aria-hidden="true" width="46" height="60" />Shorts</span>`;
// Long-form deep dives ("format": "long", "caseNo" in episodes.json) get the red CASE FILE badge from their YouTube
// thumbnails instead of the Shorts label.
const isCase = (ep) => ep.format === "long";
const caseName = (ep) => `Case File${ep.caseNo ? ` #${ep.caseNo}` : ""}`;
const caseBadge = (ep) => `<span class="case-badge">${caseName(ep)}</span>`;
const formatLabel = (ep, prefix) => (isCase(ep) ? caseBadge(ep) : shortsLabel(prefix));
// Episode art: an SVG from src/art, or a raster thumbnail ("ep-<slug>", made by compress_images.py at 640 and 1280 wide).
const epArt = (ep, prefix = "") =>
  ep.art.endsWith(".svg")
    ? `<img class="art" src="${prefix}img/art/${ep.art}" alt="" width="320" height="190" loading="lazy" />`
    : `<img class="art" src="${prefix}img/${ep.art}-640.webp" srcset="${prefix}img/${ep.art}-640.webp 640w, ${prefix}img/${ep.art}-1280.webp 1280w" sizes="(min-width: 2200px) 800px, (max-width: 680px) 92vw, 33vw" alt="" width="1672" height="941" loading="lazy" />`;
const metaLine = (ep) => `${isCase(ep) ? `${caseName(ep)} · ` : ""}${esc(catById[ep.category].title)} · ${ep.length ? esc(ep.length) : esc(ep.premiereLabel)}`;

// ---------------------------------------------------------------- home page

const heroHtml = `<section class="hero" aria-labelledby="hero-title"><div class="hero-overlay"></div><div class="wrap hero-inner">
<img class="hero-fitz" src="img/fitz-400.webp" srcset="img/fitz-400.webp 400w, img/fitz-776.webp 772w" sizes="(min-width: 2200px) 440px, (max-width: 680px) 200px, 18vw" width="772" height="1350" alt="Fitz, the cheerful orange-haired inventor, pointing up with an idea" fetchpriority="high" />
<div class="hero-copy"><h1 id="hero-title"><span>Why is the world</span><strong>built like this?</strong></h1><p class="ribbon">The obvious fix, and why engineers didn&#39;t use it.</p>
<div class="hero-actions"><a href="${watchHref(featured)}" ${ext} class="button button-red">${ICON.play} Watch the Latest</a><a href="#mysteries" class="button button-mint"><span aria-hidden="true">⚙</span> Explore Mysteries</a></div></div>
<img class="hero-gauge" src="img/gauge-520.webp" srcset="img/gauge-520.webp 520w, img/gauge-1054.webp 923w" sizes="(min-width: 2200px) 480px, (max-width: 680px) 170px, 20vw" width="923" height="1193" alt="Gauge, the friendly mint-green robot, waving" fetchpriority="high" />
</div><div class="hero-wave" aria-hidden="true"></div></section>`;

const latestHtml = (ep) => `<section id="latest" class="latest-section paper" aria-labelledby="latest-heading"><div class="wrap latest-layout">
<div class="section-intro"><span class="rays" aria-hidden="true">✧</span><h2 id="latest-heading">Latest Mystery</h2><div class="drawn-underline"></div><p>The newest case: the obvious fix, and the real reason it doesn&#39;t work.</p>${ICON.arrow}</div>
<article class="feature-card"><a class="feature-visual" href="${watchHref(ep)}" ${ext} aria-label="${watchAria(ep)}">${epArt(ep)}${formatLabel(ep, "")}<img class="play-badge" src="img/art/decor-play.svg" alt="" aria-hidden="true" width="320" height="190" />${ep.length ? `<span class="length">${esc(ep.length)}</span>` : ""}</a>
<div class="feature-copy"><span class="meta">${metaLine(ep)}</span><h3>${esc(ep.title)}</h3><p>${esc(ep.summary)}</p><div class="card-actions"><a class="button button-red smaller" href="${watchHref(ep)}" ${ext}>${ICON.play} ${watchLabel(ep)}</a><a class="text-link" href="episodes/${ep.slug}.html">Sources &amp; facts</a></div></div>
${rays("", "corner-rays")}</article>
</div></section>`;

const topicLabel = (c) => esc(c.title).replace(" &amp; ", " &amp; <br />").replace(/^(Everyday|City) /, "$1 <br />");
const topicsHtml = `<section class="topics-section" id="topics" aria-labelledby="topics-heading"><div class="wrap">
<div class="section-heading"><h2 id="topics-heading">${gear("")} Explore the Workshop ${rays("", "heading-rays")}</h2><p>Pick a topic, follow your curiosity, and see how the world works!</p></div>
<div class="topic-grid">
${categories.map((c) => `<a class="topic-card c-${c.color}${c.kicker ? " wide" : ""}" href="#mysteries" data-topic="${c.id}"><img class="topic-art" src="img/${c.art}-1086.webp" srcset="img/${c.art}-1086.webp 1086w, img/${c.art}-2172.webp 2172w" sizes="${c.kicker ? "(min-width: 2200px) 2650px, 92vw" : "(min-width: 2200px) 870px, (max-width: 680px) 46vw, 31vw"}" alt="" width="2172" height="724" loading="lazy" /><span class="topic-name">${topicLabel(c)}</span>${c.kicker ? `<span class="topic-badge"><span aria-hidden="true">📅</span> ${esc(c.kicker)}</span>` : ""}</a>`).join("\n")}
</div></div></section>`;

// Case Files shelf: every deep dive, newest first, as wide cards. They also stay in the Mysteries grid (with the
// "Case Files" chip), so the grid remains the full archive.
const caseEps = [...byDate.filter((e) => isCase(e) && e.video).reverse(), ...byDate.filter((e) => isCase(e) && !e.video).slice(0, 1)];
// The thumbnails carry their own headline and CASE FILE badge, so the shelf keeps the image clear and puts the badges
// in a row underneath.
const caseSummary = (ep) => ep.summary.replace(/^Case Files: (.)/, (_, c) => c.toUpperCase());
const caseCard = (ep) => `<article class="case-card"><a class="case-thumb" href="${watchHref(ep)}" ${ext} aria-label="${watchAria(ep)}">${epArt(ep)}</a>
<div class="case-copy"><div class="case-tags"><span class="case-badge">${caseName(ep)}</span>${isUpcoming(ep) ? `<span class="tag-soon">Coming soon · ${esc(ep.premiereLabel)}</span>` : ""}<span class="meta">${esc(catById[ep.category].title)}${ep.length ? ` · ${esc(ep.length)}` : ""}</span></div><h3>${esc(ep.title)}</h3><p>${esc(caseSummary(ep))}</p><div class="card-actions"><a class="button button-red smaller" href="${watchHref(ep)}" ${ext}>${ICON.play} ${watchLabel(ep)}</a><a class="text-link" href="episodes/${ep.slug}.html">Sources &amp; facts</a></div></div></article>`;
const caseFilesHtml = caseEps.length
  ? `<section id="case-files" class="case-section" aria-labelledby="case-heading"><div class="wrap">
<div class="case-heading"><span class="case-badge big">Case Files</span><h2 id="case-heading">Deep-dive investigations</h2><p>One big mystery, solved clue by clue. New Case Files every Sunday at 10 AM ET.</p></div>
<div class="case-cards">
${caseEps.map(caseCard).join("\n")}
</div></div></section>`
  : "";

const card = (ep) => `<article class="mystery-card${isCase(ep) ? " is-case" : ""}" data-category="${ep.category}" data-format="${isCase(ep) ? "long" : "short"}" data-title="${esc(ep.title)}"><a class="thumb" href="${watchHref(ep)}" ${ext} aria-label="${watchAria(ep)}">${epArt(ep)}${formatLabel(ep, "")}${isUpcoming(ep) ? `<span class="soon-badge">Coming soon</span><span class="date-badge">${esc(ep.premiereLabel)}</span>` : ""}</a><h3>${esc(ep.title)}</h3><p class="card-summary">${esc(isCase(ep) ? caseSummary(ep) : ep.summary)}</p><div class="card-foot"><span class="meta">${esc(catById[ep.category].title)}</span><a class="text-link" href="episodes/${ep.slug}.html">Sources</a></div></article>`;

const soonCard = (ep) => `<li class="soon-card${isCase(ep) ? " is-case" : ""}"><a href="${channel.subscribe}" ${ext} aria-label="${esc(`${ep.title} premieres ${ep.premiereLabel}. Subscribe on YouTube`)}">${epArt(ep)}<span class="soon-date">${isCase(ep) ? `${caseName(ep)} · ` : ""}${esc(ep.premiereLabel)}</span><span class="soon-title">${esc(ep.title)}</span></a></li>`;
const soonHtml = soonEps.length
  ? `<section id="coming" class="soon-section" aria-labelledby="soon-heading"><div class="wrap">
<div class="soon-heading"><h2 id="soon-heading">Coming this week</h2><p>New Shorts every day at 3 PM ET.</p></div>
<ul class="soon-cards">
${soonEps.map(soonCard).join("\n")}
</ul></div></section>`
  : "";

const usedCats = categories.filter((c) => gridEps.some((e) => e.category === c.id));
const mysteriesHtml = `<section id="mysteries" class="mysteries-section paper" aria-labelledby="mysteries-heading"><div class="wrap mysteries-layout">
<div class="mysteries-lead"><span class="rays" aria-hidden="true">✴</span><h2 id="mysteries-heading">More <br />Mysteries</h2><p>More everyday things with surprising reasons behind them.</p><a class="pill-link" href="${channel.youtube}/shorts" ${ext}>See All Mysteries →</a></div>
<div class="mysteries-main">${
  gridEps.length
    ? `<div class="rails"><div class="chips" role="group" aria-label="Filter by topic"><button type="button" class="chip active" data-filter="all">All</button>${gridEps.some(isCase) ? `<button type="button" class="chip chip-case" data-filter="case-files"><span aria-hidden="true">🕵️</span> Case Files</button>` : ""}${usedCats.map((c) => `<button type="button" class="chip" data-filter="${c.id}">${esc(c.title)}</button>`).join("")}</div><label class="search"><span class="sr-only">Search mysteries</span><input id="search" type="search" placeholder="Find a mystery…" /></label></div>
<div class="mystery-cards" id="cards">
${gridEps.map(card).join("\n")}
</div><p class="filter-status" id="filterStatus" aria-live="polite"></p>`
    : `<div class="empty-card"><strong>More mysteries are on the way.</strong> <a class="button button-red smaller" href="${channel.subscribe}" ${ext}>${ICON.youtube} Subscribe</a></div>`
}</div>
</div></section>`;

const factsHtml = `<section id="facts" class="facts-section" aria-labelledby="facts-heading"><div class="wrap">
<div class="section-heading"><h2 id="facts-heading">${gear("")} How We Check Our Facts</h2><p>Fitz and Gauge are cartoons, but the answers aren't made up.</p></div>
<div class="fact-cards">
<div class="fact-card"><span class="num n1">1</span><h3>One real question</h3><p>Every episode starts from something you can actually see in the world, and answers just that.</p></div>
<div class="fact-card"><span class="num n2">2</span><h3>Checked against reliable sources</h3><p>Government agencies, universities, manufacturers and peer-reviewed research. The gags can be silly; the facts can't.</p></div>
<div class="fact-card"><span class="num n3">3</span><h3>Sources you can check</h3><p>Every episode lists its sources, each with the claim it supports. Start with the <a class="text-link" href="episodes/${featured.slug}.html">latest mystery's sources</a>.</p></div>
</div></div></section>`;

const meetHtml = `<section id="about" class="meet-section" aria-labelledby="meet-heading"><div class="wrap meet-layout">
<div class="meet-lead"><h2 id="meet-heading">Meet <br />Fitz &amp; Gauge</h2><div class="drawn-underline"></div></div>
<div class="bio"><div class="portrait fitz-portrait"><img src="img/fitz-400.webp" width="772" height="1350" alt="Fitz" loading="lazy" /></div><div><h3>Fitz</h3><span class="bio-label yellow">The Inventor Who Knows Why</span><p>Fitz is a young inventor who has taken apart enough of the world to know why it&#39;s built the way it is. When Gauge pitches the obvious fix, Fitz is the one who stops him and explains what the engineers knew.</p></div></div>
<div class="bio"><div class="portrait gauge-portrait"><img src="img/gauge-520.webp" width="923" height="1193" alt="Gauge" loading="lazy" /></div><div><h3>Gauge</h3><span class="bio-label green">The Robot With the Obvious Fix</span><p>Gauge is the robot Fitz built, and he&#39;s curious about everything. He&#39;s always first with the obvious fix (seal it, sand it, paint it plain) and first to ask why it won&#39;t work. When the real answer turns up, he&#39;s the most excited one in the room.</p></div></div>
</div></section>`;

const formOpen = Boolean(form.endpoint);
const askHtml = `<section id="ask" class="ask-section" aria-labelledby="ask-heading"><div class="wrap ask-layout">
<img class="ask-decor" src="img/icon-gear-books-220.webp" srcset="img/icon-gear-books-220.webp 220w, img/icon-gear-books-440.webp 440w" sizes="(min-width: 2200px) 190px, 130px" width="440" height="346" alt="" aria-hidden="true" />
<h2 id="ask-heading">Ask a <br />Question</h2>
${formOpen ? `<form id="askForm" ${formOpen ? `action="${esc(form.endpoint)}" method="POST"` : ""} data-open="${formOpen}"><label for="question">What should Fitz &amp; Gauge investigate next?</label>
<div class="question-input-row"><input id="question" name="question" type="text" maxlength="300" autocomplete="off" placeholder="Type your question here…" required /><button class="button button-red" type="submit"${formOpen ? "" : " disabled"}>➤ Send Question</button></div>
<p class="ask-note">Please don't include your name or any personal information.</p>
<p class="form-status">${formOpen ? "" : "The question mailbox opens soon. "}We only collect your question. <a href="privacy.html">Privacy</a></p>
<p class="ask-thanks" id="askThanks" hidden>Thanks! Your question is on its way to the workshop.</p></form>` : `<div class="ask-closed"><p class="ask-lead">What should Fitz &amp; Gauge investigate next?</p><p>The question mailbox isn&#39;t open yet. Until it is, comment your question on our latest Short. We read every one.</p><a class="button button-red" href="${esc(featured.video || channel.youtube + "/shorts")}" ${ext}>Comment on the latest Short</a></div>`}
<img class="ask-decor pencil-decor" src="img/icon-pencil-cup-220.webp" srcset="img/icon-pencil-cup-220.webp 220w, img/icon-pencil-cup-440.webp 440w" sizes="(min-width: 2200px) 150px, 100px" width="440" height="604" alt="" aria-hidden="true" />
</div></section>`;

const indexHtml = `${head({
  title: "Fitz & Gauge | Why is the world built like this?",
  description: "Why is the world built like this? The obvious fix, and why engineers didn't use it: short cartoon investigations into the engineering hiding in everyday life, with every source listed.",
  prefix: "",
  canonical: "",
  ld: { "@context": "https://schema.org", "@type": "Organization", name: "Fitz & Gauge", url: SITE_URL, logo: `${SITE_URL}img/apple-touch-icon.png`, sameAs: [channel.youtube, channel.tiktok, channel.instagram, channel.facebook] },
})}
${header("", "home")}
<main id="home">
${heroHtml}
${latestHtml(featured)}
${caseFilesHtml}
${soonHtml}
${topicsHtml}
${mysteriesHtml}
${factsHtml}
${meetHtml}
${askHtml}
</main>
${footer("", "home")}`;

// ---------------------------------------------------------------- sub-pages

const subHero = ({ prefix, back, backLabel, kicker, title, text, actions = "" }) =>
  `<section class="sub-hero" style="background-image:url('${prefix}img/workshop-1920.webp')"><div class="hero-overlay"></div><div class="wrap sub-hero-inner">${back ? `<a class="back" href="${back}">← ${backLabel}</a>` : ""}<p class="ribbon">${kicker}</p><h1>${title}</h1><p class="sub-text">${text}</p>${actions ? `<div class="hero-actions left">${actions}</div>` : ""}</div><div class="hero-wave" aria-hidden="true"></div></section>`;

// Transcripts are the fact-checked scripts, word for word (src/transcripts/<slug>.json, made by sync_transcripts.py).
const readTranscript = (slug) => {
  const f = path.join(ROOT, "src/transcripts", `${slug}.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : [];
};
const isoDuration = (len = "") => {
  const m = String(len).match(/(\d+)\s*(sec|min)/);
  return m ? (m[2] === "min" ? `PT${m[1]}M` : `PT${m[1]}S`) : undefined;
};
const ogImage = (ep) => (existsSync(path.join(ROOT, "site/img", `og-${ep.slug}.jpg`)) ? `og-${ep.slug}.jpg` : undefined);
const related = (ep) => {
  const pool = released.filter((e) => e !== ep);
  return [...pool.filter((e) => e.category === ep.category), ...pool.filter((e) => e.category !== ep.category)].slice(0, 3);
};
const episodePage = (ep) => {
  const sources = readSources(ep.slug);
  const list = sources.length
    ? `<ol class="source-list">${sources.map((s) => `<li><p>${esc(s.claim)}</p><a class="text-link" href="${esc(s.url)}" ${ext}>${esc(new URL(s.url).hostname.replace(/^www\./, ""))} ↗</a>${s.archive ? `<span class="archive"> · <a class="text-link" href="${esc(s.archive)}" ${ext}>Archived copy ↗</a></span>` : ""}</li>`).join("")}</ol>`
    : `<p class="muted">Sources for this episode will be listed here when it premieres.</p>`;
  // Click-to-play player (never autoplay: YouTube only counts plays started with its own play button).
  // youtube-nocookie.com sets no YouTube cookies until the viewer presses play.
  const vid = ep.video && ep.video.match(/(?:shorts\/|v=|youtu\.be\/)([\w-]{11})/)?.[1];
  const player = vid
    ? `<section class="player-section" id="watch"><div class="wrap"><div class="player ${ep.format === "long" ? "wide" : "tall"}"><iframe src="https://www.youtube-nocookie.com/embed/${vid}?rel=0" title="${esc(ep.title)} (YouTube video)" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div></div></section>`
    : "";
  const lines = vid ? readTranscript(ep.slug) : [];
  const transcriptHtml = lines.length
    ? `<section class="sub-body transcript-section" id="transcript"><div class="wrap narrow"><div class="section-heading"><h2>${gear("../")} Transcript</h2></div><p class="sub-intro">Every word of the episode, exactly as it was fact-checked.</p><dl class="transcript">${lines.map((l) => `<dt class="${l.speaker === "gauge" ? "gauge" : "fitz"}">${l.speaker === "gauge" ? "Gauge" : "Fitz"}</dt><dd>${esc(l.text)}</dd>`).join("")}</dl></div></section>`
    : "";
  const rel = vid ? related(ep) : [];
  const relatedHtml = rel.length
    ? `<section class="paper sub-body related-section"><div class="wrap narrow"><div class="section-heading"><h2>${gear("../")} More cases like this</h2></div><ul class="related-cards">${rel.map((r) => `<li><a href="${r.slug}.html">${epArt(r, "../")}<span>${esc(r.title)}</span></a></li>`).join("")}</ul></div></section>`
    : "";
  return `${head({
    title: `${ep.title} | Fitz & Gauge`,
    description: `${ep.summary} Sources and facts for this Fitz & Gauge episode.`,
    prefix: "../",
    canonical: `episodes/${ep.slug}.html`,
    noindex: !ep.video,
    image: ogImage(ep),
    ld: vid
      ? {
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: ep.title,
          description: ep.summary,
          thumbnailUrl: [`${SITE_URL}img/${ogImage(ep) || "share.jpg"}`],
          uploadDate: ep.premiere,
          duration: isoDuration(ep.length),
          embedUrl: `https://www.youtube.com/embed/${vid}`,
          contentUrl: ep.video,
          publisher: { "@type": "Organization", name: "Fitz & Gauge", url: SITE_URL },
        }
      : undefined,
  })}
${header("../", "sub")}
<main id="home" class="subpage">
${subHero({
  prefix: "../",
  back: "../index.html#mysteries",
  backLabel: "All mysteries",
  kicker: metaLine(ep),
  title: esc(ep.title),
  text: esc(ep.summary),
  actions: `<a class="button button-red" href="${vid ? "#watch" : watchHref(ep)}"${vid ? "" : ` ${ext}`}>${ICON.play} ${vid ? "Watch it here" : watchLabel(ep)}</a><a class="button button-white" href="${channel.subscribe}" ${ext}>${ICON.youtube} Subscribe</a>`,
})}
${player}
<section class="paper sub-body"><div class="wrap narrow"><div class="section-heading"><h2>${gear("../")} Where this answer comes from</h2></div><p class="sub-intro">Each source below supports one claim in the episode. Links open the original pages.</p>${list}<div class="callout"><h3>How we check our facts</h3><p>Every episode answers one real question, checked against reliable sources: government agencies, universities, museums, manufacturers, standards bodies, peer-reviewed research, and reputable journalism that quotes experts. Every claim is listed with its source. Spotted a mistake? <a class="text-link" href="${channel.facebook}" ${ext}>Tell us on Facebook</a> and we&#39;ll fix it and say so on this page. <a class="text-link" href="../index.html#facts">More about our process</a></p></div></div></section>
${transcriptHtml}${relatedHtml}
</main>
${footer("../", "sub")}`;
};

const service = form.service ? esc(form.service) : "a form-delivery service";
const privacyHtml = `${head({ title: "Privacy | Fitz & Gauge", description: "What the Fitz & Gauge website collects (only the question you send) and how we use it.", prefix: "", canonical: "privacy.html" })}
${header("", "sub")}
<main id="home" class="subpage">
${subHero({ prefix: "", back: "index.html", backLabel: "Back to the workshop", kicker: "Privacy", title: "We only collect your question.", text: "Short version: the question form asks for one thing, your question. No names, no emails, no accounts, no cookies." })}
<section class="paper sub-body"><div class="wrap narrow"><div class="prose">
<h2>What we collect</h2>
<p>When you use the question form, we receive <strong>only the text of your question</strong>. The form doesn't ask for your name, email address, age, location or anything else about you. Please don't include personal information in your question. If a question does include any, we won't use it and we delete it.</p>
<p>This website doesn't use cookies or ads. Its fonts and images are served from this site, not from third parties.</p>
<h2>Visitor counts</h2>
<p>We count visits with <a href="https://www.goatcounter.com" ${ext}>GoatCounter</a>, a privacy-friendly analytics service, so we know which episodes people read. It doesn't use cookies and doesn't follow you across other sites. It records things like which page was viewed, the site you came from, your browser and screen size, and your approximate country; it doesn't store your IP address. See <a href="https://www.goatcounter.com/help/privacy" ${ext}>GoatCounter's privacy policy</a>.</p>
<h2>How we use questions</h2>
<p>We read questions to choose and research future episodes. We may feature a question in an episode or on this website, <strong>always without any name</strong>. We don't sell or share questions with anyone else.</p>
<h2>How questions reach us</h2>
<p>Because this is a simple static website, questions are delivered to our inbox by ${service}. That service handles the delivery and may keep submissions for a limited time under its own privacy policy. We keep questions only as long as we need them for planning episodes.</p>
<h2>Hosting and links</h2>
<p>This site is hosted on GitHub Pages. Like most web hosts, GitHub may log basic technical information (such as IP addresses) to keep the service secure; see the <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" ${ext}>GitHub Privacy Statement</a>. Links to YouTube, Instagram, TikTok and Facebook take you to those sites, where their own privacy policies apply.</p>
<p>Episode pages include a YouTube video player. It uses YouTube's privacy-enhanced mode (youtube-nocookie.com) and never plays on its own. When you press play, the video is streamed by YouTube, and <a href="https://policies.google.com/privacy" ${ext}>Google's Privacy Policy</a> applies to that viewing.</p>
<h2>Who this site is for</h2>
<p>Fitz &amp; Gauge is made for curious teens and adults, and isn&#39;t directed at children under 13. The form is designed so that nobody needs to share personal information to send a question.</p>
<h2>Questions about this page</h2>
<p>Message us on <a href="${channel.facebook}" ${ext}>our Facebook page</a>.</p>
<p class="muted">Last updated ${PRIVACY_UPDATED}.</p>
</div></div></section>
</main>
${footer("", "sub")}`;

const notFoundHtml = `${head({ title: "Not found | Fitz & Gauge", description: "This page wandered off.", prefix: "/", canonical: "404.html" })}
<main id="home" class="subpage">${subHero({ prefix: "/", kicker: "404", title: "This page wandered off.", text: "Even Gauge can't find it.", actions: `<a class="button button-red" href="/">Back to the workshop</a>` })}</main>
</body></html>
`;

// ---------------------------------------------------------------- CSS

const fonts = [["Fredoka", "fredoka", [500, 600, 700]], ["Nunito", "nunito", [400, 700, 800, 900]]];
const fontFaces = fonts
  .flatMap(([family, file, weights]) => weights.map((w) => `@font-face{font-family:'${family}';font-style:normal;font-weight:${w};font-display:swap;src:url('fonts/${file}-latin-${w}-normal.woff2') format('woff2')}`))
  .join("\n");
const stylesCss = `${fontFaces}\n${readFileSync(path.join(ROOT, "src/site.css"), "utf8")}`;

// ---------------------------------------------------------------- write

rmSync(OUT, { recursive: true, force: true });
for (const d of ["episodes", "img/art", "fonts"]) mkdirSync(path.join(OUT, d), { recursive: true });
writeFileSync(path.join(OUT, "index.html"), indexHtml);
for (const ep of episodes) writeFileSync(path.join(OUT, "episodes", `${ep.slug}.html`), episodePage(ep));
writeFileSync(path.join(OUT, "privacy.html"), privacyHtml);
writeFileSync(path.join(OUT, "404.html"), notFoundHtml);
writeFileSync(path.join(OUT, "styles.css"), stylesCss);
copyFileSync(path.join(ROOT, "src/app.js"), path.join(OUT, "app.js"));
for (const f of readdirSync(path.join(ROOT, "site/img"))) copyFileSync(path.join(ROOT, "site/img", f), path.join(OUT, "img", f));
for (const f of readdirSync(path.join(ROOT, "src/art"))) copyFileSync(path.join(ROOT, "src/art", f), path.join(OUT, "img/art", f));
// Episode videos are never published with the site (the repo is public). They reach Metricool through Google Drive.
for (const [, pkg, weights] of fonts) {
  for (const w of weights) {
    const name = `${pkg}-latin-${w}-normal.woff2`;
    copyFileSync(path.join(ROOT, "node_modules/@fontsource", pkg, "files", name), path.join(OUT, "fonts", name));
  }
}
writeFileSync(path.join(OUT, "CNAME"), `${DOMAIN}\n`);
writeFileSync(path.join(OUT, ".nojekyll"), "");
writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);
const urls = ["", "privacy.html", ...episodes.filter((e) => e.video).map((e) => `episodes/${e.slug}.html`)];
writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log(`built ${OUT}: index, ${episodes.length} episode pages, privacy, 404 · latest: ${featured.slug} · ${others.length} more · form ${formOpen ? "open" : "not connected yet"}`);
