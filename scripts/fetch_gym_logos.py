#!/usr/bin/env python3
"""Download official Touchstone gym logos from Redpoint HQ GraphQL."""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

from touchstonecal.config import ALL_GYMS

GRAPHQL_URL = "https://portal.touchstoneclimbing.com/graphql-public"
CLIENT_VERSION = "1.3.646"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "web" / "public" / "gyms"

FACILITIES_QUERY = """
query FacilitiesLogos($first: Int!) {
  facilities(first: $first) {
    edges {
      node {
        slug
        branding {
          logo
        }
      }
    }
  }
}
""".strip()


def _request(payload: dict) -> dict:
    headers = {
        "Accept": "*/*",
        "Content-Type": "application/json",
        "User-Agent": "touchstonecal/0.1",
        "x-redpoint-hq-client": CLIENT_VERSION,
    }
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(GRAPHQL_URL, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def _download(url: str, destination: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "touchstonecal/0.1"})
    with urllib.request.urlopen(request, timeout=30) as response:
        destination.write_bytes(response.read())


def fetch_logo_urls() -> dict[str, str]:
    body = _request(
        {
            "query": FACILITIES_QUERY,
            "variables": {"first": 30},
        }
    )
    if body.get("errors"):
        messages = "; ".join(error.get("message", "unknown error") for error in body["errors"])
        raise RuntimeError(f"GraphQL error: {messages}")

    logos: dict[str, str] = {}
    edges = body.get("data", {}).get("facilities", {}).get("edges", [])
    for edge in edges:
        node = edge.get("node") or {}
        slug = node.get("slug")
        logo = (node.get("branding") or {}).get("logo")
        if slug and logo:
            logos[slug] = logo
    return logos


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    logos_by_slug = fetch_logo_urls()
    slug_to_key = {gym.portal_slug: gym.key for gym in ALL_GYMS}

    missing: list[str] = []
    downloaded = 0

    for gym in ALL_GYMS:
        logo_url = logos_by_slug.get(gym.portal_slug)
        if not logo_url:
            missing.append(gym.key)
            print(f"Missing logo for {gym.key} (slug={gym.portal_slug})", file=sys.stderr)
            continue

        destination = OUTPUT_DIR / f"{gym.key}.png"
        print(f"Downloading {gym.key} -> {destination.name}")
        _download(logo_url, destination)
        downloaded += 1

    print(f"Downloaded {downloaded}/{len(ALL_GYMS)} gym logos to {OUTPUT_DIR}")
    if missing:
        print(f"Missing logos for: {', '.join(missing)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
