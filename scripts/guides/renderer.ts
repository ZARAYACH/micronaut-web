import { promises as fs } from "node:fs";
import path from "node:path";

import { highlightListingBlocks, optimizeGeneratedGuideHtml, shikiStyle } from "./shared-rendering.ts";
import { preprocessGuideSource } from "./preprocessor.ts";
import type { Guide, GuideOption } from "./model.ts";

export async function renderGuideOption(
  asciidoctor,
  guidesDirectory: string,
  guide: Guide,
  option: GuideOption,
  renderOptions: { strict?: boolean } = {}
): Promise<string> {
  const source = await preprocessGuideSource({ guidesDirectory, guide, option });
  const logger = asciidoctor.MemoryLogger.create();
  const previousLogger = asciidoctor.LoggerManager.getLogger();
  let html;
  try {
    asciidoctor.LoggerManager.setLogger(logger);
    html = String(asciidoctor.convert(source, {
      attributes: {
        icons: "font",
        idprefix: "",
        idseparator: "-",
        sourceDir: option.sourceDir,
        sourcedir: guide.directory
      },
      base_dir: guide.directory,
      header_footer: false,
      safe: "unsafe"
    }));
  } finally {
    asciidoctor.LoggerManager.setLogger(previousLogger);
  }

  const diagnostics = logger.getMessages().map(formatAsciidoctorDiagnostic);
  if (diagnostics.length) {
    if (renderOptions.strict) {
      throw new Error(`Asciidoctor diagnostics for ${option.id}: ${diagnostics.join("; ")}`);
    }
    for (const diagnostic of diagnostics) {
      console.warn(diagnostic);
    }
  }

  html = await highlightListingBlocks(html);
  html = rewriteGuideUrls(html, guide.slug);
  html = optimizeGeneratedGuideHtml(html);
  return `${shikiStyle()}\n${html.trim()}`;
}

function formatAsciidoctorDiagnostic(message) {
  const severity = message.getSeverity();
  const location = message.getSourceLocation?.();
  const pathName = location?.getPath?.();
  const lineNumber = location?.getLineNumber?.();
  const source = pathName ? `${pathName}${lineNumber ? `:${lineNumber}` : ""}: ` : "";
  return `asciidoctor: ${severity}: ${source}${message.getText()}`;
}

export async function copyGuideAssets(
  guidesDirectory: string,
  guide: Guide,
  outputDirectory: string,
  options: GuideOption[] = []
): Promise<void> {
  const targetRoot = path.join(outputDirectory, "assets", guide.slug);
  await copyIfExists(path.join(guide.directory, "images"), path.join(targetRoot, "images"));
  await copyIfExists(path.join(guide.directory, "img"), path.join(targetRoot, "img"));
  await copyReferencedSharedAssets(guidesDirectory, outputDirectory, options);
}

export function guideManifest(guides) {
  const manifestGuides = guides.map(({ guide, options, defaultOption }) => ({
    slug: guide.slug,
    title: guide.title,
    intro: guide.intro,
    authors: guide.authors,
    tags: guide.tags,
    categories: guide.categories,
    publicationDate: guide.publicationDate,
    estimatedMinutes: estimateMinutes(guide),
    overviewFile: `${guide.slug}.html`,
    defaultOptionFile: defaultOption?.file || "",
    options: options.map((option) => ({
      id: option.id,
      label: option.label,
      language: option.language,
      languageLabel: option.languageLabel,
      buildTool: option.buildTool,
      buildToolLabel: option.buildToolLabel,
      file: option.file,
      fragment: `fragments/${option.file}`,
      zipUrl: option.zipUrl
    }))
  }));

  return {
    generatedAt: new Date().toISOString(),
    guideCount: manifestGuides.length,
    guides: manifestGuides
  };
}

function rewriteGuideUrls(input: string, slug: string): string {
  return input.replace(/\b(href|src)="([^"]*)"/g, (match, attributeName, value) => {
    const legacyGuidePath = /^https:\/\/guides\.micronaut\.io\/latest\/([^?#]+)([?#].*)?$/i.exec(value);
    if (legacyGuidePath) {
      if (legacyGuidePath[1].endsWith(".zip")) {
        return match;
      }
      return `${attributeName}="../${legacyGuidePath[1]}${legacyGuidePath[2] || ""}"`;
    }
    if (!value || value.startsWith("#") || value.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) {
      return match;
    }
    const suffixIndex = firstSuffixIndex(value);
    const pathname = suffixIndex >= 0 ? value.slice(0, suffixIndex) : value;
    const suffix = suffixIndex >= 0 ? value.slice(suffixIndex) : "";
    const normalized = pathname.replaceAll("\\", "/").replace(/^(\.\.\/)+/, "").replace(/^\.\//, "");
    if (normalized.endsWith(".zip")) {
      return `${attributeName}="https://guides.micronaut.io/latest/${normalized}${suffix}"`;
    }
    if (normalized.endsWith(".html")) {
      return `${attributeName}="../${normalized}${suffix}"`;
    }
    const assetPath = normalized.startsWith("images/") || normalized.startsWith("img/")
      ? `${slug}/${normalized}`
      : `shared/images/${normalized}`;
    return `${attributeName}="../assets/${assetPath}${suffix}"`;
  });
}

async function copyIfExists(source: string, target: string): Promise<void> {
  try {
    const stat = await fs.stat(source);
    if (!stat.isDirectory()) {
      return;
    }
  } catch {
    return;
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true });
}

async function copyReferencedSharedAssets(guidesDirectory: string, outputDirectory: string, options: GuideOption[]): Promise<void> {
  const referenced = new Set<string>();
  for (const option of options) {
    let html;
    try {
      html = await fs.readFile(path.join(outputDirectory, "fragments", option.file), "utf8");
    } catch {
      continue;
    }
    for (const match of html.matchAll(/\.\.\/assets\/shared\/images\/([^"?#]+)/g)) {
      referenced.add(decodeURIComponent(match[1]));
    }
  }

  await Promise.all(Array.from(referenced).map(async (asset) => {
    const source = path.join(guidesDirectory, "src", "docs", "images", ...asset.split("/"));
    const target = path.join(outputDirectory, "assets", "shared", "images", ...asset.split("/"));
    try {
      const stat = await fs.stat(source);
      if (!stat.isFile()) {
        return;
      }
    } catch {
      return;
    }
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  }));
}

function firstSuffixIndex(value: string): number {
  const queryIndex = value.indexOf("?");
  const hashIndex = value.indexOf("#");
  if (queryIndex < 0) return hashIndex;
  if (hashIndex < 0) return queryIndex;
  return Math.min(queryIndex, hashIndex);
}

function estimateMinutes(guide: Guide): number {
  return Math.max(10, Math.min(60, Math.round((guide.intro.length + guide.title.length) / 20) * 5));
}
