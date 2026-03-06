import logging
import re
from urllib.parse import quote_plus

import httpx

logger = logging.getLogger(__name__)


async def fetch_images_for_chapter(search_terms: list[str], max_images: int = 3) -> list[str]:
    """Fetch educational images for a chapter using Wikimedia Commons API."""
    images: list[str] = []

    for term in search_terms:
        if len(images) >= max_images:
            break
        try:
            found = await _search_wikimedia(term, limit=2)
            images.extend(found)
        except Exception as e:
            logger.warning(f"Image fetch failed for term '{term}': {e}")

    # Fallback to generated SVG placeholders if no images found
    if not images:
        for term in search_terms[:max_images]:
            images.append(_generate_placeholder_svg_url(term))

    return images[:max_images]


async def _search_wikimedia(term: str, limit: int = 2) -> list[str]:
    """Search Wikimedia Commons for images matching the term."""
    api_url = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"{term} illustration diagram",
        "gsrnamespace": "6",  # File namespace
        "gsrlimit": str(limit + 2),  # Fetch a few extra in case we filter some
        "prop": "imageinfo",
        "iiprop": "url|mime",
        "iiurlwidth": "800",
        "format": "json",
    }

    async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
        resp = await client.get(api_url, params=params)
        if resp.status_code != 200:
            return []

        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        
        urls: list[str] = []
        for page in pages.values():
            imageinfo = page.get("imageinfo", [{}])
            if not imageinfo:
                continue
            info = imageinfo[0]
            mime = info.get("mime", "")
            if not mime.startswith("image/"):
                continue
            # Prefer the thumbnail URL (resized to 800px width)
            thumb_url = info.get("thumburl")
            full_url = info.get("url")
            url = thumb_url or full_url
            if url:
                urls.append(url)
            if len(urls) >= limit:
                break

        return urls


def _generate_placeholder_svg_url(term: str) -> str:
    """Generate a reliable placeholder image url using the term as a seed."""
    clean = re.sub(r'[^a-zA-Z0-9 ]', '', term)[:40]
    encoded = quote_plus(clean)
    return f"https://picsum.photos/seed/{encoded}/800/400"
