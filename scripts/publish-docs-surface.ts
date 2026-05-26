import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseArgs, stringArg } from "./shared/cli.ts";
import { extractInlineAssets } from "./shared/inline-assets.ts";
import {
  mergeSharedSurfaceAssets,
  pruneUnusedHashedSurfaceAssets,
} from "./shared/surface-assets.ts";
import { buildDocsVersionOptions } from "./update-docs-version-manifest.ts";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

if (isMainModule()) {
  const options = parseArgs(process.argv.slice(2));
  await publishDocsSurface({
    distDirectory:
      stringArg(options.dist) || path.join(projectDirectory, "dist"),
    publishedDirectory:
      stringArg(options.publishedDir) || process.env.PUBLISHED_DOCS_DIR,
    version: stringArg(options.version) || process.env.MICRONAUT_DOCS_VERSION,
    base:
      stringArg(options.base) || process.env.ASTRO_BASE || "/micronaut-docs/",
    latest: stringArg(options.latest) !== "false",
  });
}

export async function publishDocsSurface({
  distDirectory,
  publishedDirectory,
  version,
  base = "/micronaut-docs/",
  latest = true,
}: {
  distDirectory: string;
  publishedDirectory?: string;
  version?: string;
  base?: string;
  latest?: boolean;
}): Promise<void> {
  if (!publishedDirectory) {
    throw new Error("Expected --published-dir or PUBLISHED_DOCS_DIR.");
  }
  const publishVersion = sanitizeVersion(version);
  await fs.mkdir(publishedDirectory, { recursive: true });

  await copyIfExists(
    path.join(distDirectory, "_astro"),
    path.join(publishedDirectory, "_astro"),
  );
  await mergeSharedSurfaceAssets({
    sourceDirectory: distDirectory,
    targetDirectory: publishedDirectory,
  });
  await copyIfExists(
    path.join(distDirectory, "index.html"),
    path.join(publishedDirectory, "index.html"),
  );
  await copyIfExists(
    path.join(distDirectory, "latest.html"),
    path.join(publishedDirectory, "latest.html"),
  );
  await writeNoJekyll(publishedDirectory);

  const versionSource = await docsRootSource(distDirectory, publishVersion);
  await replaceIfExists(
    versionSource,
    path.join(publishedDirectory, publishVersion),
  );
  await writeRedirect(
    path.join(publishedDirectory, `${publishVersion}.html`),
    withBase(base, `/${publishVersion}/`),
    `Micronaut ${publishVersion} docs`,
  );

  if (latest) {
    await replaceIfExists(
      versionSource,
      path.join(publishedDirectory, "latest"),
    );
    await writeRedirect(
      path.join(publishedDirectory, "latest.html"),
      withBase(base, "/latest/"),
      "Micronaut latest docs",
    );
  }

  await writeVersionsJson(publishedDirectory, publishVersion, latest);
  await extractInlineAssets({ directory: publishedDirectory });
  await pruneUnusedHashedSurfaceAssets(publishedDirectory);
}

async function docsRootSource(distDirectory: string, version: string) {
  const versionDirectory = path.join(distDirectory, version);
  if (await exists(versionDirectory)) {
    return versionDirectory;
  }
  const latestDirectory = path.join(distDirectory, "latest");
  if (await exists(latestDirectory)) {
    return latestDirectory;
  }
  throw new Error(
    `Expected docs artifact to contain ${versionDirectory} or ${latestDirectory}.`,
  );
}

async function writeVersionsJson(
  directory: string,
  version: string,
  latest: boolean,
) {
  const payload = {
    versions: await buildDocsVersionOptions({
      publishedDirectory: directory,
      version,
      latest,
    }),
  };
  await fs.writeFile(
    path.join(directory, "versions.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

async function replaceIfExists(source: string, target: string) {
  if (!(await exists(source))) {
    return;
  }
  await fs.rm(target, { force: true, recursive: true });
  await fs.cp(source, target, { recursive: true });
}

async function copyIfExists(source: string, target: string) {
  if (!(await exists(source))) {
    return;
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true });
}

async function exists(file: string) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function writeRedirect(file: string, destination: string, title: string) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '  <meta charset="UTF-8" />',
      '  <meta name="robots" content="noindex" />',
      `  <meta http-equiv="refresh" content="0;url=${htmlAttribute(destination)}" />`,
      `  <title>Redirecting to ${htmlText(title)}</title>`,
      "  <script>",
      `    window.location.replace(${JSON.stringify(destination)} + window.location.search + window.location.hash);`,
      "  </script>",
      "</head>",
      "<body>",
      `  <a href="${htmlAttribute(destination)}">Continue to ${htmlText(title)}</a>`,
      "</body>",
      "</html>",
      "",
    ].join("\n"),
    "utf8",
  );
}

async function writeNoJekyll(directory: string) {
  await fs.writeFile(path.join(directory, ".nojekyll"), "", "utf8");
}

function withBase(base: string, target: string) {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedTarget = target.replace(/^\/+/, "");
  return `${normalizedBase}${normalizedTarget}`.replace(/\/{2,}/g, "/");
}

function sanitizeVersion(version: string | undefined) {
  if (!version || !/^\d+\.\d+(?:\.\d+)?(?:[-.][A-Za-z0-9]+)?$/.test(version)) {
    throw new Error(
      `Expected --version to be a Micronaut version such as 4.10.14; received ${version || "nothing"}.`,
    );
  }
  return version;
}

function htmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function htmlText(value: string) {
  return htmlAttribute(value);
}

function isMainModule() {
  return process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;
}
