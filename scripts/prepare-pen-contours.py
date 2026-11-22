"""uv run --with fonttools --with brotli --with skia-pathops scripts/prepare-pen-contours.py <Latin WOFF2>"""

import json
import string
import sys
from pathlib import Path

import pathops
from fontTools.pens.perimeterPen import PerimeterPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

font = TTFont(sys.argv[1])
cmap = font.getBestCmap()
if font["name"].getDebugName(1) != "Google Sans Flex" or ord("w") not in cmap:
    raise ValueError("Expected the Google Sans Flex Latin subset")

def instance(chars, weight, width, optical):
    glyphs = font.getGlyphSet(location={"wght": weight, "wdth": width, "opsz": optical})
    result = {}
    for char in sorted(set(chars)):
        glyph = glyphs[cmap[ord(char)]]
        raw = pathops.Path()
        glyph.draw(raw.getPen(glyphSet=glyphs))
        contours = []
        # Strokes must follow the silhouette, not the intersecting stems used
        # to construct a variable font (notably k, H and E).
        for ring in sorted(pathops.simplify(raw).contours, key=lambda p: -abs(p.area)):
            path = SVGPathPen(None, ntos=lambda n: str(round(n)))
            length = PerimeterPen(None)
            ring.draw(path)
            ring.draw(length)
            contours.append({"d": path.getCommands(), "length": round(length.value, 1)})
        result[char] = {"advance": round(glyph.width, 1), "rings": contours}
    return result

letters = string.ascii_letters + ".,?!\u2019"
faces = {
    "copy": instance(letters, 450, 100, 22),
    "heading": instance("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.?", 550, 100, 32),
    "send": instance("SEND", 690, 96, 144),
}
for width in (25, 62, 100, 127.25, 151):
    faces[str(width)] = instance("work.", 600, width, 144)

out = Path(__file__).resolve().parents[1] / "src/components/narrative/penContours.json"
out.write_text(json.dumps({"units": font["head"].unitsPerEm, "faces": faces}, separators=(",", ":")) + "\n")
