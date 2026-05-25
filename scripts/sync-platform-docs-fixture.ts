import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type PlatformDocsProject,
  type Properties,
  readPlatformCatalogProjects,
  readProperties,
  readTomlStringVersions
} from "./platform-docs/project-manifest.ts";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const platformProjectPath =
  process.argv[2] || process.env.PLATFORM_PROJECT_DIR || path.join(projectDirectory, "..", "micronaut-platform");
const platformVersionCatalogFile = path.resolve(
  process.env.PLATFORM_VERSION_CATALOG ||
    (platformProjectPath.endsWith("libs.versions.toml")
      ? platformProjectPath
      : path.join(platformProjectPath, "gradle", "libs.versions.toml"))
);
const platformCatalogSourceUrl =
  "https://github.com/micronaut-projects/micronaut-platform/blob/master/gradle/libs.versions.toml";
const checkedInPlatformDocsDataDirectory = path.join(projectDirectory, "src", "data", "platform-docs");
const outputFile = path.join(projectDirectory, "src", "data", "platform-docs-projects.fixture.json");
const protocolFile = path.join(projectDirectory, "src", "data", "protocol.json");

const [projectProperties, platformVersions, existingFixture, protocol] = await Promise.all([
  readProperties(path.join(checkedInPlatformDocsDataDirectory, "platform-doc-projects.properties")),
  readTomlStringVersions(platformVersionCatalogFile),
  readJson(outputFile),
  readJson(protocolFile)
]);
type FixtureProject = PlatformDocsProject & Properties & {
  categorySlugs?: string[];
  primaryCategory?: string;
};

type FixtureCategory = {
  slug: string;
  projectSlugs?: string[];
};

const existingProjectsBySlug = new Map<string, FixtureProject>(
  ((existingFixture.projects || []) as FixtureProject[]).map((project) => [project.slug, project])
);
const protocolProjectOrder = new Map<string, number>(
  (((protocol.docs as { projects?: Array<{ slug: string }> } | undefined)?.projects) || [])
    .map((project, index) => [project.slug, index])
);
const categories = (existingFixture.categories || []) as FixtureCategory[];

const projects = (await readPlatformCatalogProjects(platformVersionCatalogFile, projectProperties))
  .map((project) => {
    const existingProject = existingProjectsBySlug.get(project.slug) || ({} as FixtureProject);
    const categorySlugs = existingProject.categorySlugs || categories
      .filter((category) => (category.projectSlugs || []).includes(project.slug))
      .map((category) => category.slug);
    const primaryCategory = existingProject.primaryCategory || categorySlugs[0] || "other";

    return {
      slug: project.slug,
      displayName: project.displayName,
      shortName: existingProject.shortName || project.displayName.replace(/^Micronaut\s+/i, ""),
      projectKey: project.projectKey,
      module: project.module,
      repositoryName: project.repositoryName,
      repositoryUrl: project.repositoryUrl,
      publishedGuideUrl: project.publishedGuideUrl,
      publishedPlatformHref: platformCatalogSourceUrl,
      branch: project.branch,
      submodulePath: project.submodulePath,
      platformVersionKey: project.platformVersionKey,
      version: platformVersions[project.platformVersionKey] || existingProject.version || "",
      icon: existingProject.icon || "lucide:book-open",
      primaryCategory,
      categorySlugs,
      shortDescription: existingProject.shortDescription || project.displayName.replace(/^Micronaut\s+/i, ""),
      longDescription: existingProject.longDescription || `${project.displayName} documentation and reference material.`
    };
  })
  .sort((left, right) => projectOrder(left) - projectOrder(right));

const fixture = {
  source: "micronaut-projects/micronaut-platform gradle/libs.versions.toml plus checked-in platform docs metadata",
  publishedSource: platformCatalogSourceUrl,
  projectCount: projects.length,
  categories,
  projects
};

await fs.writeFile(outputFile, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(`Wrote ${projects.length} platform docs projects to ${path.relative(projectDirectory, outputFile)}.`);

function projectOrder(project: PlatformDocsProject): number {
  return protocolProjectOrder.has(project.slug) ? protocolProjectOrder.get(project.slug) : Number.MAX_SAFE_INTEGER;
}

async function readJson(file: string): Promise<Record<string, any>> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}
