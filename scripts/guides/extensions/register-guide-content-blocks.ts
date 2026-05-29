import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  Block,
  BlockMacroProcessor,
  MacroProcessorDslInterface,
  Registry,
  Section,
} from "@asciidoctor/core";
import { appFeatures, type Guide, type GuideRenderContext } from "../model.ts";
import { registerGuideContentBlock } from "./register-guide-content-block.ts";
import { prepareGuideSourceForExtensions } from "./register-guide-preprocessor.ts";

const GUIDE_COMMON_BLOCK = "guide-common";
const GUIDE_COMMON_TEMPLATE_BLOCK = "guide-common-template";
const GUIDE_DIFF_LINK_BLOCK = "guide-diff-link";
const GUIDE_EXTERNAL_BLOCK = "guide-external";
const GUIDE_EXTERNAL_TEMPLATE_BLOCK = "guide-external-template";
const GUIDE_ROCKER_BLOCK = "guide-rocker";

type GuideMacroPayload = {
  attributes: Record<string, string>;
  target: string;
};

type GuideContentResolver = (payload: GuideMacroPayload) => Promise<string[]>;

export function registerGuideContentBlocks(
  registry: Registry,
  context: GuideRenderContext,
): void {
  registerGuideContent(registry, "common", GUIDE_COMMON_BLOCK, (payload) =>
    payload.target.trim() === "header-top.adoc"
      ? Promise.resolve([])
      : includeGuideAdoc(
          commonSnippetPath(context.guidesDirectory, payload.target),
          context,
        ),
  );
  registerGuideContent(
    registry,
    "common-template",
    GUIDE_COMMON_TEMPLATE_BLOCK,
    (payload) =>
      includeGuideTemplate(
        commonSnippetPath(context.guidesDirectory, payload.target),
        payload.attributes,
        context,
      ),
  );
  registerGuideContent(registry, "external", GUIDE_EXTERNAL_BLOCK, (payload) =>
    includeGuideAdoc(
      externalPath(context.guidesDirectory, payload.target),
      context,
    ),
  );
  registerGuideContent(
    registry,
    "external-template",
    GUIDE_EXTERNAL_TEMPLATE_BLOCK,
    (payload) =>
      includeGuideTemplate(
        externalPath(context.guidesDirectory, payload.target),
        payload.attributes,
        context,
      ),
  );
  registerGuideContent(registry, "rocker", GUIDE_ROCKER_BLOCK, (payload) =>
    includeGuideRocker(payload.target, context),
  );
  registerGuideContent(registry, "diffLink", GUIDE_DIFF_LINK_BLOCK, (payload) =>
    Promise.resolve([diffLink(payload.target, payload.attributes, context)]),
  );
  registerGuideContentMacro(registry, "callout", (payload) =>
    includeGuideCallout(payload.target, payload.attributes, context),
  );
}

function registerGuideContent(
  registry: Registry,
  macroName: string,
  blockName: string,
  resolveLines: GuideContentResolver,
): void {
  registerGuideContentBlock(registry, blockName, resolveLines);
  registerGuideContentMacro(registry, macroName, resolveLines);
}

function registerGuideContentMacro(
  registry: Registry,
  macroName: string,
  resolveLines: GuideContentResolver,
): void {
  registry.blockMacro(
    macroName,
    function registerGuideContentMacro(this: MacroProcessorDslInterface): void {
      this.process(async function processGuideContentMacro(
        this: BlockMacroProcessor,
        parent: unknown,
        target: unknown,
        attrs: unknown,
      ): Promise<Block> {
        const holder = this.createBlock(
          parent as Block | Section,
          "open",
          "",
          {},
        );
        const lines = await resolveLines(
          guideMacroPayload(String(target), attrs),
        );
        await this.parseContent(
          guideContentParseTarget(parent, holder, lines),
          lines,
        );
        return holder;
      });
    },
  );
}

function guideContentParseTarget(
  parent: unknown,
  holder: Block,
  lines: string[],
): Block | Section {
  return lines.some((line) => /^={1,6}\s+\S/.test(line))
    ? (parent as Block | Section)
    : holder;
}

export async function includeGuideAdoc(
  file: string,
  context: GuideRenderContext,
  includeStack: Set<string> = new Set(),
): Promise<string[]> {
  const normalized = path.resolve(file);
  if (includeStack.has(normalized)) {
    return [];
  }
  try {
    const source = await fs.readFile(normalized, "utf8");
    includeStack.add(normalized);
    try {
      return prepareIncludedGuideSource(source, context).split(/\r?\n/);
    } finally {
      includeStack.delete(normalized);
    }
  } catch {
    return [`NOTE: Missing include \`${path.basename(file)}\`.`];
  }
}

async function includeGuideTemplate(
  file: string,
  attributes: Record<string, string>,
  context: GuideRenderContext,
  includeStack: Set<string> = new Set(),
): Promise<string[]> {
  const normalized = path.resolve(file);
  if (includeStack.has(normalized)) {
    return [];
  }
  try {
    const source = await fs.readFile(normalized, "utf8");
    includeStack.add(normalized);
    try {
      const replaced = source
        .split(/\r?\n/)
        .map((line) => replaceGuideTemplateArguments(line, attributes))
        .join("\n");
      return prepareIncludedGuideSource(replaced, context).split(/\r?\n/);
    } finally {
      includeStack.delete(normalized);
    }
  } catch {
    return [`NOTE: Missing include \`${path.basename(file)}\`.`];
  }
}

async function includeGuideCallout(
  target: string,
  attributes: Record<string, string>,
  context: GuideRenderContext,
): Promise<string[]> {
  const lines = await includeGuideAdoc(
    path.join(
      context.guidesDirectory,
      "src",
      "docs",
      "common",
      "callouts",
      `callout-${ensureSuffix(target.trim(), ".adoc")}`,
    ),
    context,
  );
  const explicitNumber = calloutNumber(attributes);
  return lines.map((line) => {
    const replaced = replaceGuideTemplateArguments(line, attributes);
    return explicitNumber
      ? replaced.replace(/^<\.>/, `<${explicitNumber}>`)
      : replaced;
  });
}

async function includeGuideRocker(
  target: string,
  context: GuideRenderContext,
): Promise<string[]> {
  const file = path.join(
    context.guidesDirectory,
    "buildSrc",
    "src",
    "main",
    "java",
    "io",
    "micronaut",
    "guides",
    "feature",
    "template",
    `${target.trim()}.rocker.raw`,
  );
  try {
    return (await fs.readFile(file, "utf8")).split(/\r?\n/);
  } catch {
    return [`NOTE: Missing rocker template \`${target.trim()}\`.`];
  }
}

export function replaceGuideTemplateArguments(
  line: string,
  attributes: Record<string, string>,
): string {
  return line.replace(/\{(\d+)(?:_([UL]))?}/g, (match, index, transform) => {
    const value = attributes[`arg${index}`];
    if (value === undefined) {
      return match;
    }
    if (transform === "U") {
      return value.toUpperCase();
    }
    if (transform === "L") {
      return value.toLowerCase();
    }
    return value;
  });
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

function calloutNumber(attributes: Record<string, string>): string {
  const number =
    attributes.number ||
    attributes.callout ||
    attributes[2] ||
    attributes[1] ||
    "";
  return /^\d+$/.test(number) ? number : "";
}

function prepareIncludedGuideSource(
  source: string,
  context: GuideRenderContext,
): string {
  return prepareGuideSourceForExtensions(source, context, {
    appendLicense: false,
  });
}

function commonSnippetPath(guidesDirectory: string, target: string): string {
  return path.join(
    guidesDirectory,
    "src",
    "docs",
    "common",
    "snippets",
    `common-${ensureSuffix(target.trim(), ".adoc")}`,
  );
}

function externalPath(guidesDirectory: string, target: string): string {
  return path.join(
    guidesDirectory,
    "guides",
    ensureSuffix(target.trim(), ".adoc"),
  );
}

function ensureSuffix(value: string, suffix: string): string {
  return value.endsWith(suffix) ? value : `${value}${suffix}`;
}

function diffLink(
  _target: string,
  attributes: Record<string, string>,
  context: GuideRenderContext,
): string {
  const appName = attributes.app || "default";
  const app = findApp(context.guide, appName);
  const excluded = new Set(
    (attributes.featureExcludes || "").split("|").filter(Boolean),
  );
  const features = (
    attributes.features
      ? attributes.features.split("|")
      : appFeatures(context.guide, context.option, appName)
  ).filter((feature) => feature && !excluded.has(feature));
  const params = new URLSearchParams();
  for (const feature of features) {
    params.append("features", feature);
  }
  params.set("lang", context.option.language.toUpperCase());
  params.set("build", context.option.buildTool.toUpperCase());
  params.set("test", context.option.testFramework.toUpperCase());
  params.set("name", appName === "default" ? "micronautguide" : appName);
  params.set("type", String(app?.applicationType || "DEFAULT").toUpperCase());
  params.set("package", "example.micronaut");
  params.set("activity", "diff");
  return `https://micronaut.io/launch?${params.toString()}[Diff, window="_blank"]`;
}

function findApp(
  guide: Guide,
  appName: string,
): Guide["apps"][number] | undefined {
  return guide.apps.find((app) => app.name === appName) || guide.apps[0];
}
