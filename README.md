# gscache-action

Automatically set up gscache in your GitHub Actions workflow to speed up Go builds.

## Usage

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Setup gscache
    uses: breezewish/gscache-action@v1
    with:
      version: v0.0.1
      github-token: ${{ secrets.GITHUB_TOKEN }} # Avoid rate limiting when downloading the binary
      config: |
        # See below

  - name: Build Go project
    run: go build ./...
```

## Config

Use S3:

```yaml
  - name: Setup gscache
    uses: breezewish/gscache-action@v1
    with:
      ...
      config: |
        [backend]
        which = "blob"
        [backend.blob]
        url = "s3://my-bucket"
```
