import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { highlightListingBlocks, shikiLanguage } from "../shared/highlight.ts";
import { readPlatformCatalogProjects } from "./project-manifest.ts";
import {
  buildDocsSearchIndex,
  extractGeneratedDocSearchItems,
} from "./search-index.ts";

const execFile = promisify(execFileCallback);
const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

test("generated docs are prepared before Astro dev and build", async (): Promise<any> => {
  const packageJson = JSON.parse(
    await fs.readFile(path.join(projectDirectory, "package.json"), "utf8"),
  );

  assert.equal(
    packageJson.scripts["prepare:generated-docs"],
    "npm run render:docs",
  );
  assert.equal(
    packageJson.scripts["prepare:generated-content"],
    "node scripts/prepare-generated-content.ts",
  );
  assertScriptOrder(
    packageJson.scripts.dev,
    "npm run prepare:generated-content",
    "astro dev",
  );
  assertScriptOrder(
    packageJson.scripts.build,
    "npm run prepare:generated-content",
    "astro build",
  );
});

test("generated docs fragments and assets are ignored and not tracked source", async (): Promise<any> => {
  const ignoredPaths = [
    "src/content/generated-docs/generated-docs-test.html",
    "src/content/generated-docs/assets/generated-docs-test/docs/img/example.png",
  ];
  const { stdout: ignoredOutput } = await execFile(
    "git",
    ["check-ignore", ...ignoredPaths],
    {
      cwd: projectDirectory,
    },
  );
  assert.deepEqual(lines(ignoredOutput), ignoredPaths);

  const { stdout: trackedOutput } = await execFile(
    "git",
    ["ls-files", "--", "src/content/generated-docs"],
    {
      cwd: projectDirectory,
    },
  );
  const trackedGeneratedOutput = lines(trackedOutput).filter(
    (file: any): any =>
      file.endsWith(".html") ||
      file.startsWith("src/content/generated-docs/assets/"),
  );
  assert.deepEqual(trackedGeneratedOutput, []);
});

test("generated docs tooling uses Micronaut Platform catalog instead of the old aggregate docs project", async (): Promise<any> => {
  const checkedFiles = [
    ".github/workflows/deploy-web.yml",
    "README.md",
    "src/content/generated-docs/README.md",
    "src/data/docs-projects.fixture.json",
    "scripts/render-docs.ts",
    "scripts/sync-docs-fixture.ts",
  ];
  const fileContents = await Promise.all(
    checkedFiles.map(
      async (file: any): Promise<any> => [
        file,
        await fs.readFile(path.join(projectDirectory, file), "utf8"),
      ],
    ),
  );
  const workflow = fileContents.find(
    ([file]: any): any => file === ".github/workflows/deploy-web.yml",
  )[1];
  const syncScript = fileContents.find(
    ([file]: any): any => file === "scripts/sync-docs-fixture.ts",
  )[1];

  assert.match(
    workflow,
    /github\.com\/micronaut-projects\/micronaut-platform\.git/,
  );
  assert.match(workflow, /DOCS_RENDER_ALL:\s*"true"/);
  assert.match(workflow, /DOCS_SYNC_SOURCES:\s*"true"/);
  assert.match(syncScript, /readPlatformCatalogProjects/);

  const oldAggregateDocsProject = new RegExp("micronaut-platform-" + "docs");
  const oldPublishedDocsAggregate = new RegExp(
    String.raw`dstepanov\.github\.io\/micronaut-platform-` + "docs",
  );
  for (const [file, content] of fileContents) {
    assert.doesNotMatch(
      content,
      oldAggregateDocsProject,
      `${file} should not reference the old aggregate docs project`,
    );
    assert.doesNotMatch(
      content,
      oldPublishedDocsAggregate,
      `${file} should not reference the old published docs aggregate`,
    );
  }
});

test("docs renderer uses checked-in project metadata when external metadata is absent", async (t: any): Promise<any> => {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-web-generated-docs-"),
  );
  t.after((): any =>
    fs.rm(temporaryDirectory, { force: true, recursive: true }),
  );
  const docsDirectory = path.join(temporaryDirectory, "missing-docs-metadata");
  const outputDirectory = path.join(temporaryDirectory, "generated-docs");

  await fs.mkdir(docsDirectory, { recursive: true });
  await execFile(
    process.execPath,
    [
      "scripts/render-docs.ts",
      "--docs-dir",
      docsDirectory,
      "--output",
      outputDirectory,
      "--slugs",
      "core",
    ],
    {
      cwd: projectDirectory,
      env: nonStrictEnv(),
    },
  );

  assert.deepEqual(await fs.readdir(outputDirectory), []);
});

test("docs renderer defaults to a small project subset", async (t: any): Promise<any> => {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-web-generated-docs-"),
  );
  t.after((): any =>
    fs.rm(temporaryDirectory, { force: true, recursive: true }),
  );
  const docsDirectory = path.join(temporaryDirectory, "missing-docs-sources");
  const outputDirectory = path.join(temporaryDirectory, "generated-docs");

  await fs.mkdir(docsDirectory, { recursive: true });
  const { stderr } = await execFile(
    process.execPath,
    [
      "scripts/render-docs.ts",
      "--docs-dir",
      docsDirectory,
      "--output",
      outputDirectory,
    ],
    {
      cwd: projectDirectory,
      env: nonStrictEnv(),
    },
  );

  assert.deepEqual(
    lines(stderr)
      .filter((line: any): any => line.startsWith("Skipping "))
      .map((line: any): any => line.replace(/^Skipping ([^:]+):.*$/, "$1")),
    ["core", "data", "serde"],
  );
  assert.deepEqual(await fs.readdir(outputDirectory), []);
});

test("docs renderer writes generated HTML and page-relative docs asset links", async (t: any): Promise<any> => {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-web-generated-docs-"),
  );
  t.after((): any =>
    fs.rm(temporaryDirectory, { force: true, recursive: true }),
  );
  const docsDirectory = path.join(temporaryDirectory, "docs");
  const outputDirectory = path.join(temporaryDirectory, "generated-docs");
  const submoduleDirectory = path.join(
    docsDirectory,
    "repos",
    "micronaut-fixture",
  );
  const guideDirectory = path.join(
    submoduleDirectory,
    "src",
    "main",
    "docs",
    "guide",
  );
  const imageDirectory = path.join(
    submoduleDirectory,
    "src",
    "main",
    "docs",
    "resources",
    "img",
  );

  await fs.mkdir(path.join(docsDirectory, "gradle"), {
    recursive: true,
  });
  await fs.mkdir(guideDirectory, { recursive: true });
  await fs.mkdir(imageDirectory, { recursive: true });
  await fs.writeFile(
    path.join(docsDirectory, "gradle", "docs-projects.properties"),
    [
      "project.count=1",
      "project.0.slug=fixture",
      "project.0.displayName=Micronaut Fixture",
      "project.0.submodulePath=repos/micronaut-fixture",
      "project.0.repositoryUrl=https://github.com/micronaut-projects/micronaut-fixture.git",
      "project.0.branch=master",
      "project.0.platformVersionKey=micronaut",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(guideDirectory, "toc.yml"),
    "title: Fixture Docs\nintroduction: Introduction\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(guideDirectory, "introduction.adoc"),
    [
      "This generated fixture body should render into the docs page.",
      "",
      "include::{includedir}configurationProperties/io.micronaut.fixture.GeneratedConfiguration.adoc[]",
      "",
      "image::diagram.svg[Fixture diagram]",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(imageDirectory, "diagram.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>',
    "utf8",
  );

  const { stderr } = await execFile(
    process.execPath,
    [
      "scripts/render-docs.ts",
      "--docs-dir",
      docsDirectory,
      "--output",
      outputDirectory,
      "--slugs",
      "fixture",
    ],
    {
      cwd: projectDirectory,
    },
  );
  assert.doesNotMatch(stderr, /include file not found|GeneratedConfiguration/i);

  const generatedHtml = await fs.readFile(
    path.join(outputDirectory, "fixture.html"),
    "utf8",
  );
  const pageRelativeAssetUrl = "../assets/fixture/docs/img/diagram.svg";

  assert.match(
    generatedHtml,
    /This generated fixture body should render into the docs page\./,
  );
  assert.match(generatedHtml, /id="fixture-introduction"/);
  assert.match(
    generatedHtml,
    new RegExp(`src="${escapeRegExp(pageRelativeAssetUrl)}"`),
  );
  assert.equal(
    new URL(pageRelativeAssetUrl, "https://example.test/docs/fixture/")
      .pathname,
    "/docs/assets/fixture/docs/img/diagram.svg",
  );
  assert.equal(
    await fs.readFile(
      path.join(
        outputDirectory,
        "assets",
        "fixture",
        "docs",
        "img",
        "diagram.svg",
      ),
      "utf8",
    ),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>',
  );
});

test("docs renderer turns code, dependency, configuration, and properties snippets into shared cards", async (t: any): Promise<any> => {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-web-generated-snippets-"),
  );
  t.after((): any =>
    fs.rm(temporaryDirectory, { force: true, recursive: true }),
  );
  const docsDirectory = path.join(temporaryDirectory, "docs");
  const outputDirectory = path.join(temporaryDirectory, "generated-docs");
  const submoduleDirectory = path.join(
    docsDirectory,
    "repos",
    "micronaut-fixture",
  );
  const snippetSourceDirectory = path.join(
    submoduleDirectory,
    "test-suite",
    "src",
    "test",
    "java",
    "example",
  );

  await fs.mkdir(path.join(docsDirectory, "gradle"), {
    recursive: true,
  });
  await fs.mkdir(snippetSourceDirectory, { recursive: true });
  await fs.writeFile(
    path.join(docsDirectory, "gradle", "docs-projects.properties"),
    [
      "project.count=1",
      "project.0.slug=fixture",
      "project.0.displayName=Micronaut Fixture",
      "project.0.submodulePath=repos/micronaut-fixture",
      "project.0.repositoryUrl=https://github.com/micronaut-projects/micronaut-fixture.git",
      "project.0.branch=master",
      "project.0.platformVersionKey=micronaut",
    ].join("\n"),
    "utf8",
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
      "// end::body[]",
    ].join("\n"),
    "utf8",
  );
  await writeGuide(
    docsDirectory,
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
      "|===",
    ].join("\n"),
  );

  await execFile(
    process.execPath,
    [
      "scripts/render-docs.ts",
      "--docs-dir",
      docsDirectory,
      "--output",
      outputDirectory,
      "--slugs",
      "fixture",
    ],
    {
      cwd: projectDirectory,
    },
  );

  const generatedHtml = await fs.readFile(
    path.join(outputDirectory, "fixture.html"),
    "utf8",
  );
  const generatedText = textOnly(generatedHtml);

  assert.doesNotMatch(generatedHtml, /<micronaut-snippet/i);
  assert.match(generatedHtml, /docs-code-snippet-template/);
  assert.match(generatedHtml, /docs-dependency-template/);
  assert.match(generatedHtml, /docs-properties-template/);
  assert.match(generatedHtml, /docs-code-callouts/);
  assert.match(generatedHtml, /<i class="conum" data-value="1"><\/i>/);
  assert.ok(
    generatedHtml.includes(
      "[&amp;_td:first-child_.conum::before]:content-[attr(data-value)]",
    ),
  );
  assert.ok(generatedHtml.includes("[&amp;_td:first-child_.conum+b]:hidden"));
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

test("docs search index includes generated headings, properties, classes, projects, and repos", (): any => {
  const project = {
    slug: "fixture",
    displayName: "Micronaut Fixture",
    shortName: "Fixture",
    projectKey: "fixture",
    module: "io.micronaut.fixture:micronaut-fixture-bom",
    repositoryName: "micronaut-fixture",
    repositoryUrl:
      "https://github.com/micronaut-projects/micronaut-fixture.git",
    href: "/docs/fixture/",
    shortDescription: "Fixture integration",
    longDescription: "Fixture generated docs test project.",
    searchTerms: ["fixture"],
    sections: [
      {
        id: "fixture-overview",
        number: "1",
        title: "Overview",
        summary: "Fixture overview fallback.",
      },
    ],
  };
  const html = [
    '<div class="guide-section-heading">',
    '  <h1 id="fixture-introduction"><a class="anchor" href="#fixture-introduction"></a>1 Introduction</h1>',
    "</div>",
    '<div class="guide-section-heading">',
    '  <h2 id="fixture-client"><a class="anchor" href="#fixture-client"></a>1.1 HTTP Client</h2>',
    "</div>",
    '<div class="docs-properties-template">',
    "  <table>",
    "    <tbody>",
    "      <tr><td><p><code>micronaut.fixture.enabled</code></p></td><td><p>Boolean</p></td><td><p>Enables the fixture.</p></td></tr>",
    "    </tbody>",
    "  </table>",
    "</div>",
    '<p>Use <a href="../assets/fixture/docs/api/io/micronaut/fixture/FixtureClient.html">FixtureClient</a>.</p>',
  ].join("\n");

  const generatedItems = extractGeneratedDocSearchItems(project, html);
  assert.ok(
    generatedItems.some(
      (item: any): any =>
        item.scope === "Docs" && item.title.includes("HTTP Client"),
    ),
  );
  assert.ok(
    generatedItems.some(
      (item: any): any =>
        item.scope === "Properties" &&
        item.title === "micronaut.fixture.enabled",
    ),
  );
  assert.ok(
    generatedItems.some(
      (item: any): any =>
        item.scope === "Classes" && item.title === "FixtureClient",
    ),
  );

  const index = buildDocsSearchIndex([project], { fixture: html });
  assert.ok(
    index.some(
      (item: any): any =>
        item.scope === "Projects" && item.href === "/docs/fixture/",
    ),
  );
  assert.ok(
    index.some(
      (item: any): any =>
        item.scope === "Repos" && item.href === project.repositoryUrl,
    ),
  );
  assert.ok(
    index.some(
      (item: any): any =>
        item.scope === "Docs" &&
        item.href === "/docs/fixture/#fixture-overview",
    ),
  );
  assert.ok(
    index.some(
      (item: any): any =>
        item.scope === "Classes" &&
        item.href ===
          "/docs/assets/fixture/docs/api/io/micronaut/fixture/FixtureClient.html",
    ),
  );
});

test("docs renderer can render every project in a manifest", async (t: any): Promise<any> => {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-web-generated-docs-"),
  );
  t.after((): any =>
    fs.rm(temporaryDirectory, { force: true, recursive: true }),
  );
  const docsDirectory = path.join(temporaryDirectory, "docs");
  const outputDirectory = path.join(temporaryDirectory, "generated-docs");

  await fs.mkdir(path.join(docsDirectory, "gradle"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(docsDirectory, "gradle", "docs-projects.properties"),
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
      "project.1.platformVersionKey=micronaut",
    ].join("\n"),
    "utf8",
  );
  await writeGuide(
    docsDirectory,
    "micronaut-alpha",
    "Alpha Docs",
    "Alpha introduction.",
  );
  await writeGuide(
    docsDirectory,
    "micronaut-beta",
    "Beta Docs",
    "Beta introduction.",
  );

  await execFile(
    process.execPath,
    [
      "scripts/render-docs.ts",
      "--docs-dir",
      docsDirectory,
      "--output",
      outputDirectory,
      "--all",
      "--strict",
    ],
    {
      cwd: projectDirectory,
    },
  );

  assert.deepEqual(
    (await fs.readdir(outputDirectory))
      .filter((file: any): any => file.endsWith(".html"))
      .sort(),
    ["alpha.html", "beta.html"],
  );
});

test("docs project manifest can be derived from Micronaut Platform libraries", async (t: any): Promise<any> => {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-web-platform-catalog-"),
  );
  t.after((): any =>
    fs.rm(temporaryDirectory, { force: true, recursive: true }),
  );
  const catalogFile = path.join(temporaryDirectory, "libs.versions.toml");
  await fs.writeFile(
    catalogFile,
    [
      "[versions]",
      'managed-micronaut-core = "5.0.0-RC2"',
      'managed-micronaut-data = "5.0.0-RC1"',
      'managed-micronaut-guides = "0.3.0"',
      "",
      "[libraries]",
      'boms-micronaut-core = { module = "io.micronaut:micronaut-core-bom", version.ref = "managed-micronaut-core" }',
      'boms-micronaut-data = { module = "io.micronaut.data:micronaut-data-bom", version.ref = "managed-micronaut-data" }',
      'boms-micronaut-guides = { module = "io.micronaut.guides:micronaut-guides-bom", version.ref = "managed-micronaut-guides" }',
    ].join("\n"),
    "utf8",
  );

  const projects = await readPlatformCatalogProjects(catalogFile, {
    "project.count": "1",
    "project.0.slug": "data",
    "project.0.displayName": "Micronaut Data",
    "project.0.projectKey": "data",
    "project.0.module": "io.micronaut.data:micronaut-data-bom",
    "project.0.repositoryName": "micronaut-data",
    "project.0.publishedGuideUrl":
      "https://micronaut-projects.github.io/micronaut-data/latest/guide/",
    "project.0.repositoryUrl":
      "https://github.com/micronaut-projects/micronaut-data.git",
    "project.0.branch": "5.0.x",
    "project.0.submodulePath": "repos/micronaut-data",
    "project.0.platformVersionKey": "managed-micronaut-data",
  });

  assert.deepEqual(
    projects.map((project: any): any => project.slug),
    ["core", "data"],
  );
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
    platformVersionKey: "managed-micronaut-core",
  });
});

test("docs commandline source blocks use shell highlighting", (): any => {
  assert.equal(shikiLanguage("commandline"), "shellscript");
  assert.equal(shikiLanguage("graphqls"), "graphql");
  assert.equal(shikiLanguage("mysql"), "sql");
});

test("properties listings attach standalone callout markers to the next property line", async (): Promise<any> => {
  const html = await highlightListingBlocks(
    [
      '<div class="listingblock">',
      '<div class="content">',
      '<pre><code class="language-properties">micronaut.mcp.server.info.name=Weather',
      "&lt;1&gt;",
      "micronaut.mcp.server.transport=HTTP</code></pre>",
      "</div>",
      "</div>",
    ].join("\n"),
  );

  const transportLine =
    /<span class="line">[^\n]*micronaut\.mcp\.server\.transport[^\n]*<\/span>/.exec(
      html,
    )?.[0] || "";
  assert.match(transportLine, /<i class="conum" data-value="1"><\/i>/);
  assert.doesNotMatch(
    html,
    /<span class="line"><span[^>]*><i class="conum" data-value="1"><\/i><\/span><\/span>\s*<span class="line">[^\n]*micronaut\.mcp\.server\.transport/,
  );
});

test("properties listings attach comment-only callout markers to the next property line", async (): Promise<any> => {
  const html = await highlightListingBlocks(
    [
      '<div class="listingblock">',
      '<div class="content">',
      '<pre><code class="language-properties">micronaut.mcp.server.info.name=Weather',
      "micronaut.mcp.server.info.version=0.0.1",
      "# &lt;1&gt;",
      "micronaut.mcp.server.transport=HTTP</code></pre>",
      "</div>",
      "</div>",
    ].join("\n"),
  );

  const transportLine =
    /<span class="line">[^\n]*micronaut\.mcp\.server\.transport[^\n]*<\/span>/.exec(
      html,
    )?.[0] || "";
  assert.match(transportLine, /HTTP <i class="conum" data-value="1"><\/i>/);
  assert.doesNotMatch(html, />#[^<]*<i class="conum" data-value="1"><\/i>/);
});

test("docs routes render generated fragments and serve generated assets", async (): Promise<any> => {
  const docsPageSource = await fs.readFile(
    path.join(projectDirectory, "src", "pages", "docs", "[slug].astro"),
    "utf8",
  );
  const assetsRouteSource = await fs.readFile(
    path.join(
      projectDirectory,
      "src",
      "pages",
      "docs",
      "assets",
      "[...path].ts",
    ),
    "utf8",
  );
  const searchIndexRouteSource = await fs.readFile(
    path.join(projectDirectory, "src", "pages", "docs", "search-index.json.ts"),
    "utf8",
  );

  assert.match(
    docsPageSource,
    /readFile\(join\(process\.cwd\(\),[\s\S]*"generated-docs"[\s\S]*`\$\{project\.slug\}\.html`/,
  );
  assert.match(docsPageSource, /data-generated-docs/);
  assert.match(docsPageSource, /set:html=\{generatedDocHtml\}/);
  assert.match(
    assetsRouteSource,
    /"src", "content", "generated-docs", "assets"/,
  );
  assert.match(
    assetsRouteSource,
    /fs\.readFile\(path\.join\(generatedAssetsDirectory/,
  );
  assert.match(searchIndexRouteSource, /buildDocsSearchIndex/);
  assert.match(searchIndexRouteSource, /"generated-docs"/);
});

function assertScriptOrder(script: any, producer: any, consumer: any): any {
  assert.equal(typeof script, "string");
  const producerIndex = script.indexOf(producer);
  const consumerIndex = script.indexOf(consumer);
  assert.notEqual(producerIndex, -1, `${script} should include '${producer}'`);
  assert.notEqual(consumerIndex, -1, `${script} should include '${consumer}'`);
  assert.ok(
    producerIndex < consumerIndex,
    `${script} should run '${producer}' before '${consumer}'`,
  );
}

function nonStrictEnv(): any {
  return {
    ...process.env,
    CI: "false",
    DOCS_PROJECT_SLUGS: "",
    DOCS_RENDER_ALL: "false",
    DOCS_RENDER_STRICT: "false",
    DOCS_SYNC_SOURCES: "false",
  };
}

async function writeGuide(
  docsDirectory: any,
  repositoryName: any,
  title: any,
  body: any,
): Promise<any> {
  const guideDirectory = path.join(
    docsDirectory,
    "repos",
    repositoryName,
    "src",
    "main",
    "docs",
    "guide",
  );
  await fs.mkdir(guideDirectory, { recursive: true });
  await fs.writeFile(
    path.join(guideDirectory, "toc.yml"),
    `title: ${title}\nintroduction: Introduction\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(guideDirectory, "introduction.adoc"),
    body,
    "utf8",
  );
}

function lines(value: any): any {
  return value.split(/\r?\n/).filter(Boolean);
}

function escapeRegExp(value: any): any {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textOnly(value: any): any {
  return value.replace(/<[^>]*>/g, "");
}
