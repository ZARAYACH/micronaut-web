import { promises as fs } from "node:fs";
import path from "node:path";

import { renderAsciiDoc } from "../asciidoc/rendering.ts";
import { optimizeImages as optimizeGeneratedGuideHtml } from "../shared/generated-html.ts";
import { shikiStyle } from "../shared/highlight.ts";
import { guideExtensionRegistry } from "./extensions/index.ts";
import type { Guide, GuideOption, GuideRenderContext } from "./model.ts";
import { productionUrl } from "../../src/lib/route-compatibility.ts";

export async function renderGuideOption(
  asciidoctor: typeof import("@asciidoctor/core"),
  guidesDirectory: string,
  guide: Guide,
  option: GuideOption,
  renderOptions: { strict?: boolean } = {},
): Promise<string> {
  const context = await guideRenderContext({ guidesDirectory, guide, option });
  const source = await fs.readFile(
    path.join(guide.directory, guide.asciidoc),
    "utf8",
  );
  let html = await renderAsciiDoc({
    asciidoctor,
    source,
    diagnosticsLabel: option.id,
    strict: renderOptions.strict,
    convertOptions: {
      attributes: {
        icons: "font",
        idprefix: "",
        idseparator: "-",
        sourceDir: option.sourceDir,
        sourcedir: guide.directory,
      },
      base_dir: guide.directory,
      extension_registry: guideExtensionRegistry(asciidoctor, context),
    },
  });

  html = rewriteGuideUrls(html, guide.slug);
  html = optimizeGeneratedGuideHtml(html);
  return `${shikiStyle()}\n${html.trim()}`;
}

async function guideRenderContext({
  guidesDirectory,
  guide,
  option,
}: {
  guidesDirectory: string;
  guide: Guide;
  option: GuideOption;
}): Promise<GuideRenderContext> {
  return {
    guidesDirectory,
    guide,
    option,
    version: await readVersion(guidesDirectory),
  };
}

async function readVersion(guidesDirectory: string): Promise<string> {
  try {
    return (
      await fs.readFile(path.join(guidesDirectory, "version.txt"), "utf8")
    ).trim();
  } catch {
    return "";
  }
}

export async function copyGuideAssets(
  guidesDirectory: string,
  guide: Guide,
  outputDirectory: string,
  options: GuideOption[] = [],
): Promise<void> {
  const targetRoot = path.join(outputDirectory, "assets", guide.slug);
  await copyIfExists(
    path.join(guide.directory, "images"),
    path.join(targetRoot, "images"),
  );
  await copyIfExists(
    path.join(guide.directory, "img"),
    path.join(targetRoot, "img"),
  );
  await copyReferencedSharedAssets(guidesDirectory, outputDirectory, options);
}

export function guideManifest(guides: any): any {
  const manifestGuides = guides.map(
    ({ guide, options, defaultOption }: any): any => ({
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
      options: options.map((option: any): any => ({
        id: option.id,
        label: option.label,
        language: option.language,
        languageLabel: option.languageLabel,
        buildTool: option.buildTool,
        buildToolLabel: option.buildToolLabel,
        file: option.file,
        fragment: `fragments/${option.file}`,
        zipUrl: option.zipUrl,
      })),
    }),
  );

  return {
    generatedAt: new Date().toISOString(),
    guideCount: manifestGuides.length,
    guides: manifestGuides,
  };
}

function rewriteGuideUrls(input: string, slug: string): string {
  return input.replace(
    /\b(href|src)="([^"]*)"/g,
    (match: any, attributeName: any, value: any): any => {
      const legacyGuidePath =
        /^https:\/\/guides\.micronaut\.io\/latest\/([^?#]+)([?#].*)?$/i.exec(
          value,
        );
      if (legacyGuidePath) {
        if (legacyGuidePath[1].endsWith(".zip")) {
          return match;
        }
        return `${attributeName}="../${legacyGuidePath[1]}${legacyGuidePath[2] || ""}"`;
      }
      if (
        !value ||
        value.startsWith("#") ||
        value.startsWith("/") ||
        /^[a-z][a-z0-9+.-]*:/i.test(value) ||
        value.startsWith("//")
      ) {
        return match;
      }
      const suffixIndex = firstSuffixIndex(value);
      const pathname = suffixIndex >= 0 ? value.slice(0, suffixIndex) : value;
      const suffix = suffixIndex >= 0 ? value.slice(suffixIndex) : "";
      const normalized = pathname
        .replaceAll("\\", "/")
        .replace(/^(\.\.\/)+/, "")
        .replace(/^\.\//, "");
      if (normalized.endsWith(".zip")) {
        return `${attributeName}="${productionUrl("guides", normalized)}${suffix}"`;
      }
      if (normalized.endsWith(".html")) {
        return `${attributeName}="../${normalized}${suffix}"`;
      }
      const assetPath =
        normalized.startsWith("images/") || normalized.startsWith("img/")
          ? `${slug}/${normalized}`
          : `shared/images/${normalized}`;
      return `${attributeName}="../assets/${assetPath}${suffix}"`;
    },
  );
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

async function copyReferencedSharedAssets(
  guidesDirectory: string,
  outputDirectory: string,
  options: GuideOption[],
): Promise<void> {
  const referenced = new Set<string>();
  for (const option of options) {
    let html;
    try {
      html = await fs.readFile(
        path.join(outputDirectory, "fragments", option.file),
        "utf8",
      );
    } catch {
      continue;
    }
    for (const match of html.matchAll(
      /\.\.\/assets\/shared\/images\/([^"?#]+)/g,
    )) {
      referenced.add(decodeURIComponent(match[1]));
    }
  }

  await Promise.all(
    Array.from(referenced).map(async (asset: any): Promise<any> => {
      const source = path.join(
        guidesDirectory,
        "src",
        "docs",
        "images",
        ...asset.split("/"),
      );
      const target = path.join(
        outputDirectory,
        "assets",
        "shared",
        "images",
        ...asset.split("/"),
      );
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
    }),
  );
}

function firstSuffixIndex(value: string): number {
  const queryIndex = value.indexOf("?");
  const hashIndex = value.indexOf("#");
  if (queryIndex < 0) return hashIndex;
  if (hashIndex < 0) return queryIndex;
  return Math.min(queryIndex, hashIndex);
}

function estimateMinutes(guide: Guide): number {
  return Math.max(
    10,
    Math.min(
      60,
      Math.round((guide.intro.length + guide.title.length) / 20) * 5,
    ),
  );
}
