import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  Block,
  BlockMacroProcessor,
  BlockProcessor,
  BlockProcessorDslInterface,
  MacroProcessorDslInterface,
  Reader,
  Registry,
  Section,
} from "@asciidoctor/core";

import {
  renderSnippetBlock,
  renderSnippetBlockWithCalloutReader,
} from "../../asciidoc/extensions/snippet-block-renderer.ts";
import {
  extractTaggedSourceWithDiagnostics,
  type TaggedSourceDiagnostic,
} from "../../shared/tagged-source.ts";
import {
  languageExtension,
  languageSourceDirectory,
  type GuideRenderContext,
} from "../model.ts";

const GUIDE_RAW_TEST_BLOCK = "guide-raw-test";
const GUIDE_RESOURCE_BLOCK = "guide-resource";
const GUIDE_SOURCE_BLOCK = "guide-source";
const GUIDE_TEST_BLOCK = "guide-test";
const GUIDE_TEST_RESOURCE_BLOCK = "guide-test-resource";
const GUIDE_ZIP_INCLUDE_BLOCK = "guide-zip-include";

type GuideMacroPayload = {
  attributes: Record<string, string>;
  target: string;
};

type GuideSnippetPayloadResolver = (
  payload: GuideMacroPayload,
) => Promise<Record<string, unknown>>;

type GuideSnippetPayload = {
  kind: "code";
  title: string;
  samples: Array<{
    language: string;
    source: string;
  }>;
};

type SourceSnippetKind = "main" | "test" | "raw-test";
type ResourceSourceSet = "main" | "test";

export function registerGuideSnippetBlocks(
  registry: Registry,
  context: GuideRenderContext,
): void {
  registerGuideSnippetBlock(registry, "source", GUIDE_SOURCE_BLOCK, (payload) =>
    sourceSnippetPayload(payload.target, payload.attributes, context, "main"),
  );
  registerGuideSnippetBlock(registry, "test", GUIDE_TEST_BLOCK, (payload) =>
    sourceSnippetPayload(payload.target, payload.attributes, context, "test"),
  );
  registerGuideSnippetBlock(
    registry,
    "rawTest",
    GUIDE_RAW_TEST_BLOCK,
    (payload) =>
      sourceSnippetPayload(
        payload.target,
        payload.attributes,
        context,
        "raw-test",
      ),
  );
  registerGuideSnippetBlock(
    registry,
    "resource",
    GUIDE_RESOURCE_BLOCK,
    (payload) =>
      resourceSnippetPayload(
        payload.target,
        payload.attributes,
        context,
        "main",
      ),
  );
  registerGuideSnippetBlock(
    registry,
    "testResource",
    GUIDE_TEST_RESOURCE_BLOCK,
    (payload) =>
      resourceSnippetPayload(
        payload.target,
        payload.attributes,
        context,
        "test",
      ),
  );
  registerGuideSnippetBlock(
    registry,
    "zipInclude",
    GUIDE_ZIP_INCLUDE_BLOCK,
    (payload) =>
      zipIncludeSnippetPayload(payload.target, payload.attributes, context),
  );
}

function registerGuideSnippetBlock(
  registry: Registry,
  macroName: string,
  blockName: string,
  resolvePayload: GuideSnippetPayloadResolver,
): void {
  registry.blockMacro(
    macroName,
    function registerGuideSnippetMacro(this: MacroProcessorDslInterface): void {
      this.process(async function processGuideSnippetMacro(
        this: BlockMacroProcessor,
        parent: unknown,
        target: unknown,
        attrs: unknown,
      ): Promise<Block> {
        return renderSnippetBlock(
          this,
          parent as Block | Section,
          await resolvePayload(guideMacroPayload(String(target), attrs)),
          undefined,
          { collectManualCallouts: true },
        );
      });
    },
  );

  registry.block(function registerGuideSnippetBlock(
    this: BlockProcessorDslInterface,
  ): void {
    this.named(blockName);
    this.onContext("open");
    this.process(async function processGuideSnippetBlock(
      this: BlockProcessor,
      parent: unknown,
      reader: unknown,
      attrs: unknown,
    ): Promise<Block> {
      const attributes = attrs as Record<string, unknown>;
      return renderSnippetBlockWithCalloutReader(
        this,
        parent as Block | Section,
        await resolvePayload(guideMacroPayloadFromValue(attributes.payload)),
        reader as Reader,
        { collectManualCallouts: true },
      );
    });
  });
}

function guideMacroPayloadFromValue(value: unknown): GuideMacroPayload {
  return JSON.parse(
    Buffer.from(String(value || ""), "base64url").toString("utf8"),
  ) as GuideMacroPayload;
}

function guideMacroPayload(target: string, attrs: unknown): GuideMacroPayload {
  return {
    attributes: guideMacroAttributes(attrs),
    target,
  };
}

function guideMacroAttributes(attrs: unknown): Record<string, string> {
  return Object.fromEntries(
    Object.entries((attrs || {}) as Record<string, unknown>).map(
      ([key, value]) => [key, String(value)],
    ),
  );
}

async function sourceSnippetPayload(
  target: string,
  attributes: Record<string, string>,
  context: GuideRenderContext,
  kind: SourceSnippetKind,
): Promise<GuideSnippetPayload> {
  const file = await findSourceFile(target.trim(), attributes, context, kind);
  if (!file) {
    return missingNotePayload(`Missing source \`${target.trim()}\`.`);
  }

  let source = await fs.readFile(file, "utf8");
  const taggedSource = extractTaggedSourceWithDiagnostics(
    source,
    tagSelection(attributes),
  );
  if (taggedSource.diagnostics.length) {
    return missingNotePayload(
      taggedSourceDiagnosticMessage(
        taggedSource.diagnostics,
        relativeGuideFile(context, file),
      ),
    );
  }
  source = taggedSource.source;
  source = normalizeSourceCalloutMarkers(source);
  if (!attributes.tags && !attributes.tag) {
    source = stripLicenseHeader(source);
  }
  source = normalizeIndent(source, attributes.indent);
  const title = path
    .relative(context.guide.directory, file)
    .replaceAll(path.sep, "/");
  return {
    kind: "code",
    title,
    samples: [
      {
        language: languageForFile(file, context.option.language),
        source,
      },
    ],
  };
}

async function resourceSnippetPayload(
  target: string,
  attributes: Record<string, string>,
  context: GuideRenderContext,
  sourceSet: ResourceSourceSet,
): Promise<GuideSnippetPayload> {
  const file = await findResourceFile(
    target.trim(),
    attributes,
    context,
    sourceSet,
  );
  if (!file) {
    return missingNotePayload(`Missing resource \`${target.trim()}\`.`);
  }

  let source = await fs.readFile(file, "utf8");
  const taggedSource = extractTaggedSourceWithDiagnostics(
    source,
    tagSelection(attributes),
  );
  if (taggedSource.diagnostics.length) {
    return missingNotePayload(
      taggedSourceDiagnosticMessage(
        taggedSource.diagnostics,
        relativeGuideFile(context, file),
      ),
    );
  }
  source = taggedSource.source;
  source = normalizeSourceCalloutMarkers(source);
  source = normalizeIndent(source, attributes.indent);
  const title = path
    .relative(context.guide.directory, file)
    .replaceAll(path.sep, "/");
  return {
    kind: "code",
    title,
    samples: [
      {
        language: languageForFile(file),
        source,
      },
    ],
  };
}

async function zipIncludeSnippetPayload(
  target: string,
  attributes: Record<string, string>,
  context: GuideRenderContext,
): Promise<GuideSnippetPayload> {
  const file = await findFileInSourceRoots(target.trim(), attributes, context);
  if (!file) {
    return missingNotePayload(`Missing zip include \`${target.trim()}\`.`);
  }
  let source = await fs.readFile(file, "utf8");
  const taggedSource = extractTaggedSourceWithDiagnostics(
    source,
    tagSelection(attributes),
  );
  if (taggedSource.diagnostics.length) {
    return missingNotePayload(
      taggedSourceDiagnosticMessage(
        taggedSource.diagnostics,
        relativeGuideFile(context, file),
      ),
    );
  }
  source = taggedSource.source;
  source = normalizeSourceCalloutMarkers(source);
  source = normalizeIndent(source, attributes.indent);
  return {
    kind: "code",
    title: target.trim(),
    samples: [
      {
        language: languageForFile(file),
        source,
      },
    ],
  };
}

function missingNotePayload(message: string): GuideSnippetPayload {
  return {
    kind: "code",
    samples: [
      {
        language: "text",
        source: `NOTE: ${message}`,
      },
    ],
    title: "",
  };
}

function taggedSourceDiagnosticMessage(
  diagnostics: TaggedSourceDiagnostic[],
  file: string,
): string {
  const missingTags = diagnostics
    .filter((diagnostic) => diagnostic.reason === "missing-tag")
    .map((diagnostic) => diagnostic.tag);
  const emptyTags = diagnostics
    .filter((diagnostic) => diagnostic.reason === "empty-tag")
    .map((diagnostic) => diagnostic.tag);
  return [
    missingTags.length
      ? `Missing ${tagNoun(missingTags)} ${formatTags(missingTags)}`
      : "",
    emptyTags.length
      ? `Empty ${tagNoun(emptyTags)} ${formatTags(emptyTags)}`
      : "",
  ]
    .filter(Boolean)
    .join("; ")
    .concat(` in \`${file}\`.`);
}

function tagNoun(tags: string[]): string {
  return tags.length === 1 ? "tag" : "tags";
}

function formatTags(tags: string[]): string {
  return tags.map((tag) => `\`${tag}\``).join(", ");
}

function relativeGuideFile(context: GuideRenderContext, file: string): string {
  return path.relative(context.guide.directory, file).replaceAll(path.sep, "/");
}

async function findSourceFile(
  target: string,
  attributes: Record<string, string>,
  context: GuideRenderContext,
  kind: SourceSnippetKind,
): Promise<string | undefined> {
  const app = attributes.app || "";
  const sourceSet = kind === "main" ? "main" : "test";
  const extension =
    kind === "raw-test"
      ? rawTestExtension(context.option.testFramework)
      : languageExtension(context.option.language);
  const sourceDirectory =
    kind === "raw-test"
      ? rawTestSourceDirectory(context.option.testFramework)
      : languageSourceDirectory(context.option.language, sourceSet);
  const className =
    kind === "test" && target.endsWith("Test")
      ? `${target.slice(0, -"Test".length)}${context.option.testFramework === "spock" ? "Spec" : "Test"}`
      : target;
  const sourcePath = path.join(
    sourceDirectory,
    "example",
    "micronaut",
    `${className}.${extension}`,
  );
  const relativePath = path.join(app, sourcePath);
  return findExisting(
    context,
    [
      path.join(context.guide.directory, relativePath),
      path.join(
        context.guide.directory,
        app,
        context.option.language,
        sourcePath,
      ),
      path.join(context.guide.directory, context.option.language, sourcePath),
      ...guideSourceRoots(context).flatMap((root) => [
        path.join(root, relativePath),
        path.join(root, app, context.option.language, sourcePath),
        path.join(root, context.option.language, sourcePath),
      ]),
    ],
    path.basename(`${className}.${extension}`),
    sourceSet,
  );
}

async function findResourceFile(
  target: string,
  attributes: Record<string, string>,
  context: GuideRenderContext,
  sourceSet: ResourceSourceSet,
): Promise<string | undefined> {
  const app = attributes.app || "";
  const resourcePathWithoutApp = target.startsWith("../")
    ? path.join(`src/${sourceSet}`, target.slice("../".length))
    : path.join(`src/${sourceSet}`, "resources", target);
  const resourcePath = target.startsWith("../")
    ? path.join(app, `src/${sourceSet}`, target.slice("../".length))
    : path.join(app, `src/${sourceSet}`, "resources", target);
  return findExisting(
    context,
    [
      path.join(context.guide.directory, resourcePath),
      path.join(
        context.guide.directory,
        app,
        context.option.language,
        resourcePathWithoutApp,
      ),
      path.join(
        context.guide.directory,
        context.option.language,
        resourcePathWithoutApp,
      ),
      ...guideSourceRoots(context).flatMap((root) => [
        path.join(root, resourcePath),
        path.join(root, app, context.option.language, resourcePathWithoutApp),
        path.join(root, context.option.language, resourcePathWithoutApp),
      ]),
    ],
    path.basename(target),
    `src/${sourceSet}/resources`,
  );
}

async function findFileInSourceRoots(
  target: string,
  attributes: Record<string, string>,
  context: GuideRenderContext,
): Promise<string | undefined> {
  const app = attributes.app || "";
  return findExisting(
    context,
    [
      path.join(context.guide.directory, app, target),
      path.join(context.guide.directory, target),
      ...guideSourceRoots(context).flatMap((root) => [
        path.join(root, app, target),
        path.join(root, target),
      ]),
    ],
    path.basename(target),
  );
}

async function findExisting(
  context: GuideRenderContext,
  candidates: string[],
  fallbackName: string,
  requiredSegment = "",
): Promise<string | undefined> {
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) {
        return candidate;
      }
    } catch {
      // Try walking below.
    }
  }

  for (const root of [context.guide.directory, ...guideSourceRoots(context)]) {
    const found = await findByName(root, fallbackName, requiredSegment);
    if (found) {
      return found;
    }
  }
  return undefined;
}

async function findByName(
  root: string,
  name: string,
  requiredSegment = "",
): Promise<string | undefined> {
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return undefined;
  }
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      const found = await findByName(fullPath, name, requiredSegment);
      if (found) {
        return found;
      }
    } else if (entry.isFile() && entry.name === name) {
      const normalized = fullPath.replaceAll(path.sep, "/");
      if (!requiredSegment || normalized.includes(requiredSegment)) {
        return fullPath;
      }
    }
  }
  return undefined;
}

function guideSourceRoots(context: GuideRenderContext): string[] {
  if (!context.guide.base) {
    return [];
  }
  return [path.join(context.guidesDirectory, "guides", context.guide.base)];
}

export function normalizeSourceCalloutMarkers(source: unknown): string {
  return String(source || "").replace(
    /(^|[ \t])((?:\/\/|#|;)[ \t]*)(\d+)>$/gm,
    "$1$2<$3>",
  );
}

function tagSelection(attributes: Record<string, string>): string {
  return (attributes.tags || attributes.tag || "").replaceAll("|", ",");
}

function rawTestExtension(testFramework: string): string {
  return testFramework === "spock" ? "groovy" : "java";
}

function rawTestSourceDirectory(testFramework: string): string {
  return testFramework === "spock" ? "src/test/groovy" : "src/test/java";
}

function stripLicenseHeader(source: string): string {
  return source.replace(
    /^\/\*[\s\S]*?Licensed under the Apache License[\s\S]*?\*\/\s*/i,
    "",
  );
}

function normalizeIndent(
  source: string,
  indentValue: string | undefined,
): string {
  const indent = Number.parseInt(indentValue || "0", 10);
  if (!Number.isFinite(indent) || indent <= 0) {
    return source.trim();
  }
  const prefix = " ".repeat(indent);
  return source
    .trim()
    .split(/\r?\n/)
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function languageForFile(file: string, fallback = "text"): string {
  const extension = path.extname(file).toLowerCase().slice(1);
  return (
    {
      gradle: "groovy",
      hbs: "html",
      java: "java",
      json: "json",
      kt: "kotlin",
      groovy: "groovy",
      properties: "properties",
      toml: "toml",
      vm: "html",
      xml: "xml",
      yaml: "yaml",
      yml: "yaml",
    }[extension] ||
    extension ||
    fallback
  );
}
