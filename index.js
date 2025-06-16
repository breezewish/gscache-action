const core = require("@actions/core");
const tc = require("@actions/tool-cache");
const io = require("@actions/io");
const exec = require("@actions/exec");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { HttpClient } = require("@actions/http-client");
const TOML = require("@iarna/toml");

async function fetchLatestVersion(token) {
  const client = new HttpClient("gscache-action", [], {
    allowRetries: true,
    maxRetries: 5,
  });
  const headers = {};
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }
  try {
    const response = await client.get(
      "https://api.github.com/repos/breezewish/gscache/releases/latest",
      headers,
    );
    if (response.message.statusCode !== 200) {
      throw new Error(
        `Failed to fetch latest gscache version: HTTP ${response.message.statusCode}`,
      );
    }
    const body = await response.readBody();
    const release = JSON.parse(body);
    if (!release.tag_name) {
      throw new Error("Latest release tag not found");
    }
    return release.tag_name;
  } catch (error) {
    throw new Error(`Failed to fetch latest version: ${error.message}`);
  }
}

async function prepareBinary() {
  let version = core.getInput("version") || "latest";
  const token = core.getInput("github-token");

  if (!version) {
    version = "latest";
  }
  if (version === "latest") {
    core.info("Fetching the latest version of gscache...");
    version = await fetchLatestVersion(token);
    core.info(`Resolved latest gscache version: ${version}`);
  }

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
    const normalizedArch = arch === "x64" ? "x86_64" : "arm64";
    const downloadUrl = `https://github.com/breezewish/gscache/releases/download/${version}/gscache_Linux_${normalizedArch}.tar.gz`;

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

    const binaryPath = path.join(extractedPath, "gscache");
    if (!fs.existsSync(binaryPath)) {
      throw new Error(
        `gscache binary not found after extraction ${binaryPath}`,
      );
    }

    core.info(`Extracted gscache to: ${extractedPath}, installing to cache...`);
    cachedPath = await tc.cacheDir(extractedPath, "gscache", version, arch);

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
  const storage = core.getInput("storage");
  const debug = core.getBooleanInput("debug");

  if (!storage) {
    throw new Error("Storage parameter is required");
  }

  // Build the configuration object
  const config = {
    blob: {
      url: storage,
    },
  };
  if (debug) {
    config.log = {
      level: "debug",
    };
  }
  const configToml = TOML.stringify(config);
  const configDir = path.join(os.homedir(), ".config", "gscache");
  const configPath = path.join(configDir, "config.toml");
  await io.mkdirP(configDir);
  fs.writeFileSync(configPath, configToml, "utf8");
  core.info(`Using configuration:\n${configToml}`);
}

async function runImpl() {
  const binaryPath = await prepareBinary();
  await prepareGsCacheConfig();

  // Start the gscache daemon in this step in order to catch any errors early
  core.info("Try starting gscache daemon...");
  try {
    await exec.exec(binaryPath, ["daemon", "start"]);
    core.info("gscache daemon started successfully");
  } catch (error) {
    throw new Error(`Failed to start gscache daemon: ${error.message}`);
  }

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
