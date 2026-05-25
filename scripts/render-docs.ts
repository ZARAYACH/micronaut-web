import asciidoctorFactory from "asciidoctor";
import { execFile as execFileCallback } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { copyProjectImageAssets } from "./docs/assets.ts";
import {
  type DocsProject,
  readIndexed,
  readPlatformCatalogProjects,
  readProperties,
  readTomlStringVersions,
  selectProjects,
} from "./docs/project-manifest.ts";
import { renderProject } from "./docs/renderer.ts";
import { parseArgs, splitList, stringArg } from "./shared/cli.ts";
import { isDirectory, isRegularFile } from "./shared/files.ts";

const DEFAULT_DOC_PROJECT_SLUGS = ["core", "data", "serde"];
const execFile = promisify(execFileCallback);

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const options = parseArgs(process.argv.slice(2));
const docsDirectory = path.resolve(
  stringArg(options.docsDir) ||
    options._[0] ||
    process.env.DOCS_DIR ||
    path.join(projectDirectory, ".docs"),
);
const platformProjectDirectory = path.resolve(
  stringArg(options.platformProjectDir) ||
    process.env.PLATFORM_PROJECT_DIR ||
    path.join(docsDirectory, "repos", "micronaut-platform"),
);
const platformVersionCatalogFile = path.resolve(
  stringArg(options.platformVersionCatalog) ||
    process.env.PLATFORM_VERSION_CATALOG ||
    path.join(platformProjectDirectory, "gradle", "libs.versions.toml"),
);
const outputDirectory = path.resolve(
  stringArg(options.output) ||
    path.join(projectDirectory, "src", "content", "generated-docs"),
);
const checkedInDocsDataDirectory = path.join(
  projectDirectory,
  "src",
  "data",
  "docs",
);
const strict = Boolean(
  options.strict ||
  process.env.DOCS_RENDER_STRICT === "true" ||
  process.env.CI === "true",
);
const renderAll = Boolean(
  options.all || process.env.DOCS_RENDER_ALL === "true",
);
const syncSources = Boolean(
  options.syncSources || process.env.DOCS_SYNC_SOURCES === "true",
);
const explicitSlugs = splitList(
  options.slugs || process.env.DOCS_PROJECT_SLUGS || "",
);
const selectedSlugs = renderAll
  ? []
  : explicitSlugs.length
    ? explicitSlugs
    : DEFAULT_DOC_PROJECT_SLUGS;

const asciidoctor = asciidoctorFactory();
const externalProjectManifestFile = path.join(
  docsDirectory,
  "gradle",
  "docs-projects.properties",
);
const checkedInProjectManifestFile = path.join(
  checkedInDocsDataDirectory,
  "docs-projects.properties",
);
const metadataProperties = await readProperties(
  checkedInProjectManifestFile,
  false,
);
let projectManifest;
let allProjects: DocsProject[];
if (await isRegularFile(platformVersionCatalogFile)) {
  allProjects = await readPlatformCatalogProjects(
    platformVersionCatalogFile,
    metadataProperties,
  );
} else {
  const projectManifestFile = (await isRegularFile(externalProjectManifestFile))
    ? externalProjectManifestFile
    : checkedInProjectManifestFile;
  projectManifest = await readProperties(projectManifestFile);
  allProjects = readIndexed(
    projectManifest,
    "project",
    Number(projectManifest["project.count"] || 0),
  ) as unknown as DocsProject[];
}
const projects = selectProjects(allProjects, selectedSlugs);
const platformVersions = await readTomlStringVersions(
  platformVersionCatalogFile,
  false,
);

await cleanGeneratedDocsOutput(
  outputDirectory,
  explicitSlugs.length ? selectedSlugs : [],
);
if (syncSources) {
  await syncProjectSources(projects, platformVersions);
}

let rendered = 0;
let skipped = 0;
const skippedProjects = [];
for (const project of projects) {
  const guideSourceDirectory = path.join(
    docsDirectory,
    project.submodulePath,
    "src",
    "main",
    "docs",
    "guide",
  );
  try {
    if (!(await isDirectory(guideSourceDirectory))) {
      skipped += 1;
      skippedProjects.push(
        `${project.slug}: missing guide source at ${guideSourceDirectory}`,
      );
      console.warn(`Skipping ${skippedProjects.at(-1)}`);
      continue;
    }

    const html = await renderProject(
      asciidoctor,
      docsDirectory,
      project,
      platformVersions[project.platformVersionKey] || "",
      { strict },
    );
    await fs.writeFile(
      path.join(outputDirectory, `${project.slug}.html`),
      `${html}\n`,
      "utf8",
    );
    await copyProjectImageAssets(project, docsDirectory, outputDirectory);
    rendered += 1;
    console.log(`Rendered ${project.slug}`);
  } catch (error: any) {
    skipped += 1;
    skippedProjects.push(`${project.slug}: ${error.message}`);
    console.warn(`Skipping ${skippedProjects.at(-1)}`);
  }
}

console.log(
  `Rendered ${rendered} docs fragments to ${path.relative(projectDirectory, outputDirectory)}${skipped ? ` (${skipped} skipped)` : ""}.`,
);
if (strict && skippedProjects.length) {
  throw new Error(
    `Strict docs render failed with skipped projects: ${skippedProjects.join("; ")}`,
  );
}

async function cleanGeneratedDocsOutput(
  directory: any,
  slugs: any,
): Promise<any> {
  await fs.mkdir(directory, { recursive: true });
  if (slugs.length) {
    await Promise.all(
      slugs.flatMap((slug: any): any => [
        fs.rm(path.join(directory, `${slug}.html`), { force: true }),
        fs.rm(path.join(directory, "assets", slug), {
          force: true,
          recursive: true,
        }),
      ]),
    );
    return;
  }

  const entries = await fs.readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries.map((entry: any): any => {
      if (entry.isFile() && entry.name.endsWith(".html")) {
        return fs.rm(path.join(directory, entry.name), { force: true });
      }
      if (entry.isDirectory() && entry.name === "assets") {
        return fs.rm(path.join(directory, entry.name), {
          force: true,
          recursive: true,
        });
      }
      return undefined;
    }),
  );
}

async function syncProjectSources(
  projects: any,
  platformVersions: any,
): Promise<any> {
  for (const project of projects) {
    const guideSourceDirectory = path.join(
      docsDirectory,
      project.submodulePath,
      "src",
      "main",
      "docs",
      "guide",
    );
    if (await isDirectory(guideSourceDirectory)) {
      continue;
    }

    const destination = path.join(docsDirectory, project.submodulePath);
    if (await isDirectory(destination)) {
      console.warn(
        `Project source exists without docs guide, leaving it unchanged: ${path.relative(projectDirectory, destination)}`,
      );
      continue;
    }

    const version = platformVersions[project.platformVersionKey];
    const releaseTag = version ? `v${version}` : "";
    await fs.mkdir(path.dirname(destination), { recursive: true });
    console.log(
      `Cloning ${project.repositoryName} into ${path.relative(projectDirectory, destination)}${releaseTag ? ` at ${releaseTag}` : ""}`,
    );
    try {
      await cloneProject(
        project.repositoryUrl,
        destination,
        releaseTag || project.branch,
      );
    } catch (error: any) {
      if (!releaseTag || releaseTag === project.branch) {
        throw error;
      }
      console.warn(
        `Could not clone ${project.repositoryName} at ${releaseTag}: ${error.message}. Falling back to ${project.branch}.`,
      );
      await cloneProject(project.repositoryUrl, destination, project.branch);
    }
  }
}

async function cloneProject(
  repositoryUrl: any,
  destination: any,
  ref: any,
): Promise<any> {
  const cloneDirectory = `${destination}.clone-${process.pid}`;
  await fs.rm(cloneDirectory, { force: true, recursive: true });
  try {
    const args = ["clone", "--depth", "1"];
    if (ref) {
      args.push("--branch", ref);
    }
    args.push(repositoryUrl, cloneDirectory);
    await execFile("git", args, { cwd: projectDirectory });
    await fs.rename(cloneDirectory, destination);
  } catch (error: any) {
    await fs.rm(cloneDirectory, { force: true, recursive: true });
    throw error;
  }
}
