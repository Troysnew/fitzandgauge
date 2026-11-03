"""Draw the episode thumbnails and the Animals & Nature tile as SVG, in the kit's style (run from repo root):

    python src/draw_art.py

Thick #12243B outlines, flat pastel fills, 320x190 like the kit's topic and episode art. Subjects sit in the middle so
the featured card's square crop still shows them.
"""

import math
from pathlib import Path

OUT = Path(__file__).parent / "art"
INK = "#12243B"
S = f'stroke="{INK}" stroke-width="7"'
S5 = f'stroke="{INK}" stroke-width="5"'
S3 = f'stroke="{INK}" stroke-width="3.5"'
LABEL = 'font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#FFD643" stroke="#12243B" stroke-width="5" paint-order="stroke"'


def svg(body, bg=None, rx=0):
    b = f'<rect width="320" height="190" rx="{rx}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 190" role="img" aria-hidden="true"><g stroke-linecap="round" stroke-linejoin="round">{b}{body}</g></svg>'


def cloud(x, y, s=1):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0 22q-16 0-14-13 2-9 12-9 6-14 19-9 8-12 18-3 10 0 8 14 13 3 11 12-2 8-14 8Z" fill="#fff"/>'


def octagon(r):
    return " ".join(f"{160 + r * math.cos(math.radians(22.5 + 45 * i)):.1f},{80 + r * math.sin(math.radians(22.5 + 45 * i)):.1f}" for i in range(8))


BIRD = (f'<path d="M150 70q-22 4-26 30-2 26 18 38l26 8 6-40q-2-30-24-36Z" fill="#2A3248" {S}/>'
        f'<path d="M154 66q-6-22 14-26 10 4 8 20Z" fill="#E73837" {S5}/>'
        f'<path d="M168 64q-4-10-18-6-12 6-10 18 2 10 16 10Z" fill="#2A3248" {S5}/>'
        f'<path d="M172 70l34 6-34 8Z" fill="#F7AB21" {S5}/><circle cx="160" cy="70" r="5" fill="#fff"/><circle cx="161" cy="70" r="2.4" fill="{INK}"/>'
        f'<path d="M140 104q10 6 20 0M138 120q12 6 24 0" fill="none" stroke="#fff" stroke-width="4"/>'
        f'<path d="M164 146l14 6M170 138l12 8" {S5}/><path d="M138 140l-10 34 16-12" fill="#2A3248" {S5}/>')
TRUNK = (f'<path d="M206 -10h70v210h-70Z" fill="#B57A3C" {S}/><path d="M224 20q8 30 0 60M252 90q8 30 0 60" fill="none" stroke="#8C5A2B" stroke-width="5"/>'
         f'<path d="M276 40q30-20 44-8-12 22-44 18Z" fill="#54B65A" {S5}/>')
ROCKS = [(20, 160, "#AEB7BD"), (48, 150, "#8E989F"), (78, 163, "#AEB7BD"), (106, 148, "#C4C9C0"), (136, 160, "#8E989F"), (166, 150, "#AEB7BD"),
         (196, 162, "#C4C9C0"), (226, 150, "#8E989F"), (256, 160, "#AEB7BD"), (286, 150, "#C4C9C0"), (34, 176, "#8E989F"), (96, 178, "#C4C9C0"),
         (156, 178, "#AEB7BD"), (216, 178, "#8E989F"), (276, 176, "#AEB7BD")]

FILES = {
    # Ep 1: fuselage panel with a big rounded window.
    "episode-airplane-windows.svg": svg(
        f'<rect x="60" y="-10" width="200" height="210" rx="30" fill="#D4D9DC" {S}/>'
        + "".join(f'<circle cx="{x}" cy="{y}" r="5" fill="#AEB7BD" {S3}/>' for x in (82, 238) for y in (25, 70, 115, 160))
        + f'<rect x="108" y="18" width="104" height="154" rx="48" fill="#F1F3F4" {S}/>'
        + f'<rect x="122" y="32" width="76" height="126" rx="36" fill="#7CDBEC" {S5}/>'
        + cloud(136, 92, 1.1) + '<path d="M140 60q10-14 26-16" fill="none" stroke="#fff" stroke-width="8" opacity=".8"/>',
        "#8AD7E2"),
    # Ep 2: layered window panes, red ring on the tiny hole.
    "episode-airplane-window-hole.svg": svg(
        f'<rect x="96" y="14" width="128" height="162" rx="56" fill="#F1F3F4" {S}/>'
        + f'<rect x="112" y="30" width="96" height="130" rx="44" fill="#BDEFF7" {S5}/>'
        + f'<rect x="124" y="42" width="72" height="106" rx="34" fill="#7CDBEC" {S5}/>'
        + cloud(138, 70, .9)
        + f'<circle cx="160" cy="132" r="4" fill="{INK}"/><circle cx="160" cy="132" r="17" fill="none" stroke="#E73837" stroke-width="7"/>'
        + '<path d="M232 158l-52-20M190 128l-10 10 14 3" fill="none" stroke="#E73837" stroke-width="8"/>',
        "#FFDA78"),
    # Ep 3: stop sign on a post, round railroad sign beside it.
    "episode-stop-signs.svg": svg(
        '<path d="M0 150h320v40H0Z" fill="#8AA0AA"/><path d="M0 150h320" stroke="#C4C9C0" stroke-width="10"/>'
        + f'<circle cx="262" cy="74" r="34" fill="#FFD643" {S}/><path d="M240 52l44 44M284 52l-44 44" stroke="{INK}" stroke-width="6"/><path d="M262 108v70" {S}/>'
        + f'<path d="M160 140v48" stroke="#9AA3A8" stroke-width="16"/><path d="M152 140v48M168 140v48" {S5}/>'
        + f'<polygon points="{octagon(62)}" fill="#E73837" {S}/><polygon points="{octagon(50)}" fill="none" stroke="#fff" stroke-width="5"/>'
        + '<text x="160" y="93" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="29" fill="#fff">STOP</text>',
        "#7CDBEC"),
    # Ep 4: a pen with its cap; the hole in the cap circled.
    "episode-pen-caps.svg": svg(
        f'<path d="M40 118l170-52 26 50-170 52Z" fill="#39AA7F" {S}/>'
        + f'<path d="M66 168l-30-4-6-22 10-24" fill="#F5D49C" {S5}/>'
        + f'<path d="M196 70l68-20q14 3 18 18t-6 22l-68 20Z" fill="#2F6FD6" {S}/>'
        + f'<path d="M206 60l70-40" stroke="{INK}" stroke-width="13"/><path d="M206 60l70-40" stroke="#2F6FD6" stroke-width="6"/>'
        + f'<ellipse cx="272" cy="79" rx="5" ry="7" fill="{INK}"/><circle cx="272" cy="79" r="16" fill="none" stroke="#FFC52E" stroke-width="6"/>'
        + '<text x="70" y="70" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="64" fill="#fff" stroke="#12243B" stroke-width="5" paint-order="stroke">?</text>',
        "#DACAF4"),
    # Ep 5: rails and ties on crushed stone.
    "episode-train-track-rocks.svg": svg(
        '<path d="M0 0h320v120H0Z" fill="#7CDBEC"/>' + cloud(40, 30) + cloud(230, 20, .8)
        + f'<path d="M-10 190l30-66h280l30 66Z" fill="#9AA3A8" {S}/>'
        + "".join(f'<path d="M{x} {y}l10-9 12 3 4 10-10 7-14-3Z" fill="{c}" {S3}/>' for x, y, c in ROCKS)
        + "".join(f'<rect x="{x}" y="118" width="26" height="22" rx="4" fill="#B57A3C" {S5}/>' for x in (24, 78, 132, 186, 240, 286))
        + f'<path d="M6 116h314M6 134h314" stroke="{INK}" stroke-width="12"/><path d="M6 116h314M6 134h314" stroke="#D4D9DC" stroke-width="5"/>'),
    # Ep 6: a bridge deck with an expansion joint and a toy car.
    "episode-bridge-gaps.svg": svg(
        '<path d="M0 0h320v96H0Z" fill="#7CDBEC"/>' + cloud(30, 26) + f'<circle cx="270" cy="38" r="20" fill="#FFD643" {S5}/>'
        + f'<path d="M-10 96h170v100H-10Z" fill="#C4C9C0" {S}/><path d="M168 96h162v100H168Z" fill="#C4C9C0" {S}/>'
        + '<path d="M156 92v104M172 92v104" stroke="#9AA3A8" stroke-width="10"/>'
        + "".join(f'<path d="M150 {y}h24" stroke="{INK}" stroke-width="6"/>' for y in range(110, 190, 16))
        + f'<g transform="translate(58 58)"><rect x="0" y="12" width="76" height="26" rx="10" fill="#E73837" {S5}/><path d="M14 12l10-14h28l10 14" fill="#BDEFF7" {S5}/><circle cx="18" cy="40" r="9" fill="#33465A" {S5}/><circle cx="58" cy="40" r="9" fill="#33465A" {S5}/></g>'
        + f'<text x="188" y="80" font-size="19" {LABEL}>KA-THUNK</text>'),
    # Ep 7 (New Topic Tuesday): a woodpecker on a trunk.
    "episode-woodpeckers.svg": svg(
        TRUNK + BIRD + f'<text x="30" y="62" font-size="22" {LABEL}>TOK</text><text x="48" y="108" font-size="22" {LABEL}>TOK</text>',
        "#B5ECCA"),
    # Topic tile: Animals & Nature.
    "topic-animals-nature.svg": svg(
        f'<path d="M30 176q40-34 80 0Z" fill="#54B65A" {S5}/><path d="M276 176q24-24 50 0Z" fill="#54B65A" {S5}/>'
        + f'<path d="M206 0h52v176h-52Z" fill="#B57A3C" {S}/><path d="M222 30q6 24 0 50M244 96q6 24 0 50" fill="none" stroke="#8C5A2B" stroke-width="5"/>'
        + f'<path d="M258 50q30-18 44-6-12 20-44 16Z" fill="#54B65A" {S5}/>'
        + f'<g transform="translate(26 4)">{BIRD}</g>',
        "#C9F0B5", 26),
}

for name, body in FILES.items():
    (OUT / name).write_text(body, encoding="utf8")
    print(f"{name:<36} {len(body):>5} B")
