import { readFile } from "node:fs/promises";
import { join } from "node:path";

import fallbackGeneratedGuidesManifest from "@/data/generated-guides.fixture.json";
import { enhanceGeneratedContentHtml } from "@/lib/generated-docs-html";

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
    // Fall back to the checked-in guide subset when generated content is unavailable.
  }
  return fallbackGeneratedGuidesManifest as GeneratedGuidesManifest;
}

export async function readGeneratedGuideFragment(option: GeneratedGuideOption): Promise<string | undefined> {
  try {
    return enhanceGeneratedContentHtml(await readFile(join(generatedGuidesDirectory, option.fragment), "utf8"));
  } catch {
    return undefined;
  }
}

export function allGeneratedGuideTags(guides: Array<{ tags: string[] }>) {
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

function normalizedRoot(root: string) {
  const value = root.endsWith("/") ? root.slice(0, -1) : root;
  return value || "";
}
