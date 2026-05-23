import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("generated guides fragments, manifest, and assets are ignored", async () => {
  const ignoredPaths = [
    "src/content/generated-guides/manifest.json",
    "src/content/generated-guides/fragments/example-gradle-java.html",
    "src/content/generated-guides/assets/example/image.png"
  ];
  const { stdout: ignoredOutput } = await execFile("git", ["check-ignore", ...ignoredPaths], {
    cwd: projectDirectory
  });
  assert.deepEqual(lines(ignoredOutput), ignoredPaths);
});

test("guide renderer defaults to the small guide subset and expands guide macros", async (t) => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "micronaut-web-guides-"));
  t.after(() => fs.rm(temporaryDirectory, { force: true, recursive: true }));
  const guidesDirectory = path.join(temporaryDirectory, "micronaut-guides");
  const outputDirectory = path.join(temporaryDirectory, "generated-guides");

  await writeGuideFixture(guidesDirectory, "micronaut-http-client", "HTTP Client");
  await writeGuideFixture(guidesDirectory, "not-default-guide", "Ignored Guide");

  await execFile(
    process.execPath,
    [
      "scripts/render-guides.mjs",
      "--guides-dir",
      guidesDirectory,
      "--output",
      outputDirectory
    ],
    {
      cwd: projectDirectory,
      env: nonStrictEnv()
    }
  );

  const manifest = JSON.parse(await fs.readFile(path.join(outputDirectory, "manifest.json"), "utf8"));
  assert.deepEqual(manifest.guides.map((guide) => guide.slug), ["micronaut-http-client"]);

  const html = await fs.readFile(path.join(outputDirectory, "fragments", "micronaut-http-client-gradle-java.html"), "utf8");
  assert.match(html, /Hello DEFAULT from template/);
  assert.match(html, /Injected value: World/);
  assert.match(html, /ExampleController/);
  assert.match(html, /message[\s\S]*=Hello/);
  assert.match(html, /implementation[\s\S]*io\.micronaut:micronaut-http-client/);
  assert.match(html, /https:\/\/micronaut\.io\/launch\?/);
  assert.match(html, /href="\.\.\/another-guide\.html"/);
  assert.match(html, /href="\.\.\/legacy-guide\.html"/);
  assert.match(html, /href="\.\.\/micronaut-http-client-gradle-java\.zip"/);
  assert.doesNotMatch(html, /source:|common-template:|callout:|dependency:|diffLink:/);
});

test("guide renderer can render all guides in strict pipeline mode", async (t) => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "micronaut-web-guides-all-"));
  t.after(() => fs.rm(temporaryDirectory, { force: true, recursive: true }));
  const guidesDirectory = path.join(temporaryDirectory, "micronaut-guides");
  const outputDirectory = path.join(temporaryDirectory, "generated-guides");

  await writeGuideFixture(guidesDirectory, "micronaut-http-client", "HTTP Client");
  await writeGuideFixture(guidesDirectory, "not-default-guide", "Other Guide");

  await execFile(
    process.execPath,
    [
      "scripts/render-guides.mjs",
      "--guides-dir",
      guidesDirectory,
      "--output",
      outputDirectory,
      "--all",
      "--strict"
    ],
    {
      cwd: projectDirectory
    }
  );

  const manifest = JSON.parse(await fs.readFile(path.join(outputDirectory, "manifest.json"), "utf8"));
  assert.deepEqual(manifest.guides.map((guide) => guide.slug).sort(), ["micronaut-http-client", "not-default-guide"]);
});

test("latest guide replacement routes and parallel generated-content preparation are wired", async () => {
  const packageJson = JSON.parse(await fs.readFile(path.join(projectDirectory, "package.json"), "utf8"));
  const workflow = await fs.readFile(path.join(projectDirectory, ".github", "workflows", "deploy-web.yml"), "utf8");
  const prepareScript = await fs.readFile(path.join(projectDirectory, "scripts", "prepare-generated-content.mjs"), "utf8");
  const latestRoute = await fs.readFile(path.join(projectDirectory, "src", "pages", "latest", "[page].astro"), "utf8");
  const legacyRoute = await fs.readFile(path.join(projectDirectory, "src", "pages", "latest", "[page].html.ts"), "utf8");
  const zipRoute = await fs.readFile(path.join(projectDirectory, "src", "pages", "latest", "[download].zip.ts"), "utf8");

  assert.equal(packageJson.scripts["render:guides"], "node scripts/render-guides.mjs");
  assert.equal(packageJson.scripts["test:guides"], "node --test scripts/guides/*.test.mjs");
  assert.match(prepareScript, /Promise\.all/);
  assert.match(prepareScript, /render-platform-docs\.mjs/);
  assert.match(prepareScript, /render-guides\.mjs/);
  assert.match(workflow, /github\.com\/micronaut-projects\/micronaut-guides\.git/);
  assert.match(workflow, /GUIDES_RENDER_ALL:\s*"true"/);
  assert.match(workflow, /GUIDES_RENDER_STRICT:\s*"true"/);
  assert.match(latestRoute, /tag-\$\{tagSlug\(tag\)\}/);
  assert.match(latestRoute, /option\.file\.replace/);
  assert.match(latestRoute, /readGeneratedGuideFragment/);
  assert.match(legacyRoute, /micronautProtocol\.guides\.guides/);
  assert.match(legacyRoute, /guides\.micronaut\.io\/latest/);
  assert.match(legacyRoute, /redirect\(props\.external \? props\.destination : withBasePath\(props\.destination\), props\.external \? 302 : 301\)/);
  assert.match(zipRoute, /guides\.micronaut\.io\/latest\/\$\{option\.zipUrl\}/);
  assert.match(zipRoute, /redirect\(props\.zipUrl, 302\)/);
});

async function writeGuideFixture(guidesDirectory, slug, title) {
  const guideDirectory = path.join(guidesDirectory, "guides", slug);
  await fs.mkdir(path.join(guidesDirectory, "src", "docs", "common", "snippets"), { recursive: true });
  await fs.mkdir(path.join(guidesDirectory, "src", "docs", "common", "callouts"), { recursive: true });
  await fs.mkdir(path.join(guideDirectory, "java", "src", "main", "java", "example", "micronaut"), { recursive: true });
  await fs.mkdir(path.join(guideDirectory, "src", "main", "resources"), { recursive: true });
  await fs.writeFile(path.join(guidesDirectory, "version.txt"), "4.9.0\n", "utf8");
  await fs.writeFile(
    path.join(guidesDirectory, "src", "docs", "common", "snippets", "common-template.adoc"),
    "Hello {0_U} from template\n",
    "utf8"
  );
  await fs.writeFile(
    path.join(guidesDirectory, "src", "docs", "common", "callouts", "callout-fixture.adoc"),
    "Injected value: {0}\n",
    "utf8"
  );
  await fs.writeFile(
    path.join(guidesDirectory, "src", "docs", "common", "snippets", "common-license.adoc"),
    "",
    "utf8"
  );
  await fs.writeFile(
    path.join(guideDirectory, "metadata.json"),
    JSON.stringify({
      title,
      intro: "Fixture intro.",
      authors: ["Micronaut"],
      tags: ["http-client", "test"],
      categories: ["HTTP Client"],
      publicationDate: "2026-01-01",
      languages: ["java"],
      buildTools: ["gradle"],
      apps: [{ name: "default", features: ["http-client"] }]
    }, null, 2),
    "utf8"
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
      "dependency:micronaut-http-client[groupId=io.micronaut]",
      "source:ExampleController[tag=hello]",
      "resource:application.properties[tag=config]"
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(
    path.join(guideDirectory, "java", "src", "main", "java", "example", "micronaut", "ExampleController.java"),
    [
      "package example.micronaut;",
      "",
      "// tag::hello[]",
      "final class ExampleController {",
      "}",
      "// end::hello[]"
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(
    path.join(guideDirectory, "src", "main", "resources", "application.properties"),
    [
      "# tag::config[]",
      "message=Hello",
      "# end::config[]"
    ].join("\n"),
    "utf8"
  );
}

function nonStrictEnv() {
  return {
    ...process.env,
    CI: "false",
    GUIDES_RENDER_ALL: "false",
    GUIDES_RENDER_STRICT: "false",
    GUIDES_RENDER_SLUGS: ""
  };
}

function lines(value) {
  return value.split(/\r?\n/).filter(Boolean);
}
