import asciidoctorFactory from "asciidoctor";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { normalizeAsciiDocCallouts } from "./callouts.ts";
import { micronautExtensionRegistry } from "./extensions.ts";
import { processAsciiDocHtml } from "./postprocess.ts";
import { renderAsciiDoc } from "./rendering.ts";
import { expandSnippetMacrosForCallouts } from "./snippets.ts";
import { normalizeAsciiDocSource } from "./source-normalizer.ts";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const fixtureDirectory = path.join(
  projectDirectory,
  "scripts",
  "asciidoc",
  "fixtures",
);

test("AsciiDoc snippets render through the shared component templates", async (): Promise<any> => {
  const html = await renderSnippetGalleryFixture();
  const text = textOnly(html);

  assert.doesNotMatch(html, /\blistingblock\b/);
  assert.doesNotMatch(
    html,
    /<micronaut-snippet|docs-snippet-callout-validation/,
  );
  assert.equal(count(html, /docs-code-snippet-template/g), 15);
  assert.equal(count(html, /docs-dependency-template/g), 1);
  assert.equal(count(html, /docs-properties-template/g), 2);
  assert.equal(count(html, /docs-snippet-template docs-code-block/g), 16);
  assert.equal(count(html, /data-copy-active-snippet/g), 16);
  assert.ok(count(html, /docs-code-callouts/g) >= 3);

  assert.match(html, /id="generated-listing-snippet-0"/);
  assert.match(html, /data-slot="card"/);
  assert.match(html, /data-slot="card-header"/);
  assert.match(html, /data-slot="card-content"/);
  assert.match(html, /role="tablist" aria-label="Code language"/);
  assert.match(html, /class="[^"]*docs-code-content docs-snippet-card-content/);
  assert.match(html, /class="[^"]*shiki-code grid min-w-max/);
  assert.match(html, /<i class="conum" data-value="1"><\/i>/);

  for (const language of [
    "bash",
    "gradle",
    "groovy-config",
    "groovy",
    "hocon",
    "java",
    "json",
    "json-config",
    "kotlin",
    "maven",
    "properties",
    "text",
    "toml",
    "xml",
    "yaml",
  ]) {
    assert.match(html, new RegExp(`data-lang="${language}"`));
  }

  for (const [language, icon] of [
    ["bash", "terminal"],
    ["gradle", "gradle"],
    ["groovy", "groovy"],
    ["groovy-config", "groovy"],
    ["hocon", "hocon"],
    ["java", "java"],
    ["json", "json"],
    ["json-config", "json"],
    ["kotlin", "kotlin"],
    ["maven", "maven"],
    ["properties", "properties"],
    ["text", "text"],
    ["toml", "toml"],
    ["xml", "xml"],
    ["yaml", "yaml"],
  ]) {
    assert.match(
      buttonHtmlForLanguage(html, language),
      new RegExp(`docs-code-language-icon-${icon}`),
    );
  }

  assert.match(text, /\$ curl http:\/\/localhost:8080\/hello\s+Hello World/);
  assert.match(text, /Terminal command with title/);
  assert.match(
    text,
    /The controller source callout is rendered inside the card footer/,
  );
  assert.match(text, /The property callout marker moves to the property line/);
  assert.match(text, /Controller variants/);
  assert.match(text, /Rendered from snippet macro/);
  assert.match(
    text,
    /The snippet macro callout is attached to the shared snippet card/,
  );
  assert.match(text, /HTTP Client dependency/);
  assert.match(text, /Rendered from dependency macro/);
  assert.match(text, /io\.micronaut:micronaut-http-client/);
  assert.match(text, /Application configuration/);
  assert.match(text, /micronaut\.server\.port=8080/);
  assert.match(text, /Configuration Properties/);
  assert.match(text, /3 properties/);
});

async function renderSnippetGalleryFixture(): Promise<string> {
  const asciidoctor = asciidoctorFactory();
  const context = {
    attributes: {
      projectGroup: "io.micronaut",
    },
  };
  const source = await fs.readFile(
    path.join(fixtureDirectory, "snippet-gallery.adoc"),
    "utf8",
  );
  const normalizedSource = normalizeAsciiDocCallouts(
    expandSnippetMacrosForCallouts(
      normalizeAsciiDocSource(source),
      context,
      fixtureSnippetSamples,
    ),
  );
  const converted = renderAsciiDoc({
    asciidoctor,
    source: normalizedSource,
    convertOptions: {
      attributes: {
        icons: "font",
        idprefix: "",
        idseparator: "-",
      },
      base_dir: fixtureDirectory,
      extension_registry: micronautExtensionRegistry(asciidoctor, context, {
        snippetSamples: fixtureSnippetSamples,
      }),
    },
  });

  return processAsciiDocHtml(converted, { unwrapSnippetParagraphs: true });
}

function fixtureSnippetSamples(target: any): any {
  if (String(target).trim() !== "controller") {
    return [];
  }
  return [
    {
      language: "java",
      source: [
        "import io.micronaut.http.annotation.Controller;",
        "import io.micronaut.http.annotation.Get;",
        "",
        '@Controller("/hello") // <1>',
        "class HelloController {",
        "    @Get",
        "    String index() {",
        '        return "Hello World";',
        "    }",
        "}",
      ].join("\n"),
    },
    {
      language: "kotlin",
      source: [
        "import io.micronaut.http.annotation.Controller",
        "import io.micronaut.http.annotation.Get",
        "",
        '@Controller("/hello") // <1>',
        "class HelloController {",
        "    @Get",
        '    fun index(): String = "Hello World"',
        "}",
      ].join("\n"),
    },
    {
      language: "groovy",
      source: [
        "import io.micronaut.http.annotation.Controller",
        "import io.micronaut.http.annotation.Get",
        "",
        "@Controller('/hello') // <1>",
        "class HelloController {",
        "    @Get",
        "    String index() {",
        "        'Hello World'",
        "    }",
        "}",
      ].join("\n"),
    },
  ];
}

function count(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length || 0;
}

function textOnly(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function buttonHtmlForLanguage(value: string, language: string): string {
  const dataLangIndex = value.indexOf(`data-lang="${language}"`);
  if (dataLangIndex < 0) {
    return "";
  }
  const buttonStart = value.lastIndexOf("<button", dataLangIndex);
  const buttonEnd = value.indexOf("</button>", dataLangIndex);
  if (buttonStart < 0 || buttonEnd < 0) {
    return "";
  }
  return value.slice(buttonStart, buttonEnd + "</button>".length);
}
