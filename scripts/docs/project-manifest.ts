import { promises as fs } from "node:fs";
import { parse as parseToml } from "smol-toml";

export type Properties = Record<string, string>;

export interface DocsProject {
  slug: string;
  displayName: string;
  projectKey: string;
  module: string;
  repositoryName: string;
  publishedGuideUrl: string;
  repositoryUrl: string;
  branch: string;
  submodulePath: string;
  platformVersionKey: string;
}

interface PlatformCatalogProject {
  alias: string;
  module: string;
  versionRef: string;
  version: string;
  projectKey: string;
  artifactId: string;
}

interface MetadataIndexes {
  byProjectKey: Map<string, Properties>;
  byModule: Map<string, Properties>;
  byRepositoryName: Map<string, Properties>;
}

const REPOSITORY_OVERRIDES: Record<string, string> = {
  mongo: "micronaut-mongodb",
  oraclecloud: "micronaut-oracle-cloud",
  serialization: "micronaut-serialization",
};
const EXCLUDED_PROJECT_KEYS = new Set(["crac", "guides"]);
const UPPERCASE_WORDS = new Set([
  "acme",
  "aot",
  "aws",
  "gcp",
  "grpc",
  "jms",
  "jmx",
  "json",
  "mcp",
  "mqtt",
  "nats",
  "r2dbc",
  "rss",
  "sql",
  "xml",
]);

export async function readProperties(
  file: string,
  required: any = true,
): Promise<Properties> {
  const content = await fs.readFile(file, "utf8").catch((error: any): any => {
    if (required) {
      throw error;
    }
    return "";
  });
  const properties: Properties = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 0) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    properties[key] = value;
  }

  return properties;
}

export function readIndexed(
  properties: Properties,
  prefix: string,
  count: number,
): Properties[] {
  const values: Properties[] = [];
  for (let index = 0; index < count; index += 1) {
    const entry: Properties = {};
    const entryPrefix = `${prefix}.${index}.`;
    for (const [key, value] of Object.entries(properties)) {
      if (key.startsWith(entryPrefix)) {
        entry[key.slice(entryPrefix.length)] = value;
      }
    }
    values.push(entry);
  }
  return values;
}

export async function readTomlStringVersions(
  file: string,
  required: any = true,
): Promise<Properties> {
  const versions: Properties = {};
  const content = await fs.readFile(file, "utf8").catch((error: any): any => {
    if (required) {
      throw error;
    }
    return "";
  });
  let inVersions = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("[")) {
      inVersions = line === "[versions]";
      continue;
    }
    if (!inVersions) continue;

    const match = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*"([^"]+)"\s*$/);
    if (match) {
      versions[match[1]] = match[2];
    }
  }

  return versions;
}

export async function readPlatformCatalogProjects(
  versionCatalogFile: string,
  metadataProperties: Properties = {},
): Promise<DocsProject[]> {
  const content = await fs.readFile(versionCatalogFile, "utf8");
  const catalog = parseToml(content) as {
    versions?: Record<string, unknown>;
    libraries?: Record<
      string,
      { module?: unknown; version?: { ref?: unknown } }
    >;
  };
  const versions = catalog.versions || {};
  const libraries = catalog.libraries || {};
  const metadata = indexedProjectMetadata(metadataProperties);
  const projects: DocsProject[] = [];

  for (const [alias, library] of Object.entries(libraries)) {
    if (!alias.startsWith("boms-micronaut-")) {
      continue;
    }

    const module = typeof library.module === "string" ? library.module : "";
    const versionRef =
      typeof library.version?.ref === "string" ? library.version.ref : "";
    if (!versionRef.startsWith("managed-micronaut-")) {
      continue;
    }
    const version = versions[versionRef];
    if (typeof version !== "string" || !version.trim()) {
      throw new Error(
        `Platform catalog does not contain ${versionRef} referenced by ${alias}.`,
      );
    }

    const platformProject = {
      alias,
      module,
      versionRef,
      version,
      projectKey: versionRef.slice("managed-micronaut-".length),
      artifactId: artifactId(module),
    };
    if (EXCLUDED_PROJECT_KEYS.has(platformProject.projectKey)) {
      continue;
    }

    projects.push(projectFromPlatformCatalog(platformProject, metadata));
  }

  return projects;
}

export function selectProjects(
  projects: DocsProject[],
  slugs: string[],
): DocsProject[] {
  if (!slugs.length) {
    return projects;
  }
  const bySlug = new Map(
    projects.map((project: any): any => [project.slug, project]),
  );
  return slugs.map((slug: any): any => {
    const project = bySlug.get(slug);
    if (!project) {
      throw new Error(`Unknown docs project slug: ${slug}`);
    }
    return project;
  });
}

function indexedProjectMetadata(properties: Properties): MetadataIndexes {
  const entries = readIndexed(
    properties,
    "project",
    Number(properties["project.count"] || 0),
  );
  const byProjectKey = new Map<string, Properties>();
  const byModule = new Map<string, Properties>();
  const byRepositoryName = new Map<string, Properties>();
  for (const entry of entries) {
    if (entry.projectKey) {
      byProjectKey.set(entry.projectKey, entry);
    }
    if (entry.module) {
      byModule.set(entry.module, entry);
    }
    if (entry.repositoryName) {
      byRepositoryName.set(entry.repositoryName, entry);
    }
  }
  return { byProjectKey, byModule, byRepositoryName };
}

function projectFromPlatformCatalog(
  platformProject: PlatformCatalogProject,
  metadata: MetadataIndexes,
): DocsProject {
  const repositoryName = resolveRepositoryName(platformProject, metadata);
  const cachedMetadata = metadata.byRepositoryName.get(repositoryName) || {};
  const repositoryUrl = choose(
    cachedMetadata.repositoryUrl,
    repositoryUrlFor(repositoryName),
  );
  const submodulePath = choose(
    cachedMetadata.submodulePath,
    `repos/${repositoryName}`,
  );
  const branch = choose(
    cachedMetadata.branch,
    branchFor(platformProject.version),
  );
  const displayName = choose(
    cachedMetadata.displayName,
    displayNameFor(repositoryName),
  );
  const slug = choose(
    cachedMetadata.slug,
    slugFromSubmodulePath(submodulePath),
  );
  const publishedGuideUrl = choose(
    cachedMetadata.publishedGuideUrl,
    publishedGuideUrlFor(repositoryName),
  );

  return {
    slug,
    displayName,
    projectKey: platformProject.projectKey,
    module: platformProject.module,
    repositoryName,
    publishedGuideUrl,
    repositoryUrl,
    branch,
    submodulePath,
    platformVersionKey: platformProject.versionRef,
  };
}

function resolveRepositoryName(
  platformProject: PlatformCatalogProject,
  metadata: MetadataIndexes,
): string {
  const names = new Set<string>();
  const cachedByProjectKey = metadata.byProjectKey.get(
    platformProject.projectKey,
  );
  const cachedByModule = metadata.byModule.get(platformProject.module);
  if (cachedByProjectKey?.repositoryName) {
    names.add(cachedByProjectKey.repositoryName);
  }
  if (cachedByModule?.repositoryName) {
    names.add(cachedByModule.repositoryName);
  }
  if (REPOSITORY_OVERRIDES[platformProject.projectKey]) {
    names.add(REPOSITORY_OVERRIDES[platformProject.projectKey]);
  }
  names.add(stripBomSuffix(platformProject.artifactId));
  names.add(`micronaut-${platformProject.projectKey}`);
  names.add(platformProject.alias.slice("boms-".length));

  return (
    Array.from(names).find(Boolean) ||
    platformProject.alias.slice("boms-".length)
  );
}

function artifactId(module: string): string {
  const separator = module.indexOf(":");
  if (separator < 0 || separator === module.length - 1) {
    throw new Error(`Invalid module coordinates: ${module}`);
  }
  return module.slice(separator + 1);
}

function stripBomSuffix(value: string): string {
  return value.endsWith("-bom") ? value.slice(0, -"-bom".length) : value;
}

function repositoryUrlFor(repositoryName: string): string {
  return `https://github.com/micronaut-projects/${repositoryName}.git`;
}

function publishedGuideUrlFor(repositoryName: string): string {
  if (repositoryName === "micronaut-core") {
    return "https://docs.micronaut.io/latest/guide/";
  }
  return `https://micronaut-projects.github.io/${repositoryName}/latest/guide/`;
}

function branchFor(version: string): string {
  const match = /^(\d+)\.(\d+)\..*$/.exec(version);
  return match ? `${match[1]}.${match[2]}.x` : "master";
}

function slugFromSubmodulePath(submodulePath: string): string {
  const name = submodulePath.split("/").filter(Boolean).at(-1) || submodulePath;
  return name.startsWith("micronaut-") ? name.slice("micronaut-".length) : name;
}

function displayNameFor(repositoryName: string): string {
  const name = repositoryName.startsWith("micronaut-")
    ? repositoryName.slice("micronaut-".length)
    : repositoryName;
  return ["Micronaut", ...name.split("-").map(displayWord)].join(" ");
}

function displayWord(word: string): string {
  const lower = word.toLowerCase();
  if (UPPERCASE_WORDS.has(lower)) {
    return lower.toUpperCase();
  }
  if (lower === "crac") {
    return "CRaC";
  }
  if (lower === "picocli") {
    return "Picocli";
  }
  if (lower === "mongodb") {
    return "MongoDB";
  }
  return `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`;
}

function choose(value: string | undefined, fallback: string): string {
  return value == null || String(value).trim() === "" ? fallback : value;
}
