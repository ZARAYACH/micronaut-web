import { promises as fs } from "node:fs";
import path from "node:path";

import { isDirectory, isRegularFile } from "../platform-docs/files.mjs";

export const DEFAULT_GUIDE_SLUGS = [
  "creating-your-first-micronaut-app",
  "micronaut-http-client",
  "micronaut-data-jdbc-repository"
];

export const DEFAULT_LANGUAGES = ["java", "kotlin", "groovy"];
export const DEFAULT_BUILD_TOOLS = ["gradle", "maven"];

export async function readGuides(guidesRepositoryDirectory) {
  const guidesDirectory = path.join(guidesRepositoryDirectory, "guides");
  if (!(await isDirectory(guidesDirectory))) {
    return [];
  }

  const entries = await fs.readdir(guidesDirectory, { withFileTypes: true });
  const guides = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const directory = path.join(guidesDirectory, entry.name);
    const metadataFile = path.join(directory, "metadata.json");
    if (!(await isRegularFile(metadataFile))) {
      continue;
    }
    const metadata = JSON.parse(await fs.readFile(metadataFile, "utf8"));
    const guide = normalizeGuideMetadata(metadata, directory, entry.name);
    if (guide.publish) {
      guides.push(guide);
    }
  }

  return guides.sort((left, right) =>
    right.publicationDate.localeCompare(left.publicationDate) ||
    left.title.localeCompare(right.title)
  );
}

export function selectGuides(guides, selectedSlugs) {
  if (!selectedSlugs.length) {
    return guides;
  }
  const selected = new Set(selectedSlugs);
  return guides.filter((guide) => selected.has(guide.slug));
}

export function guideOptions(guide) {
  const options = [];
  for (const buildTool of guide.buildTools) {
    for (const language of DEFAULT_LANGUAGES) {
      if (!guide.languages.includes(language)) {
        continue;
      }
      options.push({
        id: `${guide.slug}-${buildTool}-${language}`,
        label: `${languageLabel(language)} / ${buildToolLabel(buildTool)}`,
        buildTool,
        buildToolLabel: buildToolLabel(buildTool),
        language,
        languageLabel: languageLabel(language),
        testFramework: testFrameworkFor(guide, language),
        file: guideOptionFile(guide.slug, buildTool, language),
        sourceDir: `${guide.slug}-${buildTool}-${language}`,
        zipUrl: `${guide.slug}-${buildTool}-${language}.zip`
      });
    }
  }
  return options;
}

export function defaultGuideOption(guide) {
  return guideOptions(guide).find((option) => option.buildTool === "gradle" && option.language === "java") ||
    guideOptions(guide).find((option) => option.language === "java") ||
    guideOptions(guide)[0];
}

export function guideOptionFile(slug, buildTool, language) {
  return `${slug}-${buildTool}-${language}.html`;
}

export function guideOverviewFile(slug) {
  return `${slug}.html`;
}

export function tagPageFile(tag) {
  return `tag-${tagSlug(tag)}.html`;
}

export function tagSlug(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function languageExtension(language) {
  return {
    groovy: "groovy",
    kotlin: "kt"
  }[language] || "java";
}

export function languageSourceDirectory(language, sourceSet) {
  if (language === "kotlin") {
    return sourceSet === "test" ? "src/test/kotlin" : "src/main/kotlin";
  }
  if (language === "groovy") {
    return sourceSet === "test" ? "src/test/groovy" : "src/main/groovy";
  }
  return sourceSet === "test" ? "src/test/java" : "src/main/java";
}

export function appFeatures(guide, option, appName = "default") {
  const app = guide.apps.find((candidate) => candidate.name === appName) || guide.apps[0];
  if (!app) {
    return [];
  }

  const languageSpecific = {
    groovy: app.groovyFeatures,
    java: app.javaFeatures,
    kotlin: app.kotlinFeatures
  }[option.language] || [];
  return [...new Set([...app.features, ...languageSpecific].filter(Boolean))];
}

export function featuresWords(features) {
  const formatted = features.map((feature) => `\`${feature}\``);
  if (formatted.length <= 1) {
    return formatted[0] || "";
  }
  return `${formatted.slice(0, -1).join(", ")}, and ${formatted.at(-1)}`;
}

export function cliCommandForApp(app) {
  return {
    CLI: "create-cli-app",
    FUNCTION: "create-function-app",
    GRPC: "create-grpc-app",
    MESSAGING: "create-messaging-app"
  }[String(app?.applicationType || "").toUpperCase()] || "create-app";
}

function normalizeGuideMetadata(metadata, directory, fallbackSlug) {
  const slug = string(metadata.slug, fallbackSlug);
  const apps = normalizeApps(metadata.apps);
  return {
    slug,
    directory,
    title: string(metadata.title, slug),
    intro: string(metadata.intro, ""),
    authors: strings(metadata.authors),
    categories: strings(metadata.categories),
    publicationDate: string(metadata.publicationDate, "1970-01-01"),
    tags: strings(metadata.tags),
    languages: lowerList(metadata.languages, DEFAULT_LANGUAGES),
    buildTools: lowerList(metadata.buildTools, DEFAULT_BUILD_TOOLS),
    testFramework: string(metadata.testFramework, ""),
    cloud: string(metadata.cloud, ""),
    publish: metadata.publish !== false,
    base: string(metadata.base, ""),
    asciidoc: string(metadata.asciidoctor, `${slug}.adoc`),
    apps: apps.length ? apps : [{
      name: "default",
      applicationType: "DEFAULT",
      features: [],
      javaFeatures: [],
      kotlinFeatures: [],
      groovyFeatures: []
    }],
    minimumJavaVersion: metadata.minimumJavaVersion || metadata.minJdk || 21,
    maximumJavaVersion: metadata.maximumJavaVersion
  };
}

function normalizeApps(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((app) => ({
    name: string(app?.name, "default"),
    applicationType: string(app?.applicationType, "DEFAULT"),
    features: strings(app?.features),
    javaFeatures: strings(app?.javaFeatures),
    kotlinFeatures: strings(app?.kotlinFeatures),
    groovyFeatures: strings(app?.groovyFeatures)
  }));
}

function testFrameworkFor(guide, language) {
  if (guide.testFramework) {
    return guide.testFramework.toLowerCase();
  }
  return language === "groovy" ? "spock" : "junit";
}

function languageLabel(language) {
  return {
    groovy: "Groovy",
    java: "Java",
    kotlin: "Kotlin"
  }[language] || language;
}

function buildToolLabel(buildTool) {
  return {
    gradle: "Gradle",
    maven: "Maven"
  }[buildTool] || buildTool;
}

function lowerList(value, fallback) {
  const values = strings(value);
  if (!values.length) {
    return fallback;
  }
  return values.map((item) => item.toLowerCase().replaceAll("_", "-"));
}

function strings(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => item !== undefined && item !== null).map(String);
}

function string(value, fallback) {
  return value === undefined || value === null ? fallback : String(value);
}
