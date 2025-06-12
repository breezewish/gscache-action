# gscache-action

A GitHub Action to download and cache the `gscache` binary for Go cache optimization.

## Usage

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Setup gscache
    uses: breezewish/gscache-action@v1
    with:
      version: "v0.0.1" # Optional, defaults to v0.0.1
      github-token: ${{ secrets.GITHUB_TOKEN }} # Optional, helps avoid rate limiting
      config: | # Optional, multi-line configuration
        # Your gscache configuration here
        [server]
        addr = "0.0.0.0:8080"

  - name: Build Go project
    run: go build ./...
```

## Inputs

| Input          | Description                                                                               | Required | Default  |
| -------------- | ----------------------------------------------------------------------------------------- | -------- | -------- |
| `version`      | Version of gscache to download                                                            | No       | `v0.0.1` |
| `github-token` | GitHub token for authenticated requests to avoid rate limiting                            | No       | `""`     |
| `config`       | Multi-line configuration content for gscache (written to `~/.config/gscache/config.toml`) | No       | `""`     |

## What it does

1. Downloads the appropriate `gscache` binary for your runner's architecture (amd64 or arm64)
2. Caches the binary using `@actions/tool-cache` for faster subsequent runs
3. Writes the provided configuration to `~/.config/gscache/config.toml` (if provided)
4. Exports `GOCACHEPROG` environment variable pointing to the gscache binary
5. Adds the binary to PATH for convenience

## Development

```bash
# Install dependencies
npm install

# Build the action
npm run build

# Package for distribution
npm run package
```

## License

MIT
