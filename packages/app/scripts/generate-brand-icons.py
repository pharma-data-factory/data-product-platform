"""Rasterize Nexora brand icons. Run from packages/app/public."""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

NAVY = (11, 31, 58, 255)
TEAL = (13, 148, 136, 255)
TEAL_LIGHT = (20, 184, 166, 255)
FILL = (7, 21, 37, 255)

ROOT = Path(__file__).resolve().parents[1] / "public"


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def gradient_color(t: float) -> tuple[int, int, int, int]:
    t = max(0.0, min(1.0, t))
    if t < 0.55:
        u = t / 0.55
        return (
            int(lerp(NAVY[0], TEAL[0], u)),
            int(lerp(NAVY[1], TEAL[1], u)),
            int(lerp(NAVY[2], TEAL[2], u)),
            255,
        )
    u = (t - 0.55) / 0.45
    return (
        int(lerp(TEAL[0], TEAL_LIGHT[0], u)),
        int(lerp(TEAL[1], TEAL_LIGHT[1], u)),
        int(lerp(TEAL[2], TEAL_LIGHT[2], u)),
        255,
    )


def blend(dst: list[int], x: int, y: int, w: int, color: tuple[int, int, int, int], a: float) -> None:
    if a <= 0 or x < 0 or y < 0 or x >= w or y >= w:
        return
    i = (y * w + x) * 4
    src_a = color[3] / 255 * a
    out_a = src_a + (dst[i + 3] / 255) * (1 - src_a)
    if out_a == 0:
        return
    for c in range(3):
        dst[i + c] = int(
            (color[c] * src_a + dst[i + c] * (dst[i + 3] / 255) * (1 - src_a)) / out_a
        )
    dst[i + 3] = int(out_a * 255)


def dist(x: float, y: float, cx: float, cy: float) -> float:
    return math.hypot(x - cx, y - cy)


def stroke_circle(px: list[int], w: int, cx: float, cy: float, r: float, width: float, color_at) -> None:
    outer = r + width / 2 + 1.2
    x0 = max(0, int(cx - outer))
    x1 = min(w - 1, int(cx + outer))
    y0 = max(0, int(cy - outer))
    y1 = min(w - 1, int(cy + outer))
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            d = abs(dist(x + 0.5, y + 0.5, cx, cy) - r)
            a = max(0.0, min(1.0, 1.2 - d / (width / 2 + 0.35)))
            if a:
                blend(px, x, y, w, color_at(x, y), a)


def fill_circle(px: list[int], w: int, cx: float, cy: float, r: float, color_at) -> None:
    x0 = max(0, int(cx - r - 1.2))
    x1 = min(w - 1, int(cx + r + 1.2))
    y0 = max(0, int(cy - r - 1.2))
    y1 = min(w - 1, int(cy + r + 1.2))
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            d = dist(x + 0.5, y + 0.5, cx, cy)
            a = max(0.0, min(1.0, r + 0.6 - d))
            if a:
                blend(px, x, y, w, color_at(x, y), min(1.0, a))


def stroke_polyline(px: list[int], w: int, points: list[tuple[float, float]], width: float, color_at, closed: bool = False) -> None:
    segs = list(zip(points, points[1:]))
    if closed:
        segs.append((points[-1], points[0]))
    for (x0, y0), (x1, y1) in segs:
        length = math.hypot(x1 - x0, y1 - y0) or 1
        steps = int(length * 3) + 1
        for i in range(steps + 1):
            t = i / steps
            fill_circle(px, w, lerp(x0, x1, t), lerp(y0, y1, t), width / 2, color_at)


def render(size: int, background: tuple[int, int, int, int] | None = None) -> list[int]:
    px = [0] * (size * size * 4)
    if background:
        for i in range(0, len(px), 4):
            px[i : i + 4] = list(background)
    s = size / 48.0

    def color_at(x: float, y: float) -> tuple[int, int, int, int]:
        return gradient_color((x + y) / (2 * (size - 1)))

    stroke_circle(px, size, 24 * s, 24 * s, 20 * s, 2 * s, color_at)
    pent = [(24 * s, 10 * s), (36 * s, 20 * s), (32 * s, 34 * s), (16 * s, 34 * s), (12 * s, 20 * s)]
    stroke_polyline(px, size, pent, 2 * s, color_at, closed=True)
    center = (24 * s, 22 * s)
    for p in pent:
        stroke_polyline(px, size, [p, center], 1.4 * s, color_at)
    for p in pent:
        fill_circle(px, size, p[0], p[1], 3.2 * s, lambda *_: FILL)
        stroke_circle(px, size, p[0], p[1], 3.2 * s, 2 * s, color_at)
    fill_circle(px, size, center[0], center[1], 3.6 * s, color_at)
    return px


def write_png(path: Path, size: int, pixels: list[int]) -> None:
    raw = b"".join(
        b"\x00" + bytes(pixels[y * size * 4 : (y + 1) * size * 4]) for y in range(size)
    )

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    )


def write_ico(path: Path, images: list[tuple[int, list[int]]]) -> None:
    parts = [struct.pack("<HHH", 0, 1, len(images))]
    blobs: list[bytes] = []
    offset = 6 + 16 * len(images)
    for size, pixels in images:
        xor = bytearray()
        for y in range(size - 1, -1, -1):
            row = pixels[y * size * 4 : (y + 1) * size * 4]
            for x in range(size):
                r, g, b, a = row[x * 4 : x * 4 + 4]
                xor.extend((b, g, r, a))
        and_row = ((size + 31) // 32) * 4
        and_mask = bytes(and_row * size)
        dib = struct.pack(
            "<IiiHHIIiiII",
            40,
            size,
            size * 2,
            1,
            32,
            0,
            len(xor),
            0,
            0,
            0,
            0,
        )
        blob = dib + bytes(xor) + and_mask
        blobs.append(blob)
        parts.append(struct.pack("<BBBBHHII", size if size < 256 else 0, size if size < 256 else 0, 0, 0, 1, 32, len(blob), offset))
        offset += len(blob)
    path.write_bytes(b"".join(parts) + b"".join(blobs))


def main() -> None:
    apple = render(180, background=NAVY)
    write_png(ROOT / "apple-touch-icon.png", 180, apple)
    write_png(ROOT / "android-chrome-192x192.png", 192, render(192, background=NAVY))
    write_png(ROOT / "favicon-32x32.png", 32, render(32, background=NAVY))
    write_png(ROOT / "favicon-16x16.png", 16, render(16, background=NAVY))
    write_ico(
        ROOT / "favicon.ico",
        [
            (16, render(16, background=NAVY)),
            (32, render(32, background=NAVY)),
            (48, render(48, background=NAVY)),
        ],
    )


if __name__ == "__main__":
    main()
