import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const modules = importSnippetModules();

test("homepage code example Markdown files use plain fenced blocks", async () => {
  const { parseMarkdownCodeSnippetVariants } = await modules;
  const entries = await readCodeExampleEntries();

  assert.deepEqual(
    entries.map((entry) => entry.data.id),
    ["server", "client", "testing", "launch"]
  );

  for (const entry of entries) {
    assert.doesNotMatch(entry.body, /^##\s/m, `${entry.fileName} must not define variants with headings`);
    assert.doesNotMatch(entry.body, /^```[^\S\r\n]*\w+[^\S\r\n]+\S/m, `${entry.fileName} must not use fence metadata`);
  }

  assert.deepEqual(
    entries.map((entry) => ({
      id: entry.data.id,
      languages: parseMarkdownCodeSnippetVariants(entry.body, entry.fileName).map((variant) => variant.language)
    })),
    [
      { id: "server", languages: ["java", "kotlin", "groovy"] },
      { id: "client", languages: ["java", "kotlin", "groovy"] },
      { id: "testing", languages: ["java", "kotlin", "groovy"] },
      { id: "launch", languages: ["bash"] }
    ]
  );
});

test("homepage code examples parse plain Markdown fences into snippet variants", async () => {
  const { parseMarkdownCodeSnippetVariants } = await modules;
  const variants = parseMarkdownCodeSnippetVariants(`
\`\`\`java
class HelloController {
}
\`\`\`

\`\`\`kotlin
class HelloController
\`\`\`

\`\`\`groovy
class HelloController {
}
\`\`\`
`, "test code example");

  assert.deepEqual(
    variants.map(({ fileName, label, language }) => ({ fileName, label, language })),
    [
      { fileName: "Java", label: "Java", language: "java" },
      { fileName: "Kotlin", label: "Kotlin", language: "kotlin" },
      { fileName: "Groovy", label: "Groovy", language: "groovy" }
    ]
  );
});

test("homepage code examples reject nonstandard fence metadata", async () => {
  const { parseMarkdownCodeSnippetVariants } = await modules;

  assert.throws(
    () => parseMarkdownCodeSnippetVariants("```java title=\"Hello.java\"\nclass Hello {}\n```", "test code example"),
    /nonstandard fence metadata/
  );
});

test("main-site Markdown code snippets use shared snippet cards", async () => {
  const { renderMainSiteCodeSnippets } = await modules;
  const html = await renderMainSiteCodeSnippets(`
<p>Before</p>
<pre><code class="language-java">import io.micronaut.http.annotation.Get;

@Get
String index() {
    return "Hello";
}</code></pre>
`);

  assert.match(html, /docs-snippet-template docs-code-block/);
  assert.match(html, /role="tab"[^>]*data-lang="java"/);
  assert.match(html, /data-copy-active-snippet/);
  assert.match(html, /<code class="language-java [^"]*shiki-code/);
  assert.doesNotMatch(html, /<pre><code class="language-java">/);
});

test("main-site Markdown snippets infer language when the fence has no language", async () => {
  const { renderMainSiteCodeSnippets } = await modules;
  const html = await renderMainSiteCodeSnippets(`
<pre><code>import io.micronaut.http.annotation.Controller;

@Controller("/hello")
class HelloController {
}</code></pre>
`);

  assert.match(html, /role="tab"[^>]*data-lang="java"/);
  assert.match(html, /<code class="language-java [^"]*shiki-code/);
});

test("main-site Markdown snippets infer Gradle and XML when fences have no language", async () => {
  const { renderMainSiteCodeSnippets } = await modules;
  const html = await renderMainSiteCodeSnippets(`
<pre><code>dependencies {
    runtimeOnly("org.yaml:snakeyaml")
}</code></pre>
<pre><code>&lt;dependency&gt;
    &lt;groupId&gt;org.yaml&lt;/groupId&gt;
    &lt;artifactId&gt;snakeyaml&lt;/artifactId&gt;
&lt;/dependency&gt;</code></pre>
`);

  assert.match(html, /role="tab"[^>]*data-lang="gradle"/);
  assert.match(html, /<code class="language-gradle [^"]*shiki-code/);
  assert.match(html, /role="tab"[^>]*data-lang="xml"/);
  assert.match(html, /<code class="language-xml [^"]*shiki-code/);
});

async function importSnippetModules() {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "micronaut-web-main-site-markdown-"));
  const entryFile = path.join(temporaryDirectory, "entry.ts");
  const outputFile = path.join(temporaryDirectory, "entry.cjs");
  await fs.writeFile(entryFile, `
export { parseMarkdownCodeSnippetVariants } from "${path.join(projectDirectory, "src", "lib", "code-snippet-markdown.ts")}";
export { renderMainSiteCodeSnippets } from "${path.join(projectDirectory, "src", "lib", "main-site-code-snippets.ts")}";
`, "utf8");

  await build({
    bundle: true,
    entryPoints: [entryFile],
    external: ["astro:*"],
    format: "cjs",
    jsx: "automatic",
    outfile: outputFile,
    platform: "node",
    plugins: [{
      name: "project-alias",
      setup(builder) {
        builder.onResolve({ filter: /^@\// }, (args) => ({
          path: resolveProjectAlias(args.path)
        }));
      }
    }],
    target: "node20"
  });

  return require(outputFile);
}

function resolveProjectAlias(specifier) {
  const basePath = path.join(projectDirectory, "src", specifier.slice(2));
  for (const candidate of [basePath, `${basePath}.ts`, `${basePath}.tsx`, `${basePath}.astro`]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return basePath;
}

async function readCodeExampleEntries() {
  const directory = path.join(projectDirectory, "src", "content", "code-examples");
  const fileNames = (await fs.readdir(directory)).filter((fileName) => fileName.endsWith(".md"));
  const entries = await Promise.all(fileNames.map(async (fileName) => {
    const source = await fs.readFile(path.join(directory, fileName), "utf8");
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    assert.ok(match, `${fileName} must start with frontmatter`);
    const body = source.slice(match[0].length);
    const data = parseSimpleFrontmatter(match[1]);
    return { body, data, fileName };
  }));

  return entries.sort((left, right) => left.data.order - right.data.order || left.data.title.localeCompare(right.data.title));
}

function parseSimpleFrontmatter(source) {
  return Object.fromEntries(source
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(":");
      assert.notEqual(separator, -1, `Invalid frontmatter line: ${line}`);
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      return [key, key === "order" ? Number(value) : value];
    }));
}
