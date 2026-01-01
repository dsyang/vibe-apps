# Vibe Apps

A collection of small, single-file HTML tools built with AI assistance. Inspired by [tools.simonwillison.net](https://tools.simonwillison.net).

## Philosophy

- **Single-file design**: Each tool is a self-contained HTML file with inline CSS and JavaScript
- **No build step**: No React, no bundlers - just HTML you can open in a browser
- **CDN dependencies**: When needed, load libraries from CDNs like cdnjs or jsDelivr
- **Keep it small**: A few hundred lines per tool for maintainability

## Adding a New Tool

1. Create a new `.html` file in the `tools/` directory
2. Include these required meta tags for the index to pick up your tool:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Brief description of what the tool does">
    <title>Tool Name - Vibe Apps</title>
    <style>
        /* Your styles here */
    </style>
</head>
<body>
    <a href="../">&larr; Back to all tools</a>
    <h1>Tool Name</h1>

    <!-- Your tool UI here -->

    <script>
        // Your JavaScript here
    </script>
</body>
</html>
```

3. Create a PR - the index page is auto-generated from your tool's metadata!

The build script (`build.py`) automatically:
- Scans the `tools/` directory for `.html` files
- Extracts the title from `<title>` (strips " - Vibe Apps" suffix)
- Extracts the description from `<meta name="description">`
- Generates `index.html` with all tools listed alphabetically

## Deployment

The site automatically deploys to GitHub Pages when PRs are merged to `main`.

- **Build**: Runs on every push and PR
- **Deploy**: Only deploys on merge to `main`
- **URL**: `https://dsyang.github.io/vibe-apps/`

### Enabling GitHub Pages (one-time setup)

1. Go to repository Settings → Pages
2. Under "Build and deployment", set Source to "GitHub Actions"

## Tips for Vibe Coding Tools

From [Simon Willison's tips](https://simonwillison.net/2025/Dec/10/html-tools/):

- **Start with AI**: Use Claude Artifacts or similar to prototype quickly
- **Say "No React"**: Keep prompts simple to avoid unnecessary complexity
- **URL persistence**: Store state in URL params for sharing/bookmarking
- **LocalStorage for secrets**: Keep API keys client-side
- **File handling**: Use `<input type="file">` for local processing
- **Copy-paste interface**: Use clipboard operations for input/output

## Ideas

- A feature similar to Instagram Stories for sharing with family members who are not on Instagram
- A clone of [time.is](https://time.is) for precise time tracking

## License

MIT
