import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseArgs, stringArg } from "./shared/cli.ts";
import { hoistVersionedSurfaceAssets } from "./shared/surface-assets.ts";

export type Surface = "main" | "docs" | "guides";

export type PruneSurfaceOptions = {
  surface: Surface;
  distDirectory?: string;
  budgetMb?: number;
  base?: string;
  docsRoot?: string;
  customDomain?: string;
};

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

if (isMainModule()) {
  const options = parseArgs(process.argv.slice(2));
  await pruneSurface({
    surface: parseSurface(
      stringArg(options.surface) || process.env.MICRONAUT_DEPLOY_SURFACE,
    ),
    distDirectory:
      stringArg(options.dist) || path.join(projectDirectory, "dist"),
    budgetMb: numberOption(
      stringArg(options.budgetMb) || process.env.MICRONAUT_SURFACE_BUDGET_MB,
      300,
    ),
    base: process.env.ASTRO_BASE || "/",
    docsRoot: process.env.MICRONAUT_DOCS_ROOT || "/latest",
    customDomain: process.env.MICRONAUT_CUSTOM_DOMAIN,
  });
}

export async function pruneSurface({
  surface,
  distDirectory = path.join(projectDirectory, "dist"),
  budgetMb = 300,
  base = process.env.ASTRO_BASE || "/",
  docsRoot = process.env.MICRONAUT_DOCS_ROOT || "/latest",
  customDomain = process.env.MICRONAUT_CUSTOM_DOMAIN,
}: PruneSurfaceOptions): Promise<void> {
  if (surface === "main") {
    await pruneMain(distDirectory, customDomain);
  } else if (surface === "docs") {
    await pruneDocs(distDirectory, base, docsRoot, customDomain);
  } else {
    await pruneGuides(distDirectory, base, customDomain);
  }

  await pruneUnreferencedAstroAssets(distDirectory);

  const bytes = await directorySize(distDirectory);
  const mib = bytes / 1024 / 1024;
  console.log(
    `Prepared ${surface} surface artifact at ${distDirectory} (${mib.toFixed(1)} MiB).`,
  );
  if (budgetMb > 0 && mib > budgetMb) {
    throw new Error(
      `${surface} surface artifact is ${mib.toFixed(1)} MiB, above the ${budgetMb} MiB budget.`,
    );
  }
}

async function pruneMain(
  directory: string,
  customDomain?: string,
): Promise<void> {
  await Promise.all(
    ["docs", "guides", "latest", "micronaut-web", "versions.json"].map(
      (entry) =>
        fs.rm(path.join(directory, entry), { force: true, recursive: true }),
    ),
  );
  await writeNoJekyll(directory);
  await writeCustomDomain(directory, customDomain);
}

async function pruneDocs(
  directory: string,
  base: string,
  docsRoot: string,
  customDomain?: string,
): Promise<void> {
  const root = normalizedRoot(docsRoot);
  const targetDirectory = root === "/" ? "" : root.replace(/^\/+/, "");
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-docs-surface-"),
  );
  try {
    await copyIfExists(
      path.join(directory, "_astro"),
      path.join(temporaryDirectory, "_astro"),
    );
    await copyIfExists(
      path.join(directory, "versions.json"),
      path.join(temporaryDirectory, "versions.json"),
    );
    const sourceDocsDirectory = path.join(directory, "docs");
    await copyChildren(
      sourceDocsDirectory,
      path.join(temporaryDirectory, targetDirectory),
    );
    await hoistVersionedSurfaceAssets({
      directory: temporaryDirectory,
      versionRoot: targetDirectory,
    });
    await copyIfExists(
      path.join(sourceDocsDirectory, "index.html"),
      path.join(temporaryDirectory, "index.html"),
    );
    await writeRedirect(
      path.join(temporaryDirectory, targetDirectory, "guide", "index.html"),
      withBase(base, joinUrlPath(root, "/core/")),
      "Micronaut Core docs",
    );
    await writeRedirect(
      path.join(temporaryDirectory, "latest", "guide", "index.html"),
      withBase(base, "/latest/core/"),
      "Micronaut latest docs",
    );
    if (root !== "/") {
      await writeRedirect(
        path.join(temporaryDirectory, `${root.replace(/^\/+|\/+$/g, "")}.html`),
        withBase(base, directoryRoot(root)),
        "Micronaut docs",
      );
    }
    await writeNoJekyll(temporaryDirectory);
    await writeCustomDomain(temporaryDirectory, customDomain);
    await replaceDirectory(directory, temporaryDirectory);
  } catch (error) {
    await fs.rm(temporaryDirectory, { force: true, recursive: true });
    throw error;
  }
}

async function pruneGuides(
  directory: string,
  base: string,
  customDomain?: string,
): Promise<void> {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-guides-surface-"),
  );
  try {
    await copyIfExists(
      path.join(directory, "_astro"),
      path.join(temporaryDirectory, "_astro"),
    );
    await copyIfExists(
      path.join(directory, "guides"),
      path.join(temporaryDirectory, "latest"),
    );
    await hoistVersionedSurfaceAssets({
      directory: temporaryDirectory,
      versionRoot: "latest",
    });
    await fs.rm(path.join(temporaryDirectory, "latest", "guide"), {
      force: true,
      recursive: true,
    });
    await writeRedirect(
      path.join(temporaryDirectory, "index.html"),
      withBase(base, "/latest/"),
      "Micronaut latest guides",
    );
    await writeNoJekyll(temporaryDirectory);
    await writeCustomDomain(temporaryDirectory, customDomain);
    await replaceDirectory(directory, temporaryDirectory);
  } catch (error) {
    await fs.rm(temporaryDirectory, { force: true, recursive: true });
    throw error;
  }
}

async function pruneUnreferencedAstroAssets(directory: string): Promise<void> {
  const astroDirectory = path.join(directory, "_astro");
  if (!(await existsDirectory(astroDirectory))) {
    return;
  }

  const astroFiles = await listFiles(astroDirectory);
  const knownAssets = new Set(
    astroFiles.map((file) => toPosixPath(path.relative(astroDirectory, file))),
  );
  const reachableAssets = new Set<string>();
  const pendingAssets: string[] = [];
  const addReachableAsset = (asset: string | undefined) => {
    const normalized = normalizeAstroAsset(asset);
    if (
      !normalized ||
      !knownAssets.has(normalized) ||
      reachableAssets.has(normalized)
    ) {
      return;
    }
    reachableAssets.add(normalized);
    pendingAssets.push(normalized);
  };

  const files = await listFiles(directory);
  for (const file of files) {
    if (path.extname(file) !== ".html") {
      continue;
    }
    addAstroReferences(await fs.readFile(file, "utf8"), addReachableAsset);
  }

  for (let index = 0; index < pendingAssets.length; index += 1) {
    const asset = pendingAssets[index];
    if (!isTextAsset(asset)) {
      continue;
    }
    const content = await fs.readFile(
      path.join(astroDirectory, ...asset.split("/")),
      "utf8",
    );
    addAstroReferences(content, addReachableAsset);
    addRelativeReferences(content, asset, addReachableAsset);
  }

  await Promise.all(
    [...knownAssets]
      .filter((asset) => !reachableAssets.has(asset))
      .map((asset) =>
        fs.rm(path.join(astroDirectory, ...asset.split("/")), {
          force: true,
        }),
      ),
  );
  await removeEmptyDirectories(astroDirectory, astroDirectory);
}

async function copyChildren(source: string, target: string): Promise<void> {
  const entries = await fs.readdir(source, { withFileTypes: true });
  await fs.mkdir(target, { recursive: true });
  await Promise.all(
    entries.map((entry) =>
      fs.cp(path.join(source, entry.name), path.join(target, entry.name), {
        recursive: true,
      }),
    ),
  );
}

async function copyIfExists(source: string, target: string): Promise<void> {
  try {
    await fs.cp(source, target, { recursive: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

async function existsDirectory(directory: string): Promise<boolean> {
  try {
    return (await fs.stat(directory)).isDirectory();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listFiles(fullPath);
      }
      return entry.isFile() ? [fullPath] : [];
    }),
  );
  return files.flat();
}

async function replaceDirectory(
  target: string,
  replacement: string,
): Promise<void> {
  const swap = await fs.mkdtemp(
    path.join(path.dirname(target), ".surface-swap-"),
  );
  await fs.rm(swap, { force: true, recursive: true });
  await fs.rename(target, swap);
  try {
    await fs.rename(replacement, target);
  } catch (error) {
    await fs.rename(swap, target);
    throw error;
  }
  await fs.rm(swap, { force: true, recursive: true });
}

async function writeRedirect(
  file: string,
  destination: string,
  title: string,
): Promise<void> {
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

async function writeCustomDomain(
  directory: string,
  customDomain?: string,
): Promise<void> {
  if (!customDomain) {
    return;
  }
  await fs.writeFile(
    path.join(directory, "CNAME"),
    `${customDomain.trim()}\n`,
    "utf8",
  );
}

async function writeNoJekyll(directory: string): Promise<void> {
  await fs.writeFile(path.join(directory, ".nojekyll"), "", "utf8");
}

async function directorySize(directory: string): Promise<number> {
  let total = 0;
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      total += await directorySize(fullPath);
    } else if (entry.isFile()) {
      total += (await fs.stat(fullPath)).size;
    }
  }
  return total;
}

async function removeEmptyDirectories(
  directory: string,
  root: string,
): Promise<void> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) =>
        removeEmptyDirectories(path.join(directory, entry.name), root),
      ),
  );
  if (directory === root) {
    return;
  }
  if ((await fs.readdir(directory)).length === 0) {
    await fs.rmdir(directory);
  }
}

function withBase(base: string, target: string) {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedTarget = target.replace(/^\/+/, "");
  return `${normalizedBase}${normalizedTarget}`.replace(/\/{2,}/g, "/");
}

function joinUrlPath(root: string, suffix: string) {
  const normalizedRoot = normalizedRootPath(root);
  const normalizedSuffix = normalizedRootPath(suffix);
  if (normalizedRoot === "/") {
    return normalizedSuffix;
  }
  return `${normalizedRoot.replace(/\/+$/, "")}${normalizedSuffix}`;
}

function directoryRoot(root: string) {
  const normalized = normalizedRoot(root);
  return normalized === "/" ? "/" : `${normalized.replace(/\/+$/, "")}/`;
}

function normalizedRoot(root: string) {
  const normalized = normalizedRootPath(root || "/");
  return normalized === "/" ? "/" : normalized.replace(/\/+$/, "");
}

function normalizedRootPath(value: string) {
  if (!value) {
    return "/";
  }
  return `/${value}`.replace(/\/{2,}/g, "/");
}

function addAstroReferences(
  content: string,
  addReachableAsset: (asset: string | undefined) => void,
) {
  const references = /_astro\/([^"'`<>\s?#)]+)/g;
  let match: RegExpExecArray | null;
  while ((match = references.exec(content))) {
    addReachableAsset(match[1]);
  }
}

function addRelativeReferences(
  content: string,
  fromAsset: string,
  addReachableAsset: (asset: string | undefined) => void,
) {
  const quotedReferences = /["'`]([^"'`]+)["'`]/g;
  let match: RegExpExecArray | null;
  while ((match = quotedReferences.exec(content))) {
    addReachableAsset(resolveRelativeAsset(fromAsset, match[1]));
  }

  const cssUrls = /url\(\s*["']?([^"')]+)["']?\s*\)/g;
  while ((match = cssUrls.exec(content))) {
    addReachableAsset(resolveRelativeAsset(fromAsset, match[1]));
  }
}

function resolveRelativeAsset(fromAsset: string, reference: string) {
  if (!reference.startsWith("./") && !reference.startsWith("../")) {
    return undefined;
  }
  return path.posix.normalize(
    path.posix.join(path.posix.dirname(fromAsset), reference),
  );
}

function normalizeAstroAsset(asset: string | undefined) {
  if (!asset) {
    return undefined;
  }
  const withoutHash = asset.split(/[?#]/, 1)[0];
  const decoded = decodeUrlPath(withoutHash).replace(/\\/g, "/");
  const astroIndex = decoded.indexOf("_astro/");
  const relative =
    astroIndex >= 0 ? decoded.slice(astroIndex + "_astro/".length) : decoded;
  const normalized = path.posix.normalize(relative.replace(/^\/+/, ""));
  if (
    !normalized ||
    normalized === "." ||
    normalized.startsWith("../") ||
    path.posix.isAbsolute(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

function decodeUrlPath(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isTextAsset(asset: string) {
  return /\.(?:css|html|js|json|mjs|svg|txt)$/i.test(asset);
}

function toPosixPath(value: string) {
  return value.split(path.sep).join("/");
}

function parseSurface(value: string | undefined): Surface {
  if (value === "main" || value === "docs" || value === "guides") {
    return value;
  }
  throw new Error(
    `Expected --surface to be one of main, docs, or guides; received ${value || "nothing"}.`,
  );
}

function numberOption(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
