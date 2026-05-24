import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { micronautProtocol } from "@/lib/protocol";

export type GeneratedGuideOption = {
  id: string;
  label: string;
  language: string;
  languageLabel: string;
  buildTool: string;
  buildToolLabel: string;
  file: string;
  fragment: string;
  zipUrl: string;
};

export type GeneratedGuide = {
  slug: string;
  title: string;
  intro: string;
  authors: string[];
  tags: string[];
  categories: string[];
  publicationDate: string;
  estimatedMinutes: number;
  overviewFile: string;
  defaultOptionFile: string;
  options: GeneratedGuideOption[];
};

export type GeneratedGuidesManifest = {
  generatedAt: string;
  guideCount: number;
  guides: GeneratedGuide[];
};

const generatedGuidesDirectory = join(process.cwd(), "src", "content", "generated-guides");

export async function readGeneratedGuidesManifest(): Promise<GeneratedGuidesManifest> {
  try {
    const manifest = JSON.parse(await readFile(join(generatedGuidesDirectory, "manifest.json"), "utf8"));
    if (Array.isArray(manifest.guides)) {
      return manifest as GeneratedGuidesManifest;
    }
  } catch {
    // Fall back to the checked-in protocol below.
  }
  return fallbackManifest();
}

export async function readGeneratedGuideFragment(option: GeneratedGuideOption): Promise<string | undefined> {
  try {
    return (await readFile(join(generatedGuidesDirectory, option.fragment), "utf8")).replaceAll("visually-hidden", "sr-only");
  } catch {
    return undefined;
  }
}

export function allGeneratedGuideTags(guides: GeneratedGuide[]) {
  return Array.from(new Set(guides.flatMap((guide) => guide.tags))).sort();
}

export function tagSlug(tag: string) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function guideOptionPath(option: GeneratedGuideOption, root = "/latest") {
  return `${normalizedRoot(root)}/${option.file}`;
}

export function guideOverviewPath(guide: GeneratedGuide, root = "/latest") {
  return `${normalizedRoot(root)}/${guide.overviewFile}`;
}

export function guideTagPath(tag: string, root = "/latest") {
  return `${normalizedRoot(root)}/tag-${tagSlug(tag)}.html`;
}

export function latestGuides(guides: GeneratedGuide[], limit = 8) {
  return [...guides]
    .sort((left, right) => right.publicationDate.localeCompare(left.publicationDate) || left.title.localeCompare(right.title))
    .slice(0, limit);
}

function fallbackManifest(): GeneratedGuidesManifest {
  const guides = micronautProtocol.guides.guides.map((guide) => {
    const options = uniqueOptions(guide.variants.map((variant) => {
      const language = variant.language.toLowerCase();
      const buildTool = variant.buildTool.toLowerCase();
      const file = `${guide.slug}-${buildTool}-${language}.html`;
      return {
        id: `${guide.slug}-${buildTool}-${language}`,
        label: `${variant.language} / ${variant.buildTool}`,
        language,
        languageLabel: variant.language,
        buildTool,
        buildToolLabel: variant.buildTool,
        file,
        fragment: `fragments/${file}`,
        zipUrl: `${guide.slug}-${buildTool}-${language}.zip`
      };
    }));
    const defaultOption = options.find((option) => option.language === "java" && option.buildTool === "gradle") || options[0];
    return {
      slug: guide.slug,
      title: guide.title,
      intro: guide.intro,
      authors: guide.authors,
      tags: guide.tags,
      categories: guide.categories,
      publicationDate: guide.publicationDate,
      estimatedMinutes: guide.estimatedMinutes,
      overviewFile: `${guide.slug}.html`,
      defaultOptionFile: defaultOption?.file || "",
      options
    };
  });
  return {
    generatedAt: micronautProtocol.generatedAt,
    guideCount: guides.length,
    guides
  };
}

function normalizedRoot(root: string) {
  const value = root.endsWith("/") ? root.slice(0, -1) : root;
  return value || "";
}

function uniqueOptions(options: GeneratedGuideOption[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = `${option.buildTool}:${option.language}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
