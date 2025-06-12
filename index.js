const core = require("@actions/core");
const tc = require("@actions/tool-cache");
const io = require("@actions/io");
const fs = require("fs");
const path = require("path");
const os = require("os");

async function prepareBinary() {
  const version = core.getInput("version") || "v0.0.1";
  const token = core.getInput("github-token");

  core.info(`Setting up gscache using version ${version}`);

  // Determine architecture
  const platform = process.platform;
  if (platform !== "linux") {
    throw new Error(
      `Unsupported platform: ${platform}. Only Linux is currently supported.`,
    );
  }

  const arch = process.arch;
  if (arch !== "x64" && arch !== "arm64") {
    throw new Error(
      `Unsupported architecture: ${arch}. Only x64 (amd64) and arm64 are supported.`,
    );
  }

  let cachedPath = tc.find("gscache", version, arch);

  if (cachedPath) {
    core.info(`Reuse previously downloaded gscache at: ${cachedPath}`);
  } else {
    const normalizedArch = arch === "x64" ? "amd64" : "arm64";
    const downloadUrl = `https://github.com/breezewish/gscache/releases/download/${version}/gscache-linux-${normalizedArch}.tar.gz`;

    core.info(`Downloading gscache from: ${downloadUrl}`);

    const auth = token ? `token ${token}` : undefined;
    if (token) {
      core.info("Using provided GitHub token for downloading.");
    } else {
      core.warning(
        "No GitHub token provided, downloading may encounter rate limits.",
      );
    }

    const downloadPath = await tc.downloadTool(downloadUrl, undefined, auth);

    core.info(`Downloaded gscache to: ${downloadPath}, extracting...`);
    const extractedPath = await tc.extractTar(downloadPath);

    core.info(`Extracted gscache to: ${extractedPath}, installing to cache...`);
    cachedPath = await tc.cacheDir(extractedPath, "gscache", version, arch);

    // FIXME: This is an upstream package error, we should always package the binary as gscache
    // Move from gscache-linux-arm64 to gscache
    const oldBinaryPath = path.join(
      cachedPath,
      `gscache-linux-${normalizedArch}`,
    );
    const newBinaryPath = path.join(cachedPath, "gscache");
    if (fs.existsSync(oldBinaryPath)) {
      fs.renameSync(oldBinaryPath, newBinaryPath);
      core.info(`Renamed ${oldBinaryPath} to ${newBinaryPath}`);
    } else {
      core.warning(
        `Expected binary not found at ${oldBinaryPath}, skipping rename.`,
      );
    }

    if (!cachedPath) {
      throw new Error("Failed to cache gscache binary.");
    }
    core.info(`gscache is now cached at: ${cachedPath}`);
  }

  const binaryPath = path.join(cachedPath, "gscache");
  if (!fs.existsSync(binaryPath)) {
    throw new Error(`gscache binary not found at ${binaryPath}`);
  }
  fs.chmodSync(binaryPath, "755");

  core.addPath(path.dirname(binaryPath));

  return binaryPath;
}

async function prepareGsCacheConfig() {
  const config = core.getInput("config");
  if (!config) {
    core.info("No configuration provided.");
    return;
  }
  const configDir = path.join(os.homedir(), ".config", "gscache");
  const configPath = path.join(configDir, "config.toml");
  await io.mkdirP(configDir);
  fs.writeFileSync(configPath, config, "utf8");
  core.info(`Using configuration:\n${config}`);
}

async function runImpl() {
  const binaryPath = await prepareBinary();
  await prepareGsCacheConfig();
  core.exportVariable("GOCACHEPROG", `${binaryPath} prog`);
  core.info(`Exported GOCACHEPROG=${binaryPath} prog`);
  core.info("gscache setup completed successfully");
}

async function run() {
  try {
    await runImpl();
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
