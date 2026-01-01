#!/usr/bin/env python3
"""
Build script to generate index.html from tools in the tools/ directory.

Each tool should have:
- A <title> tag (will strip " - Vibe Apps" suffix)
- A <meta name="description" content="..."> tag
"""

import os
import re
from pathlib import Path
from datetime import datetime

TOOLS_DIR = Path("tools")
INDEX_FILE = Path("index.html")

def extract_metadata(html_path):
    """Extract title and description from an HTML file."""
    content = html_path.read_text(encoding="utf-8")

    # Extract title
    title_match = re.search(r"<title>(.+?)</title>", content, re.IGNORECASE)
    if title_match:
        title = title_match.group(1)
        # Remove " - Vibe Apps" suffix if present
        title = re.sub(r"\s*-\s*Vibe Apps$", "", title, flags=re.IGNORECASE)
    else:
        title = html_path.stem.replace("-", " ").title()

    # Extract description from meta tag
    desc_match = re.search(
        r'<meta\s+name=["\']description["\']\s+content=["\'](.+?)["\']',
        content,
        re.IGNORECASE
    )
    if not desc_match:
        # Try alternate order
        desc_match = re.search(
            r'<meta\s+content=["\'](.+?)["\']\s+name=["\']description["\']',
            content,
            re.IGNORECASE
        )

    description = desc_match.group(1) if desc_match else "A useful tool"

    return {
        "title": title,
        "description": description,
        "filename": html_path.name,
        "path": f"tools/{html_path.name}"
    }

def generate_index(tools):
    """Generate the index.html content."""
    tools_html = ""
    for tool in sorted(tools, key=lambda t: t["title"].lower()):
        tools_html += f"""        <li class="tool-item">
            <h2><a href="{tool['path']}">{tool['title']}</a></h2>
            <p>{tool['description']}</p>
        </li>
"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vibe Apps - Small Tools Collection</title>
    <style>
        :root {{
            --bg: #fafafa;
            --text: #1a1a1a;
            --link: #0066cc;
            --link-hover: #004499;
            --border: #e0e0e0;
            --card-bg: #ffffff;
        }}
        @media (prefers-color-scheme: dark) {{
            :root {{
                --bg: #1a1a1a;
                --text: #e0e0e0;
                --link: #66b3ff;
                --link-hover: #99ccff;
                --border: #333333;
                --card-bg: #252525;
            }}
        }}
        * {{
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 1rem;
            background: var(--bg);
            color: var(--text);
        }}
        h1 {{
            margin-bottom: 0.5rem;
        }}
        .subtitle {{
            color: #666;
            margin-bottom: 2rem;
        }}
        @media (prefers-color-scheme: dark) {{
            .subtitle {{
                color: #999;
            }}
        }}
        .tools-list {{
            list-style: none;
            padding: 0;
            margin: 0;
        }}
        .tool-item {{
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1rem 1.25rem;
            margin-bottom: 1rem;
            background: var(--card-bg);
        }}
        .tool-item h2 {{
            margin: 0 0 0.5rem 0;
            font-size: 1.25rem;
        }}
        .tool-item a {{
            color: var(--link);
            text-decoration: none;
        }}
        .tool-item a:hover {{
            color: var(--link-hover);
            text-decoration: underline;
        }}
        .tool-item p {{
            margin: 0;
            color: #666;
            font-size: 0.95rem;
        }}
        @media (prefers-color-scheme: dark) {{
            .tool-item p {{
                color: #999;
            }}
        }}
        .empty-state {{
            text-align: center;
            padding: 3rem 1rem;
            color: #666;
            border: 2px dashed var(--border);
            border-radius: 8px;
        }}
        @media (prefers-color-scheme: dark) {{
            .empty-state {{
                color: #999;
            }}
        }}
        footer {{
            margin-top: 3rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border);
            font-size: 0.9rem;
            color: #666;
        }}
        @media (prefers-color-scheme: dark) {{
            footer {{
                color: #999;
            }}
        }}
        footer a {{
            color: var(--link);
        }}
    </style>
</head>
<body>
    <h1>Vibe Apps</h1>
    <p class="subtitle">Small single-file HTML tools, built with AI assistance</p>

    <ul class="tools-list">
{tools_html if tools_html else '        <li class="empty-state">No tools yet. Add your first tool to the tools/ directory!</li>'}
    </ul>

    <footer>
        <p>
            Built with help from AI. Inspired by
            <a href="https://tools.simonwillison.net" target="_blank" rel="noopener">tools.simonwillison.net</a>.
            View source on <a href="https://github.com/dsyang/vibe-apps" target="_blank" rel="noopener">GitHub</a>.
        </p>
    </footer>
</body>
</html>
"""

def main():
    tools = []

    if TOOLS_DIR.exists():
        for html_file in TOOLS_DIR.glob("*.html"):
            print(f"Found tool: {html_file.name}")
            metadata = extract_metadata(html_file)
            tools.append(metadata)

    print(f"Building index with {len(tools)} tool(s)...")
    index_content = generate_index(tools)
    INDEX_FILE.write_text(index_content, encoding="utf-8")
    print(f"Generated {INDEX_FILE}")

if __name__ == "__main__":
    main()
