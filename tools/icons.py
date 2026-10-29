"""Draws Open Tracker's app icons (a water drop over two waves) at every size the web app needs."""
import math, sys, pathlib
from PIL import Image, ImageDraw

TEAL, WHITE = (10, 104, 115, 255), (255, 255, 255, 255)

def mark(d, s, pad, fg):
    """drop + waves inside a square of side s, inset by pad"""
    w = s - 2 * pad
    cx, top = s / 2, pad + w * 0.10
    r = w * 0.24
    cy = pad + w * 0.50
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fg)
    D = cy - top                                   # apex to centre; sides meet the circle at its tangent points
    a = math.acos(r / D)
    tx, ty = r * math.sin(a), cy - r * math.cos(a)
    d.polygon([(cx, top), (cx - tx, ty), (cx + tx, ty)], fill=fg)
    lw = max(2, int(w * 0.055))
    for k, y in enumerate((pad + w * 0.82, pad + w * 0.94)):
        if k and w < 60: break
        pts = []
        for i in range(41):
            x = pad + w * 0.10 + w * 0.80 * i / 40
            pts.append((x, y + w * 0.035 * math.sin(i / 40 * 4 * 3.14159)))
        d.line(pts, fill=fg, width=lw, joint="curve")

def icon(size, maskable=False, mono=False):
    big = size * 4
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if mono:
        mark(d, big, big * 0.08, WHITE)
    else:
        if maskable: d.rectangle([0, 0, big, big], fill=TEAL)
        else: d.rounded_rectangle([0, 0, big - 1, big - 1], radius=big * 0.22, fill=TEAL)
        mark(d, big, big * (0.22 if maskable else 0.14), WHITE)
    return img.resize((size, size), Image.LANCZOS)

out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
icon(192).save(out / "icon-192.png"); icon(512).save(out / "icon-512.png")
icon(512, maskable=True).save(out / "maskable-512.png")
full = icon(180, maskable=True); full.save(out / "apple-touch-icon.png")
icon(96, mono=True).save(out / "badge-96.png"); icon(32).save(out / "favicon-32.png")
print("icons written to", out)
