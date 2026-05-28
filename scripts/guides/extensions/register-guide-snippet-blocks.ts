import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  Block,
  BlockProcessor,
  BlockProcessorDslInterface,
  Reader,
  Registry,
  Section,
} from "@asciidoctor/core";

import {
  renderSnippetBlockWithCalloutReader,
  type CalloutLineResolver,
} from "../../asciidoc/extensions/snippet-block-renderer.ts";
import { extractTaggedSource } from "../../shared/tagged-source.ts";
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

export function registerGuideSnippetBlocks(
  registry: Registry,
  context: GuideRenderContext,
  resolveCalloutLines: CalloutLineResolver,
): void {
  registerGuideSnippetBlock(
    registry,
    GUIDE_SOURCE_BLOCK,
    (payload) =>
      sourceSnippetPayload(payload.target, payload.attributes, context, "main"),
    resolveCalloutLines,
  );
  registerGuideSnippetBlock(
    registry,
    GUIDE_TEST_BLOCK,
    (payload) =>
      sourceSnippetPayload(payload.target, payload.attributes, context, "test"),
    resolveCalloutLines,
  );
  registerGuideSnippetBlock(
    registry,
    GUIDE_RAW_TEST_BLOCK,
    (payload) =>
      sourceSnippetPayload(
        payload.target,
        payload.attributes,
        context,
        "raw-test",
      ),
    resolveCalloutLines,
  );
  registerGuideSnippetBlock(
    registry,
    GUIDE_RESOURCE_BLOCK,
    (payload) =>
      resourceSnippetPayload(
        payload.target,
        payload.attributes,
        context,
        "main",
      ),
    resolveCalloutLines,
  );
  registerGuideSnippetBlock(
    registry,
    GUIDE_TEST_RESOURCE_BLOCK,
    (payload) =>
      resourceSnippetPayload(
        payload.target,
        payload.attributes,
        context,
        "test",
      ),
    resolveCalloutLines,
  );
  registerGuideSnippetBlock(
    registry,
    GUIDE_ZIP_INCLUDE_BLOCK,
    (payload) =>
      zipIncludeSnippetPayload(payload.target, payload.attributes, context),
    resolveCalloutLines,
  );
}

function registerGuideSnippetBlock(
  registry: Registry,
  blockName: string,
  resolvePayload: GuideSnippetPayloadResolver,
  resolveCalloutLines: CalloutLineResolver,
): void {
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
        { collectManualCallouts: true, resolveCalloutLines },
      );
    });
  });
}

function guideMacroPayloadFromValue(value: unknown): GuideMacroPayload {
  return JSON.parse(
    Buffer.from(String(value || ""), "base64url").toString("utf8"),
  ) as GuideMacroPayload;
}

async function sourceSnippetPayload(
  target: any,
  attributes: any,
  context: GuideRenderContext,
  kind: any,
): Promise<any> {
  const file = await findSourceFile(target.trim(), attributes, context, kind);
  if (!file) {
    return missingNotePayload(`Missing source \`${target.trim()}\`.`);
  }

  let source = await fs.readFile(file, "utf8");
  source = extractTaggedSource(source, tagSelection(attributes));
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
  target: any,
  attributes: any,
  context: GuideRenderContext,
  sourceSet: any,
): Promise<any> {
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
  source = extractTaggedSource(source, tagSelection(attributes));
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
  target: any,
  attributes: any,
  context: GuideRenderContext,
): Promise<any> {
  const file = await findFileInSourceRoots(target.trim(), attributes, context);
  if (!file) {
    return missingNotePayload(`Missing zip include \`${target.trim()}\`.`);
  }
  let source = await fs.readFile(file, "utf8");
  source = extractTaggedSource(source, tagSelection(attributes));
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

function missingNotePayload(message: string): any {
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

async function findSourceFile(
  target: any,
  attributes: any,
  context: any,
  kind: any,
): Promise<any> {
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
      ...guideSourceRoots(context).flatMap((root: any): any => [
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
  target: any,
  attributes: any,
  context: any,
  sourceSet: any,
): Promise<any> {
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
      ...guideSourceRoots(context).flatMap((root: any): any => [
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
  target: any,
  attributes: any,
  context: any,
): Promise<any> {
  const app = attributes.app || "";
  return findExisting(
    context,
    [
      path.join(context.guide.directory, app, target),
      path.join(context.guide.directory, target),
      ...guideSourceRoots(context).flatMap((root: any): any => [
        path.join(root, app, target),
        path.join(root, target),
      ]),
    ],
    path.basename(target),
  );
}

async function findExisting(
  context: any,
  candidates: any,
  fallbackName: any,
  requiredSegment: any = "",
): Promise<any> {
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
  root: any,
  name: any,
  requiredSegment: any = "",
): Promise<any> {
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

function guideSourceRoots(context: any): any {
  if (!context.guide.base) {
    return [];
  }
  return [path.join(context.guidesDirectory, "guides", context.guide.base)];
}

export function normalizeSourceCalloutMarkers(source: any): any {
  return String(source || "").replace(
    /(^|[ \t])((?:\/\/|#|;)[ \t]*)(\d+)>$/gm,
    "$1$2<$3>",
  );
}

function tagSelection(attributes: any): any {
  return (attributes.tags || attributes.tag || "").replaceAll("|", ",");
}

function rawTestExtension(testFramework: any): any {
  return testFramework === "spock" ? "groovy" : "java";
}

function rawTestSourceDirectory(testFramework: any): any {
  return testFramework === "spock" ? "src/test/groovy" : "src/test/java";
}

function stripLicenseHeader(source: any): any {
  return source.replace(
    /^\/\*[\s\S]*?Licensed under the Apache License[\s\S]*?\*\/\s*/i,
    "",
  );
}

function normalizeIndent(source: any, indentValue: any): any {
  const indent = Number.parseInt(indentValue || "0", 10);
  if (!Number.isFinite(indent) || indent <= 0) {
    return source.trim();
  }
  const prefix = " ".repeat(indent);
  return source
    .trim()
    .split(/\r?\n/)
    .map((line: any): any => `${prefix}${line}`)
    .join("\n");
}

function languageForFile(file: any, fallback: any = "text"): any {
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
