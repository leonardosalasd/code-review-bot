# Code Review Bot

A GitHub Action that reviews your pull requests using Google Gemini. It reads the diff, sends it to Gemini, and posts review comments directly on the PR.

## Setup

### 1. Get a Gemini API key

Go to [Google AI Studio](https://aistudio.google.com/apikey) and create an API key.

### 2. Add it to your repository secrets

Go to your repo's **Settings > Secrets and variables > Actions** and add a secret called `GEMINI_API_KEY`.

### 3. Create the workflow

Add this file to your repository at `.github/workflows/code-review.yml`:

```yaml
name: Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: leonardosalas/code-review-bot@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
```

That's it. Open a PR and the bot will review it.

## Configuration

| Input | Required | Default | Description |
|---|---|---|---|
| `github-token` | Yes | - | GitHub token for posting reviews. Use `${{ secrets.GITHUB_TOKEN }}`. |
| `gemini-api-key` | Yes | - | Your Google Gemini API key. |
| `model` | No | `gemini-2.0-flash` | Which Gemini model to use. |
| `language` | No | `en` | Language for review comments (`en`, `es`, `pt`, etc.). |
| `exclude-patterns` | No | `''` | Comma-separated globs for files to skip, on top of the built-in exclusions. |

### Built-in exclusions

The bot automatically skips lockfiles (`pnpm-lock.yaml`, `package-lock.json`, etc.), images, fonts, videos, and PDFs. You can add more patterns with `exclude-patterns`:

```yaml
- uses: leonardosalas/code-review-bot@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
    exclude-patterns: '*.generated.ts, docs/**'
```

## Outputs

| Output | Description |
|---|---|
| `review-summary` | The overall review summary. |
| `comments-count` | How many inline comments were posted. |
| `approval-status` | `APPROVE`, `REQUEST_CHANGES`, or `COMMENT`. |

## How It Works

1. The action triggers on `pull_request` events.
2. It fetches the list of changed files from the GitHub API.
3. Files are filtered (lockfiles, images, etc. are skipped).
4. The remaining diffs are sent to Google Gemini in chunks.
5. Gemini returns structured feedback with file paths and line numbers.
6. The action posts a review on the PR with inline comments.

If inline comments fail (e.g. the line is out of diff range), it falls back to a regular PR comment with all the feedback.

## Development

```bash
# Install dependencies
pnpm install

# Type check
pnpm typecheck

# Lint
pnpm lint

# Build (bundle for distribution)
pnpm build
```

The `dist/` directory is committed to the repo. This is required for JavaScript actions — GitHub runs `dist/index.js` directly without installing dependencies.

## Contributing

1. Fork the repo.
2. Create a branch from `main`.
3. Make your changes and run `pnpm lint && pnpm typecheck && pnpm build`.
4. Open a PR.

Please use [conventional commits](https://www.conventionalcommits.org/) for your commit messages (`feat:`, `fix:`, `docs:`, etc.).

## License

[MIT](./LICENSE)

## Support

If you run into issues or have questions, open an issue on this repository or reach out at **leonardo.salas01@outlook.com**.
