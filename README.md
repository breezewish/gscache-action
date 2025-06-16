# gscache-action

Automatically set up gscache in your GitHub Actions workflow to speed up Go builds.

## Usage

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: actions/setup-go@v4

  - name: Setup gscache
    uses: breezewish/gscache-action@v1
    with:
      github-token: ${{ secrets.GITHUB_TOKEN }} # Avoid rate limiting when downloading the binary
      storage: s3://my-bucket?prefix=gscache/&region=us-west-2

  - name: Build Go project
    run: go build ./...
```

**Storage: Google Cloud Storage:**

```yaml
steps:
  - uses: breezewish/gscache-action@v1
    with:
      # ...
      storage: gs://my-bucket?prefix=gscache/
```

**Storage: Minio:**

```yaml
steps:
  - uses: breezewish/gscache-action@v1
    with:
      # ...
      storage: s3://gscache-bucket?prefix=gscache/&endpoint=http://localhost:9000&&use_path_style=true&disable_https=true
```

**Specify gscache version:**

```yaml
steps:
  - uses: breezewish/gscache-action@v1
    with:
      # ...
      version: v0.0.4 # Default to 'latest'
```

**Enable debug logging:**

```yaml
steps:
  - uses: breezewish/gscache-action@v1
    with:
      # ...
      debug: true
```
