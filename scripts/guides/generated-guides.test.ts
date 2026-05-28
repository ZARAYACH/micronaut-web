import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

test("generated guides fragments, manifest, and assets are ignored", async (): Promise<any> => {
  const ignoredPaths = [
    "src/content/generated-guides/manifest.json",
    "src/content/generated-guides/fragments/example-gradle-java.html",
    "src/content/generated-guides/assets/example/image.png",
  ];
  const { stdout: ignoredOutput } = await execFile(
    "git",
    ["check-ignore", ...ignoredPaths],
    {
      cwd: projectDirectory,
    },
  );
  assert.deepEqual(lines(ignoredOutput), ignoredPaths);
});

test("guide renderer defaults to the small guide subset and expands guide macros", async (t: any): Promise<any> => {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-web-guides-"),
  );
  t.after((): any =>
    fs.rm(temporaryDirectory, { force: true, recursive: true }),
  );
  const guidesDirectory = path.join(temporaryDirectory, "micronaut-guides");
  const outputDirectory = path.join(temporaryDirectory, "generated-guides");

  await writeGuideFixture(
    guidesDirectory,
    "micronaut-http-client",
    "HTTP Client",
  );
  await writeGuideFixture(
    guidesDirectory,
    "not-default-guide",
    "Ignored Guide",
  );

  const { stderr } = await execFile(
    process.execPath,
    [
      "scripts/render-guides.ts",
      "--guides-dir",
      guidesDirectory,
      "--output",
      outputDirectory,
    ],
    {
      cwd: projectDirectory,
      env: nonStrictEnv(),
    },
  );
  assert.doesNotMatch(
    stderr,
    /no callout found|callout list item index|include file not found/i,
  );

  const manifest = JSON.parse(
    await fs.readFile(path.join(outputDirectory, "manifest.json"), "utf8"),
  );
  assert.deepEqual(
    manifest.guides.map((guide: any): any => guide.slug),
    ["micronaut-http-client"],
  );

  const html = await fs.readFile(
    path.join(
      outputDirectory,
      "fragments",
      "micronaut-http-client-gradle-java.html",
    ),
    "utf8",
  );
  assert.match(html, /Hello DEFAULT from template/);
  assert.match(html, /Injected value: World/);
  assert.match(html, /ExampleController/);
  assert.match(html, /message[\s\S]*=Hello/);
  const transportLine =
    /<span class="line">[^\n]*fixture\.marker\.transport[^\n]*<\/span>/.exec(
      html,
    )?.[0] || "";
  assert.match(transportLine, /<i class="conum" data-value="1"><\/i>/);
  assert.doesNotMatch(
    html,
    /<span class="line"><span[^>]*><i class="conum" data-value="1"><\/i><\/span><\/span>\s*<span class="line">[^\n]*fixture\.marker\.transport/,
  );
  assert.match(
    html,
    /Properties comment callout attaches to the property line/,
  );
  assert.match(
    html,
    /implementation[\s\S]*io\.micronaut:micronaut-http-client/,
  );
  assertMicronautHttpClientGuideHasProperSnippets(html);
  assert.match(html, /Adds HTTP client dependency/);
  assert.match(html, /Manual callout keeps its place/);
  assert.match(html, /Raw include callout/);
  assert.match(html, /Kubernetes include callout/);
  assert.match(html, /docs-properties-template/);
  assert.match(html, /micronaut\.server\.port/);
  assert.match(html, /Unmarked source callout/);
  assert.match(html, /Missing source marker becomes manual/);
  assert.match(html, /Gapped first real callout/);
  assert.match(html, /Gapped second real callout/);
  assert.match(html, /Gapped third real callout/);
  assert.match(html, /Gapped fourth real callout/);
  assert.match(html, /Gapped missing marker becomes manual/);
  assert.match(html, /asciidoc-manual-callouts/);
  assert.match(html, /<i class="conum" data-value="1"><\/i>/);
  assert.match(html, /<i class="conum" data-value="4"><\/i>/);
  assert.match(
    html,
    /<td>\s*<i class="conum" data-value="1"><\/i><b>1<\/b>\s*<\/td>/,
  );
  assert.doesNotMatch(html, /__MICRONAUT_CALLOUT_|\uE000|\uE001/);
  assert.match(html, /https:\/\/micronaut\.io\/launch\?/);
  assert.match(html, /href="\.\.\/another-guide\.html"/);
  assert.match(html, /href="\.\.\/legacy-guide\.html"/);
  assert.match(
    html,
    /href="https:\/\/guides\.micronaut\.io\/latest\/micronaut-http-client-gradle-java\.zip"/,
  );
  assert.doesNotMatch(
    html,
    /source:|common-template:|callout:|dependency:|diffLink:/,
  );
  assertNoRuntimeGeneratedRendering("generated guide HTML", html);
  const mavenHtml = await fs.readFile(
    path.join(
      outputDirectory,
      "fragments",
      "micronaut-http-client-maven-java.html",
    ),
    "utf8",
  );
  assertMicronautHttpClientGuideHasProperSnippets(mavenHtml);
  assert.match(mavenHtml, /Maven/);
  assert.match(mavenHtml, /io\.micronaut/);
  assert.doesNotMatch(mavenHtml, /<!--1-->|<!--2-->/);
});

test("guide renderer can render all guides in strict pipeline mode", async (t: any): Promise<any> => {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-web-guides-all-"),
  );
  t.after((): any =>
    fs.rm(temporaryDirectory, { force: true, recursive: true }),
  );
  const guidesDirectory = path.join(temporaryDirectory, "micronaut-guides");
  const outputDirectory = path.join(temporaryDirectory, "generated-guides");

  await writeGuideFixture(
    guidesDirectory,
    "micronaut-http-client",
    "HTTP Client",
  );
  await writeGuideFixture(guidesDirectory, "not-default-guide", "Other Guide");

  await execFile(
    process.execPath,
    [
      "scripts/render-guides.ts",
      "--guides-dir",
      guidesDirectory,
      "--output",
      outputDirectory,
      "--all",
      "--strict",
    ],
    {
      cwd: projectDirectory,
    },
  );

  const manifest = JSON.parse(
    await fs.readFile(path.join(outputDirectory, "manifest.json"), "utf8"),
  );
  assert.deepEqual(
    manifest.guides.map((guide: any): any => guide.slug).sort(),
    ["micronaut-http-client", "not-default-guide"],
  );
});

test("strict guide renderer fails when Asciidoctor reports diagnostics", async (t: any): Promise<any> => {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-web-guides-strict-"),
  );
  t.after((): any =>
    fs.rm(temporaryDirectory, { force: true, recursive: true }),
  );
  const guidesDirectory = path.join(temporaryDirectory, "micronaut-guides");
  const outputDirectory = path.join(temporaryDirectory, "generated-guides");

  await writeBrokenGuideFixture(guidesDirectory, "broken-guide");

  await assert.rejects(
    execFile(
      process.execPath,
      [
        "scripts/render-guides.ts",
        "--guides-dir",
        guidesDirectory,
        "--output",
        outputDirectory,
        "--slugs",
        "broken-guide",
        "--strict",
      ],
      {
        cwd: projectDirectory,
      },
    ),
    (error: any): any => {
      const childError = error as { stdout?: string; stderr?: string };
      const output = `${childError.stdout ?? ""}\n${childError.stderr ?? ""}`;
      assert.match(output, /Asciidoctor diagnostics/);
      assert.match(output, /include file not found|include file not readable/i);
      return true;
    },
  );
});

test("latest guide replacement routes and parallel generated-content preparation are wired", async (): Promise<any> => {
  const packageJson = JSON.parse(
    await fs.readFile(path.join(projectDirectory, "package.json"), "utf8"),
  );
  const guidesWorkflow = await fs.readFile(
    path.join(projectDirectory, ".github", "workflows", "deploy-guides.yml"),
    "utf8",
  );
  const webWorkflow = await fs.readFile(
    path.join(projectDirectory, ".github", "workflows", "deploy-web.yml"),
    "utf8",
  );
  const prepareScript = await fs.readFile(
    path.join(projectDirectory, "scripts", "prepare-generated-content.ts"),
    "utf8",
  );
  const legacyRoute = await fs.readFile(
    path.join(projectDirectory, "src", "pages", "latest", "[page].html.ts"),
    "utf8",
  );
  const zipRoute = await fs.readFile(
    path.join(projectDirectory, "src", "pages", "latest", "[download].zip.ts"),
    "utf8",
  );
  const guidesIndexRoute = await fs.readFile(
    path.join(projectDirectory, "src", "pages", "guides", "index.astro"),
    "utf8",
  );
  const guidesRoute = await fs.readFile(
    path.join(projectDirectory, "src", "pages", "guides", "[slug].astro"),
    "utf8",
  );
  const guidesLegacyRoute = await fs.readFile(
    path.join(projectDirectory, "src", "pages", "guides", "[slug].html.ts"),
    "utf8",
  );
  const guidesZipRoute = await fs.readFile(
    path.join(projectDirectory, "src", "pages", "guides", "[download].zip.ts"),
    "utf8",
  );
  const generatedGuidesServerLibrary = await fs.readFile(
    path.join(projectDirectory, "src", "lib", "generated-guides.ts"),
    "utf8",
  );
  const generatedGuidesRoutingLibrary = await fs.readFile(
    path.join(projectDirectory, "src", "lib", "generated-guide-routing.ts"),
    "utf8",
  );
  const guidesRenderer = await fs.readFile(
    path.join(projectDirectory, "scripts", "guides", "renderer.ts"),
    "utf8",
  );
  const guidesPreprocessor = await fs.readFile(
    path.join(projectDirectory, "scripts", "guides", "preprocessor.ts"),
    "utf8",
  );
  const guidesExtensions = await readDirectoryText(
    path.join(projectDirectory, "scripts", "guides", "extensions"),
  );
  const generatedDocsStaticEnhancer = await fs.readFile(
    path.join(
      projectDirectory,
      "src",
      "components",
      "web",
      "generated-docs-static-enhancer.astro",
    ),
    "utf8",
  );
  const guideCatalog = await fs.readFile(
    path.join(
      projectDirectory,
      "src",
      "components",
      "web",
      "latest-guides-catalog.astro",
    ),
    "utf8",
  );

  assert.equal(
    packageJson.scripts["render:guides"],
    "node scripts/render-guides.ts",
  );
  assert.equal(
    packageJson.scripts["test:guides"],
    "node --test scripts/guides/*.test.ts && npm run test:guides:browser",
  );
  assert.equal(
    packageJson.scripts["test:guides:browser"],
    "playwright test --config playwright.config.ts",
  );
  assert.match(prepareScript, /Promise\.all/);
  assert.match(prepareScript, /render-docs\.ts/);
  assert.match(prepareScript, /render-guides\.ts/);
  assert.match(prepareScript, /MICRONAUT_PREPARE_GENERATED_CONTENT/);
  assert.match(prepareScript, /MICRONAUT_DEPLOY_SURFACE/);
  assert.match(
    guidesWorkflow,
    /default:\s*micronaut-projects\/micronaut-guides/,
  );
  assert.match(guidesWorkflow, /GUIDES_RENDER_ALL:\s*"true"/);
  assert.match(guidesWorkflow, /GUIDES_RENDER_STRICT:\s*"true"/);
  assert.doesNotMatch(guidesWorkflow, /micronaut-platform/);
  assert.doesNotMatch(guidesWorkflow, /DOCS_DIR/);
  assert.doesNotMatch(guidesWorkflow, /DOCS_RENDER_ALL/);
  assert.doesNotMatch(guidesWorkflow, /DOCS_RENDER_STRICT/);
  assert.doesNotMatch(guidesWorkflow, /DOCS_SYNC_SOURCES/);
  assert.doesNotMatch(webWorkflow, /micronaut-guides/);
  assert.doesNotMatch(webWorkflow, /GUIDES_RENDER_ALL/);
  assert.doesNotMatch(webWorkflow, /GUIDES_RENDER_STRICT/);
  await assert.rejects(
    () =>
      fs.access(
        path.join(projectDirectory, "src", "pages", "latest", "[page].astro"),
      ),
    (error: any): boolean => error?.code === "ENOENT",
  );
  assert.doesNotMatch(legacyRoute, /@\/lib\/protocol/);
  assert.doesNotMatch(legacyRoute, /productionUrl\("guides"\)/);
  assert.match(legacyRoute, /const guidesRoot = "\/guides"/);
  assert.match(legacyRoute, /guideOptionPath\(option, guidesRoot\)/);
  assert.match(legacyRoute, /preferredGuideOption\(guide\)/);
  assert.doesNotMatch(legacyRoute, /guideOverviewPath/);
  assert.match(
    legacyRoute,
    /appendRequestSearch\(withBasePath\(props\.destination\), url\)/,
  );
  assert.match(zipRoute, /productionUrl\("guides", option\.zipUrl\)/);
  assert.match(zipRoute, /redirect\(props\.zipUrl, 302\)/);
  assert.match(guidesIndexRoute, /readGeneratedGuidesManifest/);
  assert.match(guidesIndexRoute, /root="\/guides"/);
  assert.doesNotMatch(guidesIndexRoute, /GuidesCatalogTabs|GuidesFilterPanel/);
  assert.doesNotMatch(guidesIndexRoute, /@\/lib\/protocol/);
  assert.match(guidesRoute, /readGeneratedGuideFragment/);
  assert.match(guidesRoute, /preferredGuideOption\(props\.guide\)/);
  assert.match(guidesRoute, /Astro\.redirect/);
  assert.doesNotMatch(
    guidesRoute,
    /Choose the language and build tool variant for the tutorial/,
  );
  assert.doesNotMatch(guidesRoute, /Read This Guide/);
  assert.match(guidesRoute, /On this guide/);
  assert.doesNotMatch(
    guidesRoute,
    /aria-label="On this guide"[\s\S]*Choose the language and build tool variant for the tutorial/,
  );
  assert.match(guidesRoute, /In this section/);
  assert.match(guidesRoute, /buildGuidePageIndexSections/);
  assert.match(
    guidesRoute,
    /guideSectionLinks = pageIndexSections\.filter\(\(section\) => section\.level === 0\)\.slice\(0, 30\)/,
  );
  assert.match(
    guidesRoute,
    /guideSectionLinks\.map\(\(section\)[\s\S]*Different variants[\s\S]*props\.guide\.options\.map\(\(option\)/,
  );
  assert.equal(guidesRoute.match(/aria-label=\{section\.label\}/g)?.length, 4);
  assert.equal(guidesRoute.match(/aria-label=\{option\.label\}/g)?.length, 2);
  assert.equal(
    guidesRoute.match(/aria-label="Different variants"/g)?.length,
    2,
  );
  assert.doesNotMatch(
    guidesRoute,
    /Different variants[\s\S]{0,500}All variants/,
  );
  assert.match(guidesRoute, /data-guide-section-link/);
  assert.match(guidesRoute, /guideSectionLinksById/);
  assert.match(guidesRoute, /data-guide-page-index/);
  assert.match(guidesRoute, /data-guide-page-index-inner/);
  assert.match(guidesRoute, /data-root-id/);
  assert.match(guidesRoute, /\[&\.active\]:before:bg-brand/);
  assert.doesNotMatch(guidesRoute, /\.guide-page-index/);
  assert.match(guidesRoute, /requestAnimationFrame\(updateActiveSection\)/);
  assert.match(guidesRoute, /guideOptionPath\(option, guidesRoot\)/);
  assert.doesNotMatch(guidesRoute, /legacyGuidesBase/);
  assert.match(guidesRoute, /GeneratedDocsStaticEnhancer/);
  assertNoRuntimeGeneratedRendering("guides route", guidesRoute);
  assert.doesNotMatch(
    guidesRoute,
    /GeneratedDocsEnhancer|GeneratedDocsPropertiesFallback/,
  );
  assert.match(guidesLegacyRoute, /preferredGuideOption\(guide\)/);
  assert.doesNotMatch(guidesLegacyRoute, /guideOverviewPath/);
  assert.doesNotMatch(guidesLegacyRoute, /legacyGuidesBase/);
  assert.doesNotMatch(guidesLegacyRoute, /productionUrl\("guides"\)/);
  assert.match(guidesZipRoute, /productionUrl\("guides", option\.zipUrl\)/);
  assert.match(generatedGuidesServerLibrary, /node:fs\/promises/);
  assert.match(generatedGuidesServerLibrary, /node:path/);
  assert.match(generatedGuidesServerLibrary, /generated-guide-routing/);
  assert.match(generatedGuidesRoutingLibrary, /preferredGuideOption/);
  assert.match(
    generatedGuidesRoutingLibrary,
    /option\.language === "java" && option\.buildTool === "gradle"/,
  );
  assert.match(
    generatedGuidesRoutingLibrary,
    /option\.file === guide\.defaultOptionFile/,
  );
  assert.doesNotMatch(guidesRenderer, /processAsciiDocHtml/);
  assert.doesNotMatch(guidesRenderer, /renderStaticSnippetCards/);
  assert.doesNotMatch(guidesRenderer, /renderStaticDocsSnippets/);
  assert.doesNotMatch(guidesRenderer, /renderStaticListingBlockSnippets/);
  assert.doesNotMatch(guidesPreprocessor, /snippetBlockLines/);
  assert.match(guidesExtensions, /registry\.block/);
  assert.match(guidesExtensions, /renderSnippetBlockWithCalloutReader/);
  assert.doesNotMatch(guidesPreprocessor, /normalizeAsciiDocCallouts/);
  assert.doesNotMatch(guidesPreprocessor, /normalizeOrphanCalloutLists/);
  assert.doesNotMatch(guidesPreprocessor, /SNIPPET_CALLOUT_VALIDATION_CLASS/);
  assertNoRuntimeGeneratedRendering(
    "generated guides static enhancer",
    generatedDocsStaticEnhancer,
  );
  assert.doesNotMatch(
    generatedDocsStaticEnhancer,
    /docsSnippetStyles|define:vars/,
  );
  assert.match(guideCatalog, /version\.current \? rootPath : version\.href/);
});

function assertMicronautHttpClientGuideHasProperSnippets(source: string) {
  assert.match(
    source,
    /docs-code-snippet-template/,
    "Micronaut HTTP Client guide source blocks must render as snippet cards",
  );
  assert.match(
    source,
    /docs-dependency-template/,
    "Micronaut HTTP Client guide dependency blocks must render as dependency snippet cards",
  );
  assert.match(
    source,
    /docs-code-callouts/,
    "Micronaut HTTP Client guide callouts must render below snippet cards",
  );
  assert.match(
    source,
    /data-copy-active-snippet/,
    "Micronaut HTTP Client guide snippet cards must include copy controls",
  );
  assertSnippetLanguageIcon(source, "java", "java");
  assertSnippetLanguageIcon(source, "kotlin", "kotlin");
  assertSnippetLanguageIcon(source, "groovy", "groovy");
  assertSnippetLanguageIcon(source, "properties", "properties");
  assertSnippetLanguageIcon(source, "yaml", "yaml");
  if (source.includes('data-lang="gradle"')) {
    assertSnippetLanguageIcon(source, "gradle", "gradle");
  }
  if (source.includes('data-lang="maven"')) {
    assertSnippetLanguageIcon(source, "maven", "maven");
  }
  assert.doesNotMatch(
    source,
    /\[(?:snippet|dependency),payload=|docs-snippet-callout-validation/,
    "Micronaut HTTP Client guide snippet blocks must be fully consumed during static rendering",
  );
}

function assertNoRuntimeGeneratedRendering(label: string, source: string) {
  assert.doesNotMatch(
    source,
    /renderSharedSnippetCard|renderSharedPropertiesCard|enhanceCodeSnippets|enhanceStandaloneCodeBlocks|docsSnippetTemplates|renderDocsSnippetTemplates/,
    `${label} must not render generated snippet or properties cards at runtime`,
  );
  assert.doesNotMatch(
    source,
    /codeToHtml|createHighlighter|getHighlighter|from ["']shiki["']|import\(["']shiki["']\)/,
    `${label} must not highlight generated code at runtime`,
  );
}

async function writeGuideFixture(
  guidesDirectory: any,
  slug: any,
  title: any,
): Promise<any> {
  const guideDirectory = path.join(guidesDirectory, "guides", slug);
  await fs.mkdir(
    path.join(guidesDirectory, "src", "docs", "common", "snippets"),
    { recursive: true },
  );
  await fs.mkdir(
    path.join(guidesDirectory, "src", "docs", "common", "callouts"),
    { recursive: true },
  );
  await fs.mkdir(
    path.join(
      guideDirectory,
      "java",
      "src",
      "main",
      "java",
      "example",
      "micronaut",
    ),
    { recursive: true },
  );
  await fs.mkdir(path.join(guideDirectory, "src", "main", "resources"), {
    recursive: true,
  });
  await fs.mkdir(path.join(guideDirectory, "deployment"), { recursive: true });
  await fs.writeFile(
    path.join(guidesDirectory, "version.txt"),
    "4.9.0\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(
      guidesDirectory,
      "src",
      "docs",
      "common",
      "snippets",
      "common-template.adoc",
    ),
    "Hello {0_U} from template\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(
      guidesDirectory,
      "src",
      "docs",
      "common",
      "callouts",
      "callout-fixture.adoc",
    ),
    "Injected value: {0}\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(
      guidesDirectory,
      "src",
      "docs",
      "common",
      "callouts",
      "callout-generated-one.adoc",
    ),
    "<.> Generated callout one.\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(
      guidesDirectory,
      "src",
      "docs",
      "common",
      "callouts",
      "callout-generated-three.adoc",
    ),
    "<.> Generated callout three.\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(
      guidesDirectory,
      "src",
      "docs",
      "common",
      "snippets",
      "common-license.adoc",
    ),
    "",
    "utf8",
  );
  await fs.writeFile(
    path.join(guideDirectory, "metadata.json"),
    JSON.stringify(
      {
        title,
        intro: "Fixture intro.",
        authors: ["Micronaut"],
        tags: ["http-client", "test"],
        categories: ["HTTP Client"],
        publicationDate: "2026-01-01",
        languages: ["java"],
        buildTools: ["gradle", "maven"],
        apps: [{ name: "default", features: ["http-client"] }],
      },
      null,
      2,
    ),
    "utf8",
  );
  await fs.writeFile(
    path.join(guideDirectory, `${slug}.adoc`),
    [
      "common-template:template.adoc[arg0=default]",
      "callout:fixture[arg0=World]",
      "guideLink:another-guide[Another Guide]",
      "https://guides.micronaut.io/latest/legacy-guide.html[Legacy Guide]",
      "link:@sourceDir@.zip[Download]",
      "diffLink:[]",
      ":dependencies:",
      "dependency:micronaut-http-client[groupId=io.micronaut,callout=1]",
      "dependency:micronaut-validation[groupId=io.micronaut.validation,callout=2]",
      ":dependencies:",
      "<1> Adds HTTP client dependency.",
      "<2> Adds validation dependency.",
      "source:ExampleController[tags=package|hello]",
      "resource:application.properties[tag=config]",
      "<1> Properties comment callout attaches to the property line.",
      "source:MarkedController[]",
      "callout:generated-one[]",
      "<2> Manual callout keeps its place.",
      "callout:generated-three[]",
      "source:PartiallyMarkedController[]",
      "callout:generated-one[]",
      "<2> Missing source marker becomes manual.",
      "source:GappedController[]",
      "<1> Gapped first real callout.",
      "<2> Gapped missing marker becomes manual.",
      "<3> Gapped second real callout.",
      "<4> Gapped third real callout.",
      "<5> Gapped fourth real callout.",
      "",
      "[source,java]",
      "----",
      `include::{sourceDir}/${slug}/@sourceDir@/src/main/@lang@/example/micronaut/IncludedController.@languageextension@[tag=included]`,
      "----",
      "<1> Raw include callout.",
      "",
      "[source,yaml]",
      "----",
      `include::{sourceDir}/${slug}/@sourceDir@/deployment/k8s.yml[]`,
      "----",
      "<1> Kubernetes include callout.",
      "",
      "[source,kotlin]",
      "----",
      "class GuideKotlinSnippet",
      "----",
      "",
      "[source,groovy]",
      "----",
      "class GuideGroovySnippet {",
      "}",
      "----",
      "",
      "[source,properties]",
      "----",
      "guide.fixture.enabled=true",
      "----",
      "",
      ".Configuration Properties",
      '[cols="1,1"]',
      "|===",
      "|Property |Description",
      "|`micronaut.server.port` |Server port.",
      "|===",
      "",
      "[source,java]",
      "----",
      "final class UnmarkedController {",
      "}",
      "----",
      "<1> Unmarked source callout.",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(
      guideDirectory,
      "java",
      "src",
      "main",
      "java",
      "example",
      "micronaut",
      "ExampleController.java",
    ),
    [
      "// tag::package[]",
      "package example.micronaut;",
      "// end::package[]",
      "",
      "// tag::hello[]",
      "final class ExampleController {",
      "}",
      "// end::hello[]",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(
      guideDirectory,
      "java",
      "src",
      "main",
      "java",
      "example",
      "micronaut",
      "MarkedController.java",
    ),
    [
      "package example.micronaut;",
      "",
      "final class MarkedController {",
      "    void generated() { // <1>",
      "    }",
      "",
      "    void manual() { // <2>",
      "    }",
      "",
      "    void generatedAgain() { // <3>",
      "    }",
      "}",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(
      guideDirectory,
      "java",
      "src",
      "main",
      "java",
      "example",
      "micronaut",
      "IncludedController.java",
    ),
    [
      "package example.micronaut;",
      "",
      "// tag::included[]",
      "final class IncludedController {",
      "    String value() { // <1>",
      '        return "included";',
      "    }",
      "}",
      "// end::included[]",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(
      guideDirectory,
      "java",
      "src",
      "main",
      "java",
      "example",
      "micronaut",
      "PartiallyMarkedController.java",
    ),
    [
      "package example.micronaut;",
      "",
      "final class PartiallyMarkedController {",
      "    void generated() { // <1>",
      "    }",
      "}",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(
      guideDirectory,
      "java",
      "src",
      "main",
      "java",
      "example",
      "micronaut",
      "GappedController.java",
    ),
    [
      "package example.micronaut;",
      "",
      "final class GappedController {",
      "    void first() { // <1>",
      "    }",
      "",
      "    void second() { // <3>",
      "    }",
      "",
      "    void third() { // <4>",
      "    }",
      "",
      "    void fourth() { // <5>",
      "    }",
      "}",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(
      guideDirectory,
      "src",
      "main",
      "resources",
      "application.properties",
    ),
    [
      "# tag::config[]",
      "message=Hello",
      "# <1>",
      "fixture.marker.transport=HTTP",
      "# end::config[]",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(guideDirectory, "deployment", "k8s.yml"),
    [
      "apiVersion: v1",
      "kind: Service # <1>",
      "metadata:",
      "  name: fixture",
    ].join("\n"),
    "utf8",
  );
}

async function writeBrokenGuideFixture(
  guidesDirectory: any,
  slug: any,
): Promise<any> {
  const guideDirectory = path.join(guidesDirectory, "guides", slug);
  await fs.mkdir(guideDirectory, { recursive: true });
  await fs.writeFile(
    path.join(guidesDirectory, "version.txt"),
    "4.9.0\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(guideDirectory, "metadata.json"),
    JSON.stringify(
      {
        title: "Broken Guide",
        intro: "Fixture intro.",
        authors: ["Micronaut"],
        tags: ["test"],
        categories: ["Test"],
        publicationDate: "2026-01-01",
        languages: ["java"],
        buildTools: ["gradle"],
        apps: [{ name: "default", features: [] }],
      },
      null,
      2,
    ),
    "utf8",
  );
  await fs.writeFile(
    path.join(guideDirectory, `${slug}.adoc`),
    ["include::definitely-missing.adoc[]"].join("\n"),
    "utf8",
  );
}

function nonStrictEnv(): any {
  return {
    ...process.env,
    CI: "false",
    GUIDES_RENDER_ALL: "false",
    GUIDES_RENDER_STRICT: "false",
    GUIDES_RENDER_SLUGS: "",
  };
}

function lines(value: any): any {
  return value.split(/\r?\n/).filter(Boolean);
}

async function readDirectoryText(directory: string): Promise<string> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(
    entries
      .filter(
        (entry: any): boolean => entry.isFile() && entry.name.endsWith(".ts"),
      )
      .map(
        (entry: any): Promise<string> =>
          fs.readFile(path.join(directory, entry.name), "utf8"),
      ),
  );
  return contents.join("\n");
}

function assertSnippetLanguageIcon(
  source: string,
  language: string,
  icon: string,
): void {
  assert.match(
    buttonHtmlForLanguage(source, language),
    new RegExp(`docs-code-language-icon-${escapeRegExp(icon)}`),
    `${language} guide snippets should use the ${icon} icon`,
  );
}

function buttonHtmlForLanguage(source: string, language: string): string {
  const dataLangIndex = source.indexOf(`data-lang="${language}"`);
  if (dataLangIndex < 0) {
    return "";
  }
  const buttonStart = source.lastIndexOf("<button", dataLangIndex);
  const buttonEnd = source.indexOf("</button>", dataLangIndex);
  if (buttonStart < 0 || buttonEnd < 0) {
    return "";
  }
  return source.slice(buttonStart, buttonEnd + "</button>".length);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
