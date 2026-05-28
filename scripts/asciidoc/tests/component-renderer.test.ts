import * as asciidoctor from "@asciidoctor/core";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { expandDependencyMacrosToBlocks } from "../dependencies.ts";
import { micronautExtensionRegistry } from "../extensions/index.ts";
import { renderAsciiDoc } from "../rendering.ts";
import { snippetBlock } from "../snippet-blocks.ts";
import { expandSnippetMacrosToBlocks } from "../snippets.ts";
import { normalizeAsciiDocSource } from "../source-normalizer.ts";
import { guideExtensionRegistry } from "../../guides/extensions/index.ts";
import type { GuideRenderContext } from "../../guides/preprocessor.ts";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const fixtureDirectory = path.join(
  projectDirectory,
  "scripts",
  "asciidoc",
  "fixtures",
);

test("AsciiDoc snippets render directly through generated React components", async (): Promise<any> => {
  const { converted, html } = await renderSnippetGalleryFixture();
  const text = textOnly(html);

  assert.doesNotMatch(converted, /\blistingblock\b/);
  assert.doesNotMatch(
    converted,
    /\[(?:snippet|dependency),payload=|docs-snippet-callout-validation/,
  );
  assert.match(converted, /docs-code-snippet-template/);

  assert.doesNotMatch(html, /\blistingblock\b/);
  assert.doesNotMatch(
    html,
    /\[(?:snippet|dependency),payload=|docs-snippet-callout-validation/,
  );
  assert.equal(count(html, /docs-code-snippet-template/g), 17);
  assert.equal(count(html, /docs-dependency-template/g), 1);
  assert.equal(count(html, /docs-properties-template/g), 2);
  assert.equal(count(html, /docs-snippet-template docs-code-block/g), 18);
  assert.equal(count(html, /data-copy-active-snippet/g), 18);
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
  assert.match(text, /Listening for Events with ApplicationEventListener/);
  assert.doesNotMatch(
    snippetCardHtmlContaining(html, "EventListenerFixture"),
    /EventListenerFixtureSpec/,
  );
  assert.match(
    snippetCardHtmlContaining(html, "EventListenerFixtureSpec"),
    /EventListenerFixtureSpec/,
  );
  assert.match(text, /HTTP Client dependency/);
  assert.match(text, /Rendered from dependency macro/);
  assert.match(text, /io\.micronaut:micronaut-http-client/);
  assert.match(text, /Application configuration/);
  assert.match(text, /micronaut\.server\.port=8080/);
  assert.match(text, /Configuration Properties/);
  assert.match(text, /3 properties/);
});

test("snippet, dependency, and configuration block processors render React snippet components", async (): Promise<any> => {
  const context = {
    attributes: {
      projectGroup: "io.micronaut",
    },
  };
  const converted = await renderAsciiDoc({
    asciidoctor,
    source: [
      "[snippet,target=controller,title=Controller Block]",
      "--",
      "--",
      "",
      "[dependency,target=micronaut-http-client,groupId=io.micronaut,title=HTTP Client Block]",
      "--",
      "--",
      "",
      "[configuration,title=Configuration Block]",
      "----",
      "micronaut:",
      "  application:",
      "    name: demo",
      "----",
    ].join("\n"),
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
  const text = textOnly(converted);

  assert.match(converted, /docs-code-snippet-template/);
  assert.match(converted, /docs-dependency-template/);
  assert.doesNotMatch(converted, /snippet::|dependency:/);
  assert.match(text, /Controller Block/);
  assert.match(text, /HTTP Client Block/);
  assert.match(text, /Configuration Block/);
  assert.match(text, /io\.micronaut:micronaut-http-client/);
  assert.match(text, /micronaut\.application\.name=demo/);
});

test("snippet block processor absorbs following callout lines from the document reader", async (): Promise<any> => {
  const converted = await renderAsciiDoc({
    asciidoctor,
    source: [
      snippetBlock("code", {
        samples: [
          {
            language: "java",
            source: [
              "class Example {",
              "    void one() {} // <2>",
              "    void two() {} // <4>",
              "}",
            ].join("\n"),
          },
        ],
      }),
      "<2> First source callout.",
      "<4> Second source callout.",
      "<5> Manual callout.",
    ].join("\n"),
    convertOptions: {
      attributes: {
        icons: "font",
        idprefix: "",
        idseparator: "-",
      },
      base_dir: fixtureDirectory,
    },
  });
  const text = textOnly(converted);

  assert.match(converted, /docs-code-callouts/);
  assert.match(converted, /data-value="1"/);
  assert.match(converted, /data-value="2"/);
  assert.doesNotMatch(converted, /data-value="4"/);
  assert.match(converted, /asciidoc-manual-callouts/);
  assert.match(text, /First source callout/);
  assert.match(text, /Second source callout/);
  assert.match(text, /Manual callout/);
});

test("guide macro block processors render snippet gallery macros", async (): Promise<any> => {
  const context = guideMacroFixtureContext();
  const source = await fs.readFile(
    path.join(fixtureDirectory, "snippet-gallery.adoc"),
    "utf8",
  );
  const converted = await renderAsciiDoc({
    asciidoctor,
    source,
    convertOptions: {
      attributes: {
        "guide-macro-gallery": "",
        icons: "font",
        idprefix: "",
        idseparator: "-",
      },
      base_dir: context.guide.directory,
      extension_registry: guideExtensionRegistry(asciidoctor, context),
    },
  });
  const text = textOnly(converted);

  assert.match(converted, /docs-code-snippet-template/);
  assert.match(converted, /docs-dependency-template/);
  assert.match(converted, /docs-code-callouts/);
  assert.match(converted, /href="gallery-linked\.html"/);
  assert.match(converted, /https:\/\/micronaut\.io\/launch\?/);
  assert.match(text, /Common guide snippet content/);
  assert.match(text, /Common template value: COMMON/);
  assert.match(text, /External guide include content/);
  assert.match(text, /External template value: external/);
  assert.match(text, /Rocker template include content/);
  assert.match(text, /GalleryController/);
  assert.match(text, /Source callout loaded from a guide callout macro/);
  assert.match(text, /GalleryControllerTest/);
  assert.match(text, /GalleryRawTest/);
  assert.match(text, /name: guide-gallery/);
  assert.match(text, /enabled: true/);
  assert.match(text, /io\.micronaut\.serde:micronaut-serde-jackson/);
  assert.match(text, /Single dependency callout/);
  assert.match(text, /io\.micronaut:micronaut-http-client/);
  assert.match(text, /io\.micronaut\.validation:micronaut-validation/);
  assert.match(text, /Grouped HTTP client dependency/);
  assert.match(text, /Grouped validation dependency/);
  assert.match(text, /Visible after exclude directives/);
  assert.doesNotMatch(text, /Java excluded text should not render/);
  assert.doesNotMatch(text, /Gradle excluded text should not render/);
  assert.doesNotMatch(text, /JDK excluded text should not render/);
  assert.doesNotMatch(
    converted,
    /source:|test:|rawTest:|resource:|testResource:|zipInclude:|common-template:|external-template:|rocker:|diffLink:|callout:/,
  );
});

async function renderSnippetGalleryFixture(): Promise<{
  converted: string;
  html: string;
}> {
  const context = {
    attributes: {
      projectGroup: "io.micronaut",
    },
  };
  const source = await fs.readFile(
    path.join(fixtureDirectory, "snippet-gallery.adoc"),
    "utf8",
  );
  const expandedSource = expandDependencyMacrosToBlocks(
    expandSnippetMacrosToBlocks(
      normalizeAsciiDocSource(source),
      context,
      fixtureSnippetSamples,
    ),
    context,
  );
  const converted = await renderAsciiDoc({
    asciidoctor,
    source: expandedSource,
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

  return {
    converted,
    html: converted,
  };
}

function guideMacroFixtureContext(): GuideRenderContext {
  const guidesDirectory = path.join(fixtureDirectory, "guide-macros");
  const guideDirectory = path.join(
    guidesDirectory,
    "guides",
    "snippet-gallery",
  );
  return {
    guide: {
      apps: [
        {
          applicationType: "DEFAULT",
          features: ["http-client"],
          name: "default",
        },
      ],
      asciidoc: "snippet-gallery.adoc",
      authors: ["Micronaut"],
      base: "",
      buildTools: ["gradle"],
      categories: ["Test"],
      cloud: "",
      directory: guideDirectory,
      intro: "Snippet gallery guide macro fixture.",
      languages: ["java"],
      minimumJavaVersion: "21",
      publicationDate: "2026-01-01",
      publish: true,
      slug: "snippet-gallery",
      tags: ["test"],
      testFramework: "junit",
      title: "Snippet Gallery",
    },
    guidesDirectory,
    option: {
      buildTool: "gradle",
      buildToolLabel: "Gradle",
      file: "snippet-gallery-gradle-java.html",
      id: "snippet-gallery-gradle-java",
      label: "Java / Gradle",
      language: "java",
      languageLabel: "Java",
      sourceDir: "snippet-gallery-gradle-java",
      testFramework: "junit",
      zipUrl: "snippet-gallery-gradle-java.zip",
    },
    version: "4.9.0",
  };
}

function fixtureSnippetSamples(target: any): any {
  switch (String(target).trim()) {
    case "controller":
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
    case "event-listener":
      return [
        {
          language: "java",
          source: [
            "import io.micronaut.context.event.ApplicationEventListener;",
            "",
            "class EventListenerFixture implements ApplicationEventListener<SampleEvent> {",
            "    @Override",
            "    public void onApplicationEvent(SampleEvent event) {",
            "    }",
            "}",
          ].join("\n"),
        },
      ];
    case "event-listener-spec":
      return [
        {
          language: "java",
          source: [
            "import io.micronaut.context.ApplicationContext;",
            "import org.junit.jupiter.api.Test;",
            "",
            "class EventListenerFixtureSpec {",
            "    @Test",
            "    void receivesEvents() {",
            "    }",
            "}",
          ].join("\n"),
        },
      ];
    default:
      return [];
  }
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

function snippetCardHtmlContaining(value: string, marker: string): string {
  const markerIndex = value.indexOf(marker);
  assert.notEqual(markerIndex, -1, `${marker} should appear in snippet HTML`);
  const cardStart = value.lastIndexOf(
    "docs-code-snippet-template",
    markerIndex,
  );
  assert.notEqual(cardStart, -1, `${marker} should appear inside a code card`);
  const nextCard = value.indexOf(
    "docs-code-snippet-template",
    markerIndex + marker.length,
  );
  return value.slice(cardStart, nextCard < 0 ? undefined : nextCard);
}
