import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { shikiLanguage } from "./highlight.mjs";
import { readPlatformCatalogProjects } from "./project-manifest.mjs";

const execFile = promisify(execFileCallback);
const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("generated docs are prepared before Astro dev and build", async () => {
  const packageJson = JSON.parse(await fs.readFile(path.join(projectDirectory, "package.json"), "utf8"));

  assert.equal(packageJson.scripts["prepare:generated-docs"], "npm run render:platform-docs");
  assert.equal(packageJson.scripts["prepare:generated-content"], "node scripts/prepare-generated-content.mjs");
  assertScriptOrder(packageJson.scripts.dev, "npm run prepare:generated-content", "astro dev");
  assertScriptOrder(packageJson.scripts.build, "npm run prepare:generated-content", "astro build");
});

test("generated docs fragments and assets are ignored and not tracked source", async () => {
  const ignoredPaths = [
    "src/content/generated-docs/generated-docs-test.html",
    "src/content/generated-docs/assets/generated-docs-test/docs/img/example.png"
  ];
  const { stdout: ignoredOutput } = await execFile("git", ["check-ignore", ...ignoredPaths], {
    cwd: projectDirectory
  });
  assert.deepEqual(lines(ignoredOutput), ignoredPaths);

  const { stdout: trackedOutput } = await execFile("git", ["ls-files", "--", "src/content/generated-docs"], {
    cwd: projectDirectory
  });
  const trackedGeneratedOutput = lines(trackedOutput).filter((file) =>
    file.endsWith(".html") || file.startsWith("src/content/generated-docs/assets/")
  );
  assert.deepEqual(trackedGeneratedOutput, []);
});

test("generated docs tooling uses Micronaut Platform catalog instead of the old platform docs project", async () => {
  const checkedFiles = [
    ".github/workflows/deploy-web.yml",
    "README.md",
    "src/content/generated-docs/README.md",
    "src/data/platform-docs-projects.fixture.json",
    "scripts/render-platform-docs.mjs",
    "scripts/sync-platform-docs-fixture.mjs"
  ];
  const fileContents = await Promise.all(
    checkedFiles.map(async (file) => [file, await fs.readFile(path.join(projectDirectory, file), "utf8")])
  );
  const workflow = fileContents.find(([file]) => file === ".github/workflows/deploy-web.yml")[1];
  const syncScript = fileContents.find(([file]) => file === "scripts/sync-platform-docs-fixture.mjs")[1];

  assert.match(workflow, /github\.com\/micronaut-projects\/micronaut-platform\.git/);
  assert.match(workflow, /PLATFORM_DOCS_RENDER_ALL:\s*"true"/);
  assert.match(workflow, /PLATFORM_DOCS_SYNC_SOURCES:\s*"true"/);
  assert.match(syncScript, /readPlatformCatalogProjects/);

  for (const [file, content] of fileContents) {
    assert.doesNotMatch(content, /micronaut-platform-docs/, `${file} should not reference the old platform docs project`);
    assert.doesNotMatch(content, /dstepanov\.github\.io\/micronaut-platform-docs/, `${file} should not reference the old published docs aggregate`);
  }
});

test("platform docs renderer uses checked-in project metadata when external metadata is absent", async (t) => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "micronaut-web-generated-docs-"));
  t.after(() => fs.rm(temporaryDirectory, { force: true, recursive: true }));
  const platformDocsDirectory = path.join(temporaryDirectory, "missing-platform-docs-metadata");
  const outputDirectory = path.join(temporaryDirectory, "generated-docs");

  await fs.mkdir(platformDocsDirectory, { recursive: true });
  await execFile(
    process.execPath,
    [
      "scripts/render-platform-docs.mjs",
      "--platform-docs-dir",
      platformDocsDirectory,
      "--output",
      outputDirectory,
      "--slugs",
      "core"
    ],
    {
      cwd: projectDirectory,
      env: nonStrictEnv()
    }
  );

  assert.deepEqual(await fs.readdir(outputDirectory), []);
});

test("platform docs renderer defaults to a small project subset", async (t) => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "micronaut-web-generated-docs-"));
  t.after(() => fs.rm(temporaryDirectory, { force: true, recursive: true }));
  const platformDocsDirectory = path.join(temporaryDirectory, "missing-platform-docs-sources");
  const outputDirectory = path.join(temporaryDirectory, "generated-docs");

  await fs.mkdir(platformDocsDirectory, { recursive: true });
  const { stderr } = await execFile(
    process.execPath,
    [
      "scripts/render-platform-docs.mjs",
      "--platform-docs-dir",
      platformDocsDirectory,
      "--output",
      outputDirectory
    ],
    {
      cwd: projectDirectory,
      env: nonStrictEnv()
    }
  );

  assert.deepEqual(
    lines(stderr)
      .filter((line) => line.startsWith("Skipping "))
      .map((line) => line.replace(/^Skipping ([^:]+):.*$/, "$1")),
    ["core", "data", "serde"]
  );
  assert.deepEqual(await fs.readdir(outputDirectory), []);
});

test("platform docs renderer writes generated HTML and page-relative docs asset links", async (t) => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "micronaut-web-generated-docs-"));
  t.after(() => fs.rm(temporaryDirectory, { force: true, recursive: true }));
  const platformDocsDirectory = path.join(temporaryDirectory, "platform-docs");
  const outputDirectory = path.join(temporaryDirectory, "generated-docs");
  const submoduleDirectory = path.join(platformDocsDirectory, "repos", "micronaut-fixture");
  const guideDirectory = path.join(submoduleDirectory, "src", "main", "docs", "guide");
  const imageDirectory = path.join(submoduleDirectory, "src", "main", "docs", "resources", "img");

  await fs.mkdir(path.join(platformDocsDirectory, "gradle"), { recursive: true });
  await fs.mkdir(guideDirectory, { recursive: true });
  await fs.mkdir(imageDirectory, { recursive: true });
  await fs.writeFile(
    path.join(platformDocsDirectory, "gradle", "platform-doc-projects.properties"),
    [
      "project.count=1",
      "project.0.slug=fixture",
      "project.0.displayName=Micronaut Fixture",
      "project.0.submodulePath=repos/micronaut-fixture",
      "project.0.repositoryUrl=https://github.com/micronaut-projects/micronaut-fixture.git",
      "project.0.branch=master",
      "project.0.platformVersionKey=micronaut"
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(
    path.join(guideDirectory, "toc.yml"),
    "title: Fixture Docs\nintroduction: Introduction\n",
    "utf8"
  );
  await fs.writeFile(
    path.join(guideDirectory, "introduction.adoc"),
    [
      "This generated fixture body should render into the docs page.",
      "",
      "include::{includedir}configurationProperties/io.micronaut.fixture.GeneratedConfiguration.adoc[]",
      "",
      "image::diagram.svg[Fixture diagram]"
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(
    path.join(imageDirectory, "diagram.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>',
    "utf8"
  );

  const { stderr } = await execFile(
    process.execPath,
    [
      "scripts/render-platform-docs.mjs",
      "--platform-docs-dir",
      platformDocsDirectory,
      "--output",
      outputDirectory,
      "--slugs",
      "fixture"
    ],
    {
      cwd: projectDirectory
    }
  );
  assert.doesNotMatch(stderr, /include file not found|GeneratedConfiguration/i);

  const generatedHtml = await fs.readFile(path.join(outputDirectory, "fixture.html"), "utf8");
  const pageRelativeAssetUrl = "../assets/fixture/docs/img/diagram.svg";

  assert.match(generatedHtml, /This generated fixture body should render into the docs page\./);
  assert.match(generatedHtml, /id="fixture-introduction"/);
  assert.match(generatedHtml, new RegExp(`src="${escapeRegExp(pageRelativeAssetUrl)}"`));
  assert.equal(
    new URL(pageRelativeAssetUrl, "https://example.test/docs/fixture/").pathname,
    "/docs/assets/fixture/docs/img/diagram.svg"
  );
  assert.equal(
    await fs.readFile(path.join(outputDirectory, "assets", "fixture", "docs", "img", "diagram.svg"), "utf8"),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>'
  );
});

test("platform docs renderer turns code, dependency, configuration, and properties snippets into shared cards", async (t) => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "micronaut-web-generated-snippets-"));
  t.after(() => fs.rm(temporaryDirectory, { force: true, recursive: true }));
  const platformDocsDirectory = path.join(temporaryDirectory, "platform-docs");
  const outputDirectory = path.join(temporaryDirectory, "generated-docs");
  const submoduleDirectory = path.join(platformDocsDirectory, "repos", "micronaut-fixture");
  const snippetSourceDirectory = path.join(submoduleDirectory, "test-suite", "src", "test", "java", "example");

  await fs.mkdir(path.join(platformDocsDirectory, "gradle"), { recursive: true });
  await fs.mkdir(snippetSourceDirectory, { recursive: true });
  await fs.writeFile(
    path.join(platformDocsDirectory, "gradle", "platform-doc-projects.properties"),
    [
      "project.count=1",
      "project.0.slug=fixture",
      "project.0.displayName=Micronaut Fixture",
      "project.0.submodulePath=repos/micronaut-fixture",
      "project.0.repositoryUrl=https://github.com/micronaut-projects/micronaut-fixture.git",
      "project.0.branch=master",
      "project.0.platformVersionKey=micronaut"
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(
    path.join(snippetSourceDirectory, "FixtureSnippet.java"),
    [
      "package example;",
      "",
      "// tag::body[]",
      "class FixtureSnippet {",
      "    void run() { // <1>",
      "    }",
      "}",
      "// end::body[]"
    ].join("\n"),
    "utf8"
  );
  await writeGuide(
    platformDocsDirectory,
    "micronaut-fixture",
    "Fixture Docs",
    [
      "snippet::example.FixtureSnippet[tags=body,title=Fixture Snippet,description=Rendered from snippet macro]",
      "",
      "<1> Snippet callout follows the generated card.",
      "",
      "dependency:micronaut-http-client[groupId=io.micronaut,title=HTTP Client dependency,description=Rendered from dependency macro]",
      "",
      "[configuration,title=Configuration snippet]",
      "----",
      "micronaut:",
      "  server:",
      "    port: 8080",
      "----",
      "",
      ".Configuration Properties",
      "|===",
      "|Property |Type |Description",
      "|micronaut.server.port |Integer |Server port",
      "|==="
    ].join("\n")
  );

  await execFile(
    process.execPath,
    [
      "scripts/render-platform-docs.mjs",
      "--platform-docs-dir",
      platformDocsDirectory,
      "--output",
      outputDirectory,
      "--slugs",
      "fixture",
      "--strict"
    ],
    {
      cwd: projectDirectory
    }
  );

  const generatedHtml = await fs.readFile(path.join(outputDirectory, "fixture.html"), "utf8");
  const generatedText = textOnly(generatedHtml);

  assert.doesNotMatch(generatedHtml, /<micronaut-snippet/i);
  assert.match(generatedHtml, /docs-code-snippet-template/);
  assert.match(generatedHtml, /docs-dependency-template/);
  assert.match(generatedHtml, /docs-properties-template/);
  assert.match(generatedHtml, /docs-code-callouts/);
  assert.match(generatedHtml, /<i class="conum" data-value="1"><\/i>/);
  assert.match(generatedText, /Fixture Snippet/);
  assert.match(generatedText, /Rendered from snippet macro/);
  assert.match(generatedText, /Snippet callout follows the generated card/);
  assert.match(generatedText, /HTTP Client dependency/);
  assert.match(generatedText, /Rendered from dependency macro/);
  assert.match(generatedText, /io\.micronaut:micronaut-http-client/);
  assert.match(generatedText, /Configuration snippet/);
  assert.match(generatedText, /micronaut\.server\.port=8080/);
  assert.match(generatedText, /Configuration Properties/);
  assert.match(generatedText, /2 properties/);
});

test("platform docs renderer can render every project in a manifest", async (t) => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "micronaut-web-generated-docs-"));
  t.after(() => fs.rm(temporaryDirectory, { force: true, recursive: true }));
  const platformDocsDirectory = path.join(temporaryDirectory, "platform-docs");
  const outputDirectory = path.join(temporaryDirectory, "generated-docs");

  await fs.mkdir(path.join(platformDocsDirectory, "gradle"), { recursive: true });
  await fs.writeFile(
    path.join(platformDocsDirectory, "gradle", "platform-doc-projects.properties"),
    [
      "project.count=2",
      "project.0.slug=alpha",
      "project.0.displayName=Micronaut Alpha",
      "project.0.submodulePath=repos/micronaut-alpha",
      "project.0.repositoryUrl=https://github.com/micronaut-projects/micronaut-alpha.git",
      "project.0.branch=master",
      "project.0.platformVersionKey=micronaut",
      "project.1.slug=beta",
      "project.1.displayName=Micronaut Beta",
      "project.1.submodulePath=repos/micronaut-beta",
      "project.1.repositoryUrl=https://github.com/micronaut-projects/micronaut-beta.git",
      "project.1.branch=master",
      "project.1.platformVersionKey=micronaut"
    ].join("\n"),
    "utf8"
  );
  await writeGuide(platformDocsDirectory, "micronaut-alpha", "Alpha Docs", "Alpha introduction.");
  await writeGuide(platformDocsDirectory, "micronaut-beta", "Beta Docs", "Beta introduction.");

  await execFile(
    process.execPath,
    [
      "scripts/render-platform-docs.mjs",
      "--platform-docs-dir",
      platformDocsDirectory,
      "--output",
      outputDirectory,
      "--all",
      "--strict"
    ],
    {
      cwd: projectDirectory
    }
  );

  assert.deepEqual((await fs.readdir(outputDirectory)).filter((file) => file.endsWith(".html")).sort(), [
    "alpha.html",
    "beta.html"
  ]);
});

test("platform docs project manifest can be derived from Micronaut Platform libraries", async (t) => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "micronaut-web-platform-catalog-"));
  t.after(() => fs.rm(temporaryDirectory, { force: true, recursive: true }));
  const catalogFile = path.join(temporaryDirectory, "libs.versions.toml");
  await fs.writeFile(
    catalogFile,
    [
      "[versions]",
      "managed-micronaut-core = \"5.0.0-RC2\"",
      "managed-micronaut-data = \"5.0.0-RC1\"",
      "managed-micronaut-guides = \"0.3.0\"",
      "",
      "[libraries]",
      "boms-micronaut-core = { module = \"io.micronaut:micronaut-core-bom\", version.ref = \"managed-micronaut-core\" }",
      "boms-micronaut-data = { module = \"io.micronaut.data:micronaut-data-bom\", version.ref = \"managed-micronaut-data\" }",
      "boms-micronaut-guides = { module = \"io.micronaut.guides:micronaut-guides-bom\", version.ref = \"managed-micronaut-guides\" }"
    ].join("\n"),
    "utf8"
  );

  const projects = await readPlatformCatalogProjects(catalogFile, {
    "project.count": "1",
    "project.0.slug": "data",
    "project.0.displayName": "Micronaut Data",
    "project.0.projectKey": "data",
    "project.0.module": "io.micronaut.data:micronaut-data-bom",
    "project.0.repositoryName": "micronaut-data",
    "project.0.publishedGuideUrl": "https://micronaut-projects.github.io/micronaut-data/latest/guide/",
    "project.0.repositoryUrl": "https://github.com/micronaut-projects/micronaut-data.git",
    "project.0.branch": "5.0.x",
    "project.0.submodulePath": "repos/micronaut-data",
    "project.0.platformVersionKey": "managed-micronaut-data"
  });

  assert.deepEqual(projects.map((project) => project.slug), ["core", "data"]);
  assert.deepEqual(projects[0], {
    slug: "core",
    displayName: "Micronaut Core",
    projectKey: "core",
    module: "io.micronaut:micronaut-core-bom",
    repositoryName: "micronaut-core",
    publishedGuideUrl: "https://docs.micronaut.io/latest/guide/",
    repositoryUrl: "https://github.com/micronaut-projects/micronaut-core.git",
    branch: "5.0.x",
    submodulePath: "repos/micronaut-core",
    platformVersionKey: "managed-micronaut-core"
  });
});

test("platform docs commandline source blocks use shell highlighting", () => {
  assert.equal(shikiLanguage("commandline"), "shellscript");
  assert.equal(shikiLanguage("graphqls"), "graphql");
  assert.equal(shikiLanguage("mysql"), "sql");
});

test("docs routes render generated fragments and serve generated assets", async () => {
  const docsPageSource = await fs.readFile(path.join(projectDirectory, "src", "pages", "docs", "[slug].astro"), "utf8");
  const assetsRouteSource = await fs.readFile(path.join(projectDirectory, "src", "pages", "docs", "assets", "[...path].ts"), "utf8");

  assert.match(docsPageSource, /readFile\(join\(process\.cwd\(\),[\s\S]*"generated-docs"[\s\S]*`\$\{project\.slug\}\.html`/);
  assert.match(docsPageSource, /data-generated-docs/);
  assert.match(docsPageSource, /set:html=\{generatedDocHtml\}/);
  assert.match(assetsRouteSource, /"src", "content", "generated-docs", "assets"/);
  assert.match(assetsRouteSource, /fs\.readFile\(path\.join\(generatedAssetsDirectory/);
});

function assertScriptOrder(script, producer, consumer) {
  assert.equal(typeof script, "string");
  const producerIndex = script.indexOf(producer );
  const consumerIndex = script.indexOf(consumer);
  assert.notEqual(producerIndex, -1, `${script} should include '${producer}'`);
  assert.notEqual(consumerIndex, -1, `${script} should include '${consumer}'`);
  assert.ok(producerIndex < consumerIndex, `${script} should run '${producer}' before '${consumer}'`);
}

function nonStrictEnv() {
  return {
    ...process.env,
    CI: "false",
    PLATFORM_DOCS_PROJECT_SLUGS: "",
    PLATFORM_DOCS_RENDER_ALL: "false",
    PLATFORM_DOCS_RENDER_STRICT: "false",
    PLATFORM_DOCS_SYNC_SOURCES: "false"
  };
}

async function writeGuide(platformDocsDirectory, repositoryName, title, body) {
  const guideDirectory = path.join(platformDocsDirectory, "repos", repositoryName, "src", "main", "docs", "guide");
  await fs.mkdir(guideDirectory, { recursive: true });
  await fs.writeFile(path.join(guideDirectory, "toc.yml"), `title: ${title}\nintroduction: Introduction\n`, "utf8");
  await fs.writeFile(path.join(guideDirectory, "introduction.adoc"), body, "utf8");
}

function lines(value) {
  return value.split(/\r?\n/).filter(Boolean);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textOnly(value) {
  return value.replace(/<[^>]*>/g, "");
}
