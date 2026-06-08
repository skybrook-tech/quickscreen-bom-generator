"""
bunnings_parser.py

Parses raw Bunnings product page text (as returned by ExaContents or browser
extraction) into structured product dictionaries.

The parser is deterministic and source-agnostic — it does not perform any HTTP
fetching itself. Feed it the text content of a Bunnings product page (or a
search-result highlight block) and it returns one or more BunningsProduct dicts.

Output shape:
{
    "in_number": "0910426",           # Bunnings Item Number (sticker code)
    "name": "COLORBOND Steel 2350mm Woodland Grey Fencing Rail",
    "brand": "Colorbond",
    "price_aud": 15.00,
    "url": "https://www.bunnings.com.au/...",
    "colour": "Woodland Grey",
    "dimensions": {
        "length_mm": 2350,
        "width_mm": None,
        "height_mm": None
    },
    "category_hint": "rail",          # rail | post | infill | cap | panel | gate | other
    "availability": "in_stock",       # in_stock | special_order | unknown
    "rating": 4.5,
    "review_count": 4,
    "image_url": "https://media.bunnings.com.au/...",
    "raw_features": ["...", "..."],   # bullet list from page
    "source": "bunnings.com.au",
    "scraped_at": "2026-05-19T12:00:00Z"
}

Run as a module:
    python3 bunnings_parser.py < raw_text.txt
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Optional


# ---------------------------------------------------------------------------
# Regex library — Bunnings page text is consistent enough that regex parsing
# is more robust than DOM parsing (DOM changes frequently, text patterns don't)
# ---------------------------------------------------------------------------

# Item Number — appears as "I/N:0910426" or "I/N: 0910426"
RE_IN_NUMBER = re.compile(r"I/N\s*:\s*(\d{6,8})")

# Price — Bunnings shows prices as "$15", "$135", "$157.94", "$2.65"
# We want the *first* clean price in the page near a "$" with no other text
RE_PRICE = re.compile(r"\$\s?(\d{1,5}(?:\.\d{2})?)")

# Rating — "4.5(4)" or "4.5 (4)" — star value followed by review count
RE_RATING = re.compile(r"(\d\.\d)\s*\(\s*(\d+)\s*\)")

# Image URL — bunnings media CDN
RE_IMAGE = re.compile(r"https://media\.bunnings\.com\.au/[^\s\"\)]+")

# Product URL — bunnings product pages end with _pNNNNNNN
RE_PRODUCT_URL = re.compile(r"https?://www\.bunnings\.com\.au/[a-z0-9\-]+_p(\d{6,8})")

# Dimensions in product names: "2350mm", "1800 x 2360mm", "2400mm long"
RE_DIM_PAIR = re.compile(r"(\d{2,5})\s*[x×]\s*(\d{2,5})\s*mm", re.IGNORECASE)
RE_DIM_SINGLE = re.compile(r"\b(\d{3,5})\s*mm\b", re.IGNORECASE)

# Length in metres — "1.79m", "1.8m", "2.35m"
RE_DIM_METERS = re.compile(r"\b(\d+\.\d{1,2})\s*m\b(?!m)", re.IGNORECASE)

# Bunnings Colorbond / Steel colour palette — order matters for longest-match
# We sort by length descending so "Pale Eucalypt" wins over "Eucalypt"
COLORBOND_COLOURS = [
    "Woodland Grey",
    "Pale Eucalypt",
    "Evening Haze",
    "Night Sky",
    "Surfmist",
    "Riversand",
    "Paperbark",
    "Wilderness",
    "Ironstone",
    "Monument",
    "Domain",
    "Rivergum",
    "Manor Red",
    "Cottage Green",
    "Jasper",
    "Basalt",
    "Dover White",
    "Shale Grey",
    "Windspray",
    "Bushland",
    "Mangrove",
    "Eucalypt",
    "Headland",
    "Deep Ocean",
    "Galvanised",
    "Black",
    "White",
]

# Heuristic category hints from product names.
# IMPORTANT: order matters — most specific patterns first so "post cap" wins
# over "fencing post" and "gate kit" wins over "gate".
CATEGORY_KEYWORDS = {
    # specific component compounds first
    "cap":       ["post cap", "fencing cap", "post caps"],
    "extension": ["post extension"],
    "gate":      ["gate frame kit", "gate kit", "gate hardware", "gate"],
    "hinge":     ["hinge"],
    "latch":     ["latch", "lock"],
    # then the broader categories
    "panel":     ["complete fence panel", "fence panel", "garden fence panel"],
    "infill":    ["infill sheet", "neetascreen", "double sided fencing", "trapezoidal steel fence infill"],
    "rail":      ["fencing rail", "fence rail", "top rail", "bottom rail", "steel fence rail"],
    "post":      ["fencing post", "fence post", "steel post"],
    "lattice":   ["lattice"],
    "screw":     ["screw", "fixings"],
    "concrete":  ["concrete", "post mix", "rapid set"],
}


def _detect_colour(text: str) -> Optional[str]:
    """Return the longest-matching colour name found anywhere in the text."""
    lower = text.lower()
    for colour in COLORBOND_COLOURS:
        if colour.lower() in lower:
            return colour
    return None


def _detect_category(text: str) -> str:
    """Bucket the product into a fence-component category."""
    lower = text.lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                return cat
    return "other"


def _detect_availability(text: str) -> str:
    """in_stock if Add to Cart visible, special_order if flagged, else unknown."""
    lower = text.lower()
    if "special order" in lower:
        return "special_order"
    if "add to cart" in lower:
        return "in_stock"
    return "unknown"


def _extract_dimensions(name: str) -> dict:
    """Best-effort dimension extraction from product name."""
    out = {"length_mm": None, "width_mm": None, "height_mm": None}

    # 1) Look for explicit pair (e.g. "1800 x 2360mm")
    pair = RE_DIM_PAIR.search(name)
    if pair:
        a, b = int(pair.group(1)), int(pair.group(2))
        # Heuristic: smaller number = height, larger = width for panels
        out["height_mm"] = min(a, b) if min(a, b) > 500 else None
        out["width_mm"] = max(a, b)
        return out

    # 2) Single mm value — apply as length (most common case: rails, posts, sheets)
    singles = RE_DIM_SINGLE.findall(name)
    if singles:
        # Take the largest 3-5 digit number that's clearly a fence dimension
        candidates = [int(s) for s in singles if 100 <= int(s) <= 9999]
        if candidates:
            out["length_mm"] = max(candidates)
            return out

    # 3) Metres (e.g. "1.79m") → convert to mm
    meters = RE_DIM_METERS.search(name)
    if meters:
        out["length_mm"] = int(float(meters.group(1)) * 1000)

    return out


def _extract_features(text: str) -> list[str]:
    """Pull bullet-point feature list from product page text."""
    # Bunnings pages have a "Features" section, then bullet items prefixed with
    # "* " or "- " before the next "##" section header.
    features = []
    in_features = False
    for line in text.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.lower().startswith("## features"):
            in_features = True
            continue
        if in_features and s.startswith("##"):
            break
        if in_features and (s.startswith("* ") or s.startswith("- ")):
            features.append(s[2:].strip())
    return features


def _extract_price(text: str) -> Optional[float]:
    """Return the most plausible product price (first clean $-prefixed number)."""
    # Strategy: find all prices, return the one that appears near "Add to Cart"
    # or just above "How to purchase" — usually the main price. Fallback: first.
    matches = list(RE_PRICE.finditer(text))
    if not matches:
        return None

    # Prefer a price that appears near a price-context anchor
    anchors = ["Add to Cart", "How to purchase", "Special Order", "In-store only"]
    for m in matches:
        window_start = max(0, m.start() - 200)
        window_end = min(len(text), m.end() + 200)
        window = text[window_start:window_end]
        if any(a in window for a in anchors):
            try:
                return float(m.group(1))
            except ValueError:
                continue

    # Fallback: first price
    try:
        return float(matches[0].group(1))
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Main API
# ---------------------------------------------------------------------------

@dataclass
class BunningsProduct:
    in_number: Optional[str] = None
    name: Optional[str] = None
    brand: Optional[str] = None
    price_aud: Optional[float] = None
    url: Optional[str] = None
    colour: Optional[str] = None
    dimensions: dict = field(default_factory=dict)
    category_hint: str = "other"
    availability: str = "unknown"
    rating: Optional[float] = None
    review_count: Optional[int] = None
    image_url: Optional[str] = None
    raw_features: list = field(default_factory=list)
    source: str = "bunnings.com.au"
    scraped_at: Optional[str] = None


def parse_product_page(text: str, url: Optional[str] = None, name_hint: Optional[str] = None) -> BunningsProduct:
    """
    Parse a single Bunnings product page text into a structured product.

    Args:
        text: Raw page text (from ExaContents or browser extraction)
        url: Product URL if known
        name_hint: Product title from search result, if available

    Returns:
        BunningsProduct dataclass instance
    """
    p = BunningsProduct()
    p.scraped_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

    # Name — prefer name_hint, fall back to "# Product Name" markdown header
    if name_hint:
        p.name = name_hint.strip()
    else:
        m = re.search(r"^#\s+([^\n]+)$", text, re.MULTILINE)
        if m:
            p.name = m.group(1).strip()

    # URL
    if url:
        p.url = url
    else:
        m = RE_PRODUCT_URL.search(text)
        if m:
            p.url = m.group(0)

    # I/N number
    m = RE_IN_NUMBER.search(text)
    if m:
        p.in_number = m.group(1)

    # Price
    p.price_aud = _extract_price(text)

    # Rating / review count
    m = RE_RATING.search(text)
    if m:
        try:
            p.rating = float(m.group(1))
            p.review_count = int(m.group(2))
        except ValueError:
            pass

    # Image
    m = RE_IMAGE.search(text)
    if m:
        p.image_url = m.group(0)

    # Colour — search whole text first, name is most reliable
    candidate_text = (p.name or "") + " " + text[:1500]
    p.colour = _detect_colour(candidate_text)

    # Brand — look for "Colorbond", "Lysaght", "ProtectorAl", etc. before product
    # Heuristic: word right before the first "#" or at the start of the title
    brand_candidates = ["Colorbond", "Lysaght", "ProtectorAl", "Fielders",
                        "Stratco", "Australian Handyman Supplies", "BlueScope",
                        "Boral", "ITI Australia", "D&D"]
    for b in brand_candidates:
        if b.lower() in (p.name or "").lower():
            p.brand = b
            break
    if not p.brand:
        for b in brand_candidates:
            if b in text[:500]:
                p.brand = b
                break

    # Dimensions from name
    if p.name:
        p.dimensions = _extract_dimensions(p.name)

    # Category
    p.category_hint = _detect_category(p.name or text[:300])

    # Availability
    p.availability = _detect_availability(text)

    # Features
    p.raw_features = _extract_features(text)

    return p


def parse_search_result(result: dict) -> Optional[BunningsProduct]:
    """
    Parse a single ExaSearch result dict into a BunningsProduct.

    ExaSearch returns objects with: url, title, highlights, summary, image, etc.
    We treat the highlights[0] (or summary) as the page text.
    """
    if not result.get("url"):
        return None

    # Combine highlights + summary as the "page text" we parse
    highlights = result.get("highlights") or []
    text_parts = []
    if highlights:
        text_parts.extend(highlights)
    if result.get("summary"):
        text_parts.append(result["summary"])
    if not text_parts:
        return None
    text = "\n".join(text_parts)

    product = parse_product_page(
        text=text,
        url=result["url"],
        name_hint=result.get("title"),
    )

    # Image — ExaSearch puts the canonical image in the top-level field
    if not product.image_url and result.get("image"):
        product.image_url = result["image"]

    return product


def parse_search_results(results: list[dict]) -> list[BunningsProduct]:
    """Parse a list of ExaSearch results, filtering out non-product URLs."""
    products = []
    seen_in_numbers = set()
    for r in results:
        url = r.get("url", "")
        # Skip non-product URLs (category pages, DIY advice, brand hubs)
        if not RE_PRODUCT_URL.search(url):
            continue

        product = parse_search_result(r)
        if not product:
            continue

        # Deduplicate by I/N number
        if product.in_number:
            if product.in_number in seen_in_numbers:
                continue
            seen_in_numbers.add(product.in_number)

        products.append(product)

    return products


def to_jsonable(product: BunningsProduct) -> dict:
    return asdict(product)


# ---------------------------------------------------------------------------
# CLI entrypoint — for ad-hoc testing
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--from-search-json":
        # Read ExaSearch results JSON from stdin
        data = json.load(sys.stdin)
        results = data.get("results", data) if isinstance(data, dict) else data
        products = parse_search_results(results)
        print(json.dumps([to_jsonable(p) for p in products], indent=2))
    else:
        # Read raw page text from stdin
        text = sys.stdin.read()
        product = parse_product_page(text)
        print(json.dumps(to_jsonable(product), indent=2))
