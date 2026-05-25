import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const protocolFile = path.join(
  projectDirectory,
  "src",
  "data",
  "protocol.json",
);
const platformDocsProjectFixtureFile = path.join(
  projectDirectory,
  "src",
  "data",
  "platform-docs-projects.fixture.json",
);

const protocol = JSON.parse(await fs.readFile(protocolFile, "utf8"));
const platformDocsProjectFixture = JSON.parse(
  await fs.readFile(platformDocsProjectFixtureFile, "utf8"),
);

assertString(protocol.protocolVersion, "protocolVersion");
assertString(protocol.generatedAt, "generatedAt");
assertArray(protocol.surfaces, "surfaces");
assertArray(protocol.docs?.categories, "docs.categories");
assertArray(protocol.docs?.projects, "docs.projects");
assertArray(protocol.guides?.categories, "guides.categories");
assertArray(protocol.guides?.guides, "guides.guides");

for (const surface of protocol.surfaces) {
  assertString(surface.id, "surface.id");
  assertString(surface.name, "surface.name");
  assertString(surface.path, "surface.path");
}

for (const project of protocol.docs.projects) {
  assertString(project.slug, "project.slug");
  assertString(project.displayName, `project(${project.slug}).displayName`);
  assertString(project.href, `project(${project.slug}).href`);
}

assertArray(
  platformDocsProjectFixture.projects,
  "platformDocsProjectFixture.projects",
);
if (
  platformDocsProjectFixture.projects.length !== protocol.docs.projects.length
) {
  throw new Error(
    `Expected platform docs project fixture to contain ${protocol.docs.projects.length} projects, got ${platformDocsProjectFixture.projects.length}.`,
  );
}

const protocolProjectSlugs = new Set(
  protocol.docs.projects.map((project: any): any => project.slug),
);
for (const project of platformDocsProjectFixture.projects) {
  assertString(project.slug, "platformDocsProjectFixture.project.slug");
  assertString(
    project.displayName,
    `platformDocsProjectFixture.project(${project.slug}).displayName`,
  );
  if (!protocolProjectSlugs.has(project.slug)) {
    throw new Error(
      `Fixture project ${project.slug} is missing from protocol docs.projects.`,
    );
  }
}

for (const guide of protocol.guides.guides) {
  assertString(guide.slug, "guide.slug");
  assertString(guide.title, `guide(${guide.slug}).title`);
  assertString(guide.href, `guide(${guide.slug}).href`);
}

console.log(
  `Validated protocol with ${protocol.docs.projects.length} projects, ${platformDocsProjectFixture.projects.length} fixture projects, and ${protocol.guides.guides.length} guides.`,
);

function assertArray(value: any, name: any): any {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${name} to be an array.`);
  }
}

function assertString(value: any, name: any): any {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Expected ${name} to be a non-empty string.`);
  }
}
