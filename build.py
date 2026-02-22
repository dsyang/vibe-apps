#!/usr/bin/env python3
"""
Build script to generate index.html from tools in the tools/ directory.

Each tool should have:
- A <title> tag (will strip " - Small Tools" suffix)
- A <meta name="description" content="..."> tag
"""

import re
import shutil
from pathlib import Path

TOOLS_DIR = Path("tools")
INDEX_FILE = Path("index.html")
SITE_DIR = Path("_site")

# Google Analytics GA4 tracking code
ANALYTICS_SNIPPET = """    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-09L8FQCBH4"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-09L8FQCBH4');
    </script>
"""

def inject_analytics(html_content):
    """Inject Google Analytics tracking code into HTML content."""
    # Check if analytics is already present
    if 'googletagmanager.com/gtag/js' in html_content:
        return html_content

    # Inject before closing </head> tag
    head_close_pattern = re.compile(r'(</head>)', re.IGNORECASE)
    if head_close_pattern.search(html_content):
        return head_close_pattern.sub(f'{ANALYTICS_SNIPPET}\\1', html_content)

    return html_content

def extract_metadata(html_path):
    """Extract title and description from an HTML file."""
    content = html_path.read_text(encoding="utf-8")

    # Extract title
    title_match = re.search(r"<title>(.+?)</title>", content, re.IGNORECASE)
    if title_match:
        title = title_match.group(1)
        # Remove " - Small Tools" suffix if present
        title = re.sub(r"\s*-\s*Small Tools$", "", title, flags=re.IGNORECASE)
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
        tools_html += f"""        <li class="tool-item" data-path="{tool['path']}">
            <div class="tool-card">
                <a href="{tool['path']}" class="tool-link">
                    <h2>{tool['title']}</h2>
                    <p>{tool['description']}</p>
                </a>
                <button class="pin-btn" aria-label="Pin {tool['title']}" title="Pin to top">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
                    </svg>
                </button>
            </div>
        </li>
"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Small Tools Collection</title>
{ANALYTICS_SNIPPET}
    <style>
        :root {{
            --bg: #fafafa;
            --text: #1a1a1a;
            --link: #0066cc;
            --link-hover: #004499;
            --border: #e0e0e0;
            --card-bg: #ffffff;
            --pin-color: #aaa;
            --pin-active-color: #f59e0b;
            --pinned-border: #f59e0b;
            --pinned-bg: #fffbeb;
            --section-label: #888;
        }}
        @media (prefers-color-scheme: dark) {{
            :root {{
                --bg: #1a1a1a;
                --text: #e0e0e0;
                --link: #66b3ff;
                --link-hover: #99ccff;
                --border: #333333;
                --card-bg: #252525;
                --pin-color: #666;
                --pin-active-color: #f59e0b;
                --pinned-border: #92610a;
                --pinned-bg: #2a2008;
                --section-label: #666;
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
        .section-label {{
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--section-label);
            margin: 1.5rem 0 0.5rem;
        }}
        .section-label:first-child {{
            margin-top: 0;
        }}
        .tools-list {{
            list-style: none;
            padding: 0;
            margin: 0;
        }}
        .tool-item {{
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 1rem;
            background: var(--card-bg);
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }}
        .tool-item:hover {{
            border-color: var(--link);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }}
        .tool-item.pinned {{
            border-color: var(--pinned-border);
            background: var(--pinned-bg);
        }}
        .tool-item.pinned:hover {{
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
        }}
        @media (prefers-color-scheme: dark) {{
            .tool-item:hover {{
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }}
        }}
        .tool-card {{
            display: flex;
            align-items: center;
        }}
        .tool-link {{
            display: block;
            flex: 1;
            padding: 1rem 1.25rem;
            color: inherit;
            text-decoration: none;
            min-width: 0;
        }}
        .tool-item h2 {{
            margin: 0 0 0.5rem 0;
            font-size: 1.25rem;
            color: var(--link);
        }}
        .tool-item:hover h2 {{
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
        .pin-btn {{
            flex-shrink: 0;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.75rem 1rem;
            color: var(--pin-color);
            border-radius: 0 8px 8px 0;
            transition: color 0.15s ease, background 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
        }}
        .tool-item:hover .pin-btn,
        .tool-item.pinned .pin-btn {{
            opacity: 1;
        }}
        .pin-btn:hover {{
            color: var(--pin-active-color);
            background: rgba(245, 158, 11, 0.1);
        }}
        .pin-btn.active {{
            color: var(--pin-active-color);
        }}
        @media (hover: none) {{
            .pin-btn {{
                opacity: 1;
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
    <h1>Small Tools</h1>
    <p class="subtitle">Small single-file HTML tools, built with AI assistance</p>

    <ul class="tools-list" id="tools-list">
{tools_html if tools_html else '        <li class="empty-state">No tools yet. Add your first tool to the tools/ directory!</li>'}
    </ul>

    <footer>
        <p>
            Built with help from AI. Inspired by
            <a href="https://tools.simonwillison.net" target="_blank" rel="noopener">tools.simonwillison.net</a>.
            View source on <a href="https://github.com/dsyang/vibe-apps" target="_blank" rel="noopener">GitHub</a>.
        </p>
    </footer>

    <script>
        (function () {{
            var STORAGE_KEY = 'pinnedTools';

            function getPinned() {{
                try {{
                    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                }} catch (e) {{
                    return [];
                }}
            }}

            function setPinned(pinned) {{
                localStorage.setItem(STORAGE_KEY, JSON.stringify(pinned));
            }}

            function applyPinned() {{
                var pinned = getPinned();
                var list = document.getElementById('tools-list');
                var items = Array.from(list.querySelectorAll('.tool-item[data-path]'));

                // Remove any existing section labels
                list.querySelectorAll('.section-label-item').forEach(function (el) {{
                    el.remove();
                }});

                // Separate pinned and unpinned items
                var pinnedItems = [];
                var unpinnedItems = [];

                items.forEach(function (item) {{
                    var path = item.getAttribute('data-path');
                    var btn = item.querySelector('.pin-btn');
                    if (pinned.indexOf(path) !== -1) {{
                        item.classList.add('pinned');
                        btn.classList.add('active');
                        btn.title = 'Unpin';
                        pinnedItems.push(item);
                    }} else {{
                        item.classList.remove('pinned');
                        btn.classList.remove('active');
                        btn.title = 'Pin to top';
                        unpinnedItems.push(item);
                    }}
                }});

                // Re-insert items in order: pinned first, then the rest
                var fragment = document.createDocumentFragment();

                if (pinnedItems.length > 0) {{
                    var pinnedLabel = document.createElement('li');
                    pinnedLabel.className = 'section-label-item';
                    pinnedLabel.innerHTML = '<p class="section-label">Pinned</p>';
                    fragment.appendChild(pinnedLabel);
                    pinnedItems.forEach(function (el) {{ fragment.appendChild(el); }});
                }}

                if (unpinnedItems.length > 0 && pinnedItems.length > 0) {{
                    var allLabel = document.createElement('li');
                    allLabel.className = 'section-label-item';
                    allLabel.innerHTML = '<p class="section-label">All Tools</p>';
                    fragment.appendChild(allLabel);
                }}

                unpinnedItems.forEach(function (el) {{ fragment.appendChild(el); }});
                list.appendChild(fragment);
            }}

            function togglePin(path) {{
                var pinned = getPinned();
                var idx = pinned.indexOf(path);
                if (idx === -1) {{
                    pinned.push(path);
                }} else {{
                    pinned.splice(idx, 1);
                }}
                setPinned(pinned);
                applyPinned();
            }}

            // Attach click handlers to all pin buttons
            document.querySelectorAll('.pin-btn').forEach(function (btn) {{
                btn.addEventListener('click', function (e) {{
                    e.preventDefault();
                    e.stopPropagation();
                    var item = btn.closest('.tool-item');
                    var path = item.getAttribute('data-path');
                    togglePin(path);
                }});
            }});

            // Apply on load
            applyPinned();
        }})();
    </script>
</body>
</html>
"""

def main():
    tools = []

    # Create _site directory structure
    print("Creating _site directory structure...")
    SITE_DIR.mkdir(exist_ok=True)
    (SITE_DIR / "tools").mkdir(exist_ok=True)

    # Process tool files
    if TOOLS_DIR.exists():
        for html_file in TOOLS_DIR.glob("*.html"):
            print(f"Found tool: {html_file.name}")
            metadata = extract_metadata(html_file)
            tools.append(metadata)

            # Read original tool HTML
            tool_content = html_file.read_text(encoding="utf-8")

            # Inject analytics
            tool_content_with_analytics = inject_analytics(tool_content)

            # Write processed tool to _site/tools/
            output_path = SITE_DIR / "tools" / html_file.name
            output_path.write_text(tool_content_with_analytics, encoding="utf-8")
            print(f"  Processed {html_file.name} -> {output_path}")

    # Generate index.html with analytics
    print(f"Building index with {len(tools)} tool(s)...")
    index_content = generate_index(tools)

    # Write to both root (for compatibility) and _site/
    INDEX_FILE.write_text(index_content, encoding="utf-8")
    print(f"Generated {INDEX_FILE}")

    site_index = SITE_DIR / "index.html"
    site_index.write_text(index_content, encoding="utf-8")
    print(f"Generated {site_index}")

if __name__ == "__main__":
    main()
