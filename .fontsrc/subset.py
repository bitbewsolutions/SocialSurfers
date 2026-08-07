"""Subset Space Grotesk to the characters this site actually renders.

Same policy as the earlier Fraunces/JetBrains subsets: latin basic plus the
typographic punctuation the copy uses, weight axis kept intact so one file serves
both the display sizes and the body.
"""
from fontTools import subset

TEXT = (
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789"
    " .,:;!?'\"()[]{}/\\|&@#%*+-=_<>~^$"
    "‘’“”"   # curly quotes
    "–—…"          # en/em dash, ellipsis
    "·→ "          # middot, right arrow, nbsp
    "₹©é®"    # rupee, copyright, e-acute, registered
)

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

font = subset.load_font("SpaceGrotesk-var.ttf", opts)
sub = subset.Subsetter(options=opts)
sub.populate(text=TEXT)
sub.subset(font)
subset.save_font(font, "../public/fonts/grotesk-sub.woff2", opts)
print("wrote public/fonts/grotesk-sub.woff2")
