import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  readPlatformCatalogProjects,
  readProperties,
  readTomlStringVersions,
} from "./docs/project-manifest.ts";
import { buildDocsProjectCatalog } from "./docs/project-catalog.ts";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const platformProjectPath =
  process.argv[2] ||
  process.env.PLATFORM_PROJECT_DIR ||
  path.join(projectDirectory, "..", "micronaut-platform");
const platformVersionCatalogFile = path.resolve(
  process.env.PLATFORM_VERSION_CATALOG ||
    (platformProjectPath.endsWith("libs.versions.toml")
      ? platformProjectPath
      : path.join(platformProjectPath, "gradle", "libs.versions.toml")),
);
const platformCatalogSourceUrl =
  "https://github.com/micronaut-projects/micronaut-platform/blob/master/gradle/libs.versions.toml";
const checkedInDocsDataDirectory = path.join(
  projectDirectory,
  "src",
  "data",
  "docs",
);
const outputFile = path.join(
  projectDirectory,
  "src",
  "data",
  "docs-projects.fixture.json",
);
const protocolFile = path.join(
  projectDirectory,
  "src",
  "data",
  "protocol.json",
);

const [projectProperties, platformVersions, existingFixture, protocol] =
  await Promise.all([
    readProperties(
      path.join(checkedInDocsDataDirectory, "docs-projects.properties"),
    ),
    readTomlStringVersions(platformVersionCatalogFile),
    readJson(outputFile),
    readJson(protocolFile),
  ]);

const projects = await readPlatformCatalogProjects(
  platformVersionCatalogFile,
  projectProperties,
);
const fixture = buildDocsProjectCatalog({
  projects,
  platformVersions,
  existingCatalog: existingFixture,
  protocol,
  source:
    "micronaut-projects/micronaut-platform gradle/libs.versions.toml plus checked-in docs metadata",
  publishedSource: platformCatalogSourceUrl,
});

await fs.writeFile(outputFile, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(
  `Wrote ${projects.length} docs projects to ${path.relative(projectDirectory, outputFile)}.`,
);

async function readJson(file: string): Promise<Record<string, any>> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error: any) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}
