#!/usr/bin/env python3
"""Draws the Keep of the Gales icon art as 32x32 pixel art and writes every icon file.

    python3 tools/make-icons.py              # writes the default hero (wyrm) icons into the repo root
    python3 tools/make-icons.py --sheet out.png   # contact sheet of all candidate characters
Requires Pillow. Bump CACHE in sw.js after regenerating.
"""
import sys, os
from PIL import Image, ImageDraw

N = 32
BG = (13, 15, 20, 255)
CLEAR = (0, 0, 0, 0)

def canvas():
    im = Image.new('RGBA', (N, N), CLEAR)
    return im, ImageDraw.Draw(im)

def mirror(d, fn):
    """Call fn(draw, flip) for the left half and the mirrored right half."""
    fn(d, lambda x: x)
    fn(d, lambda x: N - 1 - x)

def poly(d, pts, fill, f):
    d.polygon([(f(x), y) for x, y in pts], fill=fill)

def rect(d, x0, y0, x1, y1, fill, f):
    a, b = f(x0), f(x1)
    d.rectangle([min(a, b), y0, max(a, b), y1], fill=fill)

def px(d, x, y, fill, f):
    d.point((f(x), y), fill=fill)

def outline(im, col):
    """1px dark outline around the opaque sprite, like classic tile sprites."""
    src = im.copy(); w, h = im.size
    for y in range(h):
        for x in range(w):
            if src.getpixel((x, y))[3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and src.getpixel((nx, ny))[3] > 0 and src.getpixel((nx, ny)) != col:
                        im.putpixel((x, y), col); break
    return im

def wind(d):
    """Faint gale swirls behind the character."""
    c = (27, 58, 82, 255); c2 = (44, 92, 128, 255)
    for (box, a0, a1, col) in [((0, 2, 14, 16), 200, 340, c2), ((18, 14, 32, 30), 20, 160, c2),
                               ((-4, 12, 8, 26), 250, 360, c), ((24, 3, 36, 15), 150, 260, c)]:
        d.arc(box, a0, a1, fill=col)

# ----------------------------------------------------------------- characters
def wyrm():
    """Gale Wyrm: the final boss. Cyan dragon head, bone horns, yellow slit eyes."""
    im, d = canvas()
    O = (6, 34, 46, 255); DK = (20, 110, 140, 255); MD = (62, 198, 232, 255); LT = (157, 221, 255, 255)
    BONE = (232, 220, 192, 255); BSH = (184, 168, 136, 255); EYE = (255, 216, 74, 255); BLK = (10, 10, 14, 255); WH = (245, 245, 245, 255)
    def half(d, f):
        poly(d, [(15, 7), (11, 8), (8, 11), (7, 15), (8, 19), (10, 23), (12, 26), (15, 27)], MD, f)   # skull + snout
        poly(d, [(8, 15), (8, 19), (10, 23), (12, 26), (11, 22), (10, 18), (9, 15)], DK, f)            # jaw shading
        poly(d, [(15, 8), (12, 9), (10, 11), (14, 11)], LT, f)                                          # brow highlight
        poly(d, [(11, 10), (8, 8), (7, 4), (6, 3), (6, 7), (9, 12)], BONE, f)                            # horn
        poly(d, [(8, 9), (7, 5), (7, 8)], BSH, f)
        rect(d, 9, 13, 14, 14, DK, f)                                                                    # brow ridge
        rect(d, 10, 14, 13, 16, EYE, f); rect(d, 12, 14, 12, 16, BLK, f); px(d, 10, 14, WH, f)           # eye with slit
        px(d, 14, 20, BLK, f); px(d, 14, 21, BLK, f)                                                     # nostril
        rect(d, 10, 24, 15, 24, O, f)                                                                    # mouth
        rect(d, 11, 25, 11, 26, WH, f); px(d, 14, 25, WH, f)                                             # fangs
        px(d, 9, 17, LT, f); px(d, 9, 18, LT, f)
    mirror(d, half)
    rect(d, 15, 8, 16, 12, LT, lambda x: x)        # crest down the forehead
    rect(d, 15, 13, 16, 22, MD, lambda x: x)
    return outline(im, O)

def champion():
    """Champion: steel great-helm with a crimson plume and a glowing visor slit."""
    im, d = canvas()
    O = (12, 14, 24, 255); ST = (118, 128, 150, 255); SD = (66, 74, 96, 255); SL = (190, 200, 222, 255)
    RED = (214, 52, 52, 255); RDK = (140, 24, 36, 255); GLOW = (255, 216, 74, 255); GOLD = (232, 184, 64, 255)
    def half(d, f):
        poly(d, [(15, 5), (11, 6), (9, 8), (8, 13), (8, 20), (9, 25), (12, 27), (15, 27)], ST, f)       # helm
        poly(d, [(8, 15), (8, 20), (9, 25), (12, 27), (11, 22), (10, 17)], SD, f)
        poly(d, [(15, 6), (12, 7), (10, 9), (14, 9)], SL, f)
        rect(d, 9, 13, 14, 14, O, f)                                                                      # visor slit
        px(d, 10, 13, GLOW, f); px(d, 11, 13, GLOW, f); px(d, 12, 13, GLOW, f); px(d, 13, 13, GLOW, f)
        for y in (17, 19, 21, 23): rect(d, 12, y, 14, y, O, f)                                            # breaths
        rect(d, 9, 15, 10, 15, SL, f)
        poly(d, [(9, 8), (7, 7), (6, 9), (8, 11)], GOLD, f)                                               # cheek studs / wings
    mirror(d, half)
    rect(d, 15, 5, 16, 27, SL, lambda x: x)                                                              # nasal ridge
    rect(d, 15, 13, 16, 14, SD, lambda x: x)
    # plume: a tall crimson crest sweeping back
    d.polygon([(13, 5), (12, 3), (14, 1), (19, 1), (22, 3), (19, 4), (18, 5)], fill=RED)
    d.polygon([(14, 5), (15, 3), (18, 2), (21, 3), (18, 4), (17, 5)], fill=RDK)
    d.line([(14, 2), (19, 2)], fill=RED)
    return outline(im, O)

def skeleton():
    """Skeleton: bone skull with hollow sockets and grinning teeth."""
    im, d = canvas()
    O = (14, 14, 22, 255); BN = (236, 232, 214, 255); SH = (168, 160, 138, 255); BLK = (10, 10, 14, 255); EMB = (120, 240, 255, 255)
    def half(d, f):
        poly(d, [(15, 6), (11, 7), (8, 10), (7, 15), (8, 19), (10, 21), (11, 25), (15, 25)], BN, f)
        poly(d, [(7, 15), (8, 19), (10, 21), (11, 25), (10, 20), (9, 16)], SH, f)
        rect(d, 9, 12, 13, 16, BLK, f); px(d, 11, 14, EMB, f)                                              # socket + ember
        poly(d, [(14, 18), (15, 18), (15, 20)], BLK, f)                                                    # nose
        rect(d, 10, 22, 14, 24, BN, f)
        for x in (10, 12, 14): rect(d, x, 22, x, 24, BLK, f)                                               # teeth gaps
    mirror(d, half)
    rect(d, 9, 21, 22, 21, SH, lambda x: x)
    return outline(im, O)

def ogre():
    """Ogre: broad orange brute with tusks and a heavy brow."""
    im, d = canvas()
    O = (40, 16, 10, 255); SK = (226, 140, 80, 255); SD = (160, 84, 44, 255); SL = (250, 190, 130, 255)
    BLK = (10, 10, 14, 255); EYE = (255, 240, 120, 255); TUSK = (245, 240, 220, 255); HAIR = (90, 52, 30, 255)
    def half(d, f):
        poly(d, [(15, 7), (10, 8), (6, 12), (5, 18), (7, 23), (11, 26), (15, 26)], SK, f)
        poly(d, [(5, 18), (7, 23), (11, 26), (9, 21), (7, 17)], SD, f)
        poly(d, [(15, 8), (11, 9), (8, 11), (14, 11)], HAIR, f)
        rect(d, 8, 12, 14, 13, SD, f)
        rect(d, 9, 14, 12, 15, EYE, f); rect(d, 11, 14, 12, 15, BLK, f)
        rect(d, 13, 18, 14, 19, SD, f)
        rect(d, 9, 22, 14, 23, BLK, f)
        poly(d, [(9, 22), (8, 18), (10, 21)], TUSK, f); rect(d, 9, 22, 10, 22, TUSK, f)
        px(d, 8, 16, SL, f)
    mirror(d, half)
    return outline(im, O)

CHARS = {'wyrm': wyrm, 'champion': champion, 'skeleton': skeleton, 'ogre': ogre}

# ----------------------------------------------------------------- outputs
def compose(sprite, rounded):
    """Dark tile, faint gale swirls, sprite on top. rounded=False gives a full-bleed (maskable) square."""
    im = Image.new('RGBA', (N, N), BG)
    wind(ImageDraw.Draw(im))
    im.alpha_composite(sprite)
    if rounded:  # clip the corners (transparent), like the old rounded-rect icon
        m = Image.new('L', (N, N), 255); md = ImageDraw.Draw(m)
        for (cx, cy) in ((0, 0), (N - 1, 0), (0, N - 1), (N - 1, N - 1)):
            for dx in range(3):
                for dy in range(3):
                    if dx + dy < 3 - (1 if dx and dy else 0):
                        md.point((abs(cx - dx), abs(cy - dy)), fill=0)
        im.putalpha(m)
    return im

def to_svg(im):
    """Pixel art as crisp SVG: horizontal runs of identical colour become one rect."""
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}" shape-rendering="crispEdges">']
    for y in range(N):
        x = 0
        while x < N:
            p = im.getpixel((x, y))
            if p[3] == 0: x += 1; continue
            x2 = x
            while x2 + 1 < N and im.getpixel((x2 + 1, y)) == p: x2 += 1
            out.append(f'<rect x="{x}" y="{y}" width="{x2 - x + 1}" height="1" fill="#{p[0]:02x}{p[1]:02x}{p[2]:02x}"/>')
            x = x2 + 1
    out.append('</svg>'); return '\n'.join(out) + '\n'

def up(im, size):
    return im.resize((size, size), Image.NEAREST)

def write_all(sprite, root):
    rounded, bleed = compose(sprite, True), compose(sprite, False)
    up(rounded, 192).save(os.path.join(root, 'icon-192.png'))
    up(rounded, 512).save(os.path.join(root, 'icon-512.png'))
    up(bleed, 512).save(os.path.join(root, 'icon-maskable-512.png'))
    up(bleed, 192).resize((180, 180), Image.NEAREST).save(os.path.join(root, 'apple-touch-icon.png'))
    open(os.path.join(root, 'icon.svg'), 'w').write(to_svg(rounded))
    open(os.path.join(root, 'icon-maskable.svg'), 'w').write(to_svg(bleed))
    rounded.resize((48, 48), Image.NEAREST).save(os.path.join(root, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])

if __name__ == '__main__':
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    if '--sheet' in sys.argv:
        names = list(CHARS); S = 256
        sheet = Image.new('RGBA', (S * len(names) + 10 * (len(names) + 1), S + 20), (30, 32, 40, 255))
        for i, n in enumerate(names):
            sheet.alpha_composite(up(compose(CHARS[n](), True), S), (10 + i * (S + 10), 10))
        sheet.save(sys.argv[sys.argv.index('--sheet') + 1]); sys.exit()
    pick = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else 'wyrm'
    write_all(CHARS[pick](), os.path.abspath(root))
