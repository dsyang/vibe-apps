#!/usr/bin/env python3
"""Verify that build.py produced a coherent _site/ and assets.json.

Run after `python3 build.py`. Exits non-zero on the first failure. Stdlib
only so it works in CI without setup.
"""

import hashlib
import json
import re
import sys
from pathlib import Path

from build import TOOLS_DIR, SITE_DIR, ASSETS_FILE, find_local_assets

SITE_ASSETS = SITE_DIR / "assets.json"
SITE_INDEX = SITE_DIR / "index.html"
SITE_TOOLS = SITE_DIR / "tools"
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


def fail(msg):
    print(f"FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def ok(msg):
    print(f"OK: {msg}")


def check_structure():
    for path in (SITE_DIR, SITE_INDEX, SITE_TOOLS, SITE_ASSETS, ASSETS_FILE):
        if not path.exists():
            fail(f"missing expected build output: {path}")
    if ASSETS_FILE.read_bytes() != SITE_ASSETS.read_bytes():
        fail(f"{ASSETS_FILE} and {SITE_ASSETS} differ")
    ok("build output structure present and root/_site assets.json match")


def check_manifest_schema(manifest):
    if not isinstance(manifest, dict) or "tools" not in manifest:
        fail("assets.json must be an object with a 'tools' array")
    tools = manifest["tools"]
    if not isinstance(tools, list):
        fail("assets.json 'tools' must be a list")
    for i, entry in enumerate(tools):
        for key, expected in (
            ("title", str),
            ("description", str),
            ("path", str),
            ("sha256", str),
            ("file_size_bytes", int),
            ("assets", list),
        ):
            if key not in entry:
                fail(f"tools[{i}] missing key '{key}'")
            if not isinstance(entry[key], expected):
                fail(f"tools[{i}].{key} has wrong type")
        if not entry["path"].startswith("tools/"):
            fail(f"tools[{i}].path must start with 'tools/', got {entry['path']!r}")
        if not _SHA256_RE.match(entry["sha256"]):
            fail(f"tools[{i}].sha256 is not a 64-char hex string")
        for j, asset in enumerate(entry["assets"]):
            for key, expected in (
                ("path", str),
                ("sha256", str),
                ("file_size_bytes", int),
            ):
                if key not in asset:
                    fail(f"tools[{i}].assets[{j}] missing key '{key}'")
                if not isinstance(asset[key], expected):
                    fail(f"tools[{i}].assets[{j}].{key} has wrong type")
            if not asset["path"].startswith("tools/"):
                fail(f"tools[{i}].assets[{j}].path must start with 'tools/'")
            if not _SHA256_RE.match(asset["sha256"]):
                fail(f"tools[{i}].assets[{j}].sha256 is not a 64-char hex string")
    ok(f"manifest schema valid ({len(tools)} tools)")


def check_files_match_manifest(manifest):
    for entry in manifest["tools"]:
        for record in [entry, *entry["assets"]]:
            path = SITE_DIR / record["path"]
            if not path.is_file():
                fail(f"manifest references missing file: {path}")
            data = path.read_bytes()
            if len(data) != record["file_size_bytes"]:
                fail(
                    f"size mismatch for {record['path']}: "
                    f"manifest={record['file_size_bytes']} actual={len(data)}"
                )
            digest = hashlib.sha256(data).hexdigest()
            if digest != record["sha256"]:
                fail(f"sha256 mismatch for {record['path']}")
    ok("every manifest entry matches its file on disk")


def check_no_broken_local_refs(manifest):
    # Map each tool path to its declared asset set for cross-checking.
    declared = {
        entry["path"]: {a["path"] for a in entry["assets"]}
        for entry in manifest["tools"]
    }
    for html_file in sorted(SITE_TOOLS.glob("*.html")):
        # Reuse build.py's discovery so verify stays in lockstep with the
        # builder's notion of "local reference".
        source = TOOLS_DIR / html_file.name
        if not source.exists():
            fail(f"{html_file} has no corresponding source under {TOOLS_DIR}")
        content = source.read_text(encoding="utf-8")
        refs = find_local_assets(content, source)
        for ref in refs:
            site_target = SITE_TOOLS / ref.relative_to(TOOLS_DIR.resolve())
            if not site_target.is_file():
                fail(
                    f"{html_file.name} references local file "
                    f"{ref.relative_to(TOOLS_DIR.resolve())} but {site_target} "
                    f"is not in the deployed site"
                )
        # Each ref must also appear in the manifest's asset list for this tool.
        tool_path = f"tools/{html_file.name}"
        declared_set = declared.get(tool_path, set())
        for ref in refs:
            rel = ref.relative_to(TOOLS_DIR.resolve())
            expected = f"tools/{rel.as_posix()}"
            if expected not in declared_set:
                fail(
                    f"{tool_path} references {expected} but the manifest "
                    f"does not list it under that tool's assets"
                )
    ok("no broken local references in any deployed HTML")


def check_index_links_tools(manifest):
    index_html = SITE_INDEX.read_text(encoding="utf-8")
    for entry in manifest["tools"]:
        needle = f'href="{entry["path"]}"'
        if needle not in index_html:
            fail(f"index.html missing link for {entry['path']}")
    ok("index.html links every tool in the manifest")


def main():
    check_structure()
    manifest = json.loads(SITE_ASSETS.read_text(encoding="utf-8"))
    check_manifest_schema(manifest)
    check_files_match_manifest(manifest)
    check_no_broken_local_refs(manifest)
    check_index_links_tools(manifest)
    print("All checks passed.")


if __name__ == "__main__":
    main()
