"""Subset the site's two faces to the characters it actually renders.

Both are variable and the weight axis is kept intact, so one file per family
serves every size and weight on the page — which matters more than usual here,
because the design leans on 900 for display and 400 for body out of the same
family.

Why these two, replacing Space Grotesk and JetBrains Mono:

  Archivo         The client's poster is set in a neutral neo-grotesque with a
                  very heavy weight for the caps and nothing else in the mix. It
                  carries the full range including a true 900, which the poster's
                  wordmark needs, and it reads cleanly at 15px for body — so it
                  replaces BOTH previous faces. The poster has no monospace
                  anywhere, so the mono labels went with it; small caps labels are
                  now Archivo 700 with letterspacing.

  Dancing Script  The handwritten line in the brochure. Bouncy monoline script,
                  the closest widely-available match. It sets exactly one line on
                  the whole site, so it is subset to the characters that line can
                  plausibly use rather than to the full latin set — 42 KB down to
                  a few.

Sources are the @fontsource-variable packages in node_modules (devDependencies),
so there is no vendored binary in the repo and a version bump is an npm install.

  python .fontsrc/subset.py
"""
import re
from fontTools import subset
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = ROOT / 'node_modules' / '@fontsource-variable'
OUT = ROOT / 'public' / 'fonts'

# Body and display: everything the page can render.
TEXT_UI = (
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789"
    " .,:;!?'\"()[]{}/\\|&@#%*+-=_<>~^$"
    "‘’“”"   # curly quotes
    "–—…"          # en/em dash, ellipsis
    "·→ "          # middot, right arrow, nbsp
    "₹©é®°"  # rupee, copyright, e-acute, registered, degree
)

def script_text() -> str:
    """Exactly the characters the one scripted line needs, read from the copy itself.

    The full latin alphabet costs 19.2 KB here against 5.9 KB for the line as
    written — worth taking, but only if the subset cannot drift from the copy. So
    it is derived from `voiceLine` in the single source of truth rather than typed
    out twice: change the line, re-run, and the subset follows. If the string ever
    moves, this raises instead of quietly shipping a font missing its glyphs.

    Both apostrophes are always included — the source carries a straight one and
    the markup renders a curly one.
    """
    src = (ROOT / 'src' / 'data' / 'site.ts').read_text(encoding='utf-8')
    m = re.search(r"voiceLine:\s*['\"](.+?)['\"],", src)
    if not m:
        raise SystemExit("could not find `voiceLine` in src/data/site.ts — the script "
                         "subset is derived from it and would ship incomplete")
    return ''.join(sorted(set(m.group(1) + "'’")))


def cut(src: Path, dst: Path, text: str) -> None:
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = [
        "kern", "liga", "clig", "calt", "ccmp", "locl",
        "mark", "mkmk", "tnum", "frac", "ordn",
    ]
    opts.desubroutinize = False
    opts.retain_gids = False
    opts.name_IDs = ["*"]
    opts.name_legacy = True
    opts.name_languages = ["*"]
    opts.notdef_outline = True
    opts.recalc_bounds = True

    font = subset.load_font(str(src), opts)
    sub = subset.Subsetter(options=opts)
    sub.populate(text=text)
    sub.subset(font)
    subset.save_font(font, str(dst), opts)
    before = src.stat().st_size / 1024
    after = dst.stat().st_size / 1024
    print(f"{dst.name:22} {before:6.1f} KB -> {after:5.1f} KB")


OUT.mkdir(parents=True, exist_ok=True)
cut(FILES / 'archivo' / 'files' / 'archivo-latin-wght-normal.woff2', OUT / 'archivo-sub.woff2', TEXT_UI)
cut(FILES / 'dancing-script' / 'files' / 'dancing-script-latin-wght-normal.woff2', OUT / 'script-sub.woff2', script_text())
