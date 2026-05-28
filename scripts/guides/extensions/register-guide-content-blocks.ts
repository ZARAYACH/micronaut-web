import { promises as fs } from "node:fs";
import path from "node:path";

import type { Registry } from "@asciidoctor/core";
import { appFeatures, type GuideRenderContext } from "../model.ts";
import { registerGuideContentBlock } from "./register-guide-content-block.ts";
import { prepareGuideSourceForExtensions } from "./register-guide-preprocessor.ts";

const GUIDE_COMMON_BLOCK = "guide-common";
const GUIDE_COMMON_TEMPLATE_BLOCK = "guide-common-template";
const GUIDE_DIFF_LINK_BLOCK = "guide-diff-link";
const GUIDE_EXTERNAL_BLOCK = "guide-external";
const GUIDE_EXTERNAL_TEMPLATE_BLOCK = "guide-external-template";
const GUIDE_ROCKER_BLOCK = "guide-rocker";

export function registerGuideContentBlocks(
  registry: Registry,
  context: GuideRenderContext,
): void {
  registerGuideContentBlock(registry, GUIDE_COMMON_BLOCK, (payload) =>
    payload.target.trim() === "header-top.adoc"
      ? Promise.resolve([])
      : includeGuideAdoc(
          commonSnippetPath(context.guidesDirectory, payload.target),
          context,
        ),
  );
  registerGuideContentBlock(registry, GUIDE_COMMON_TEMPLATE_BLOCK, (payload) =>
    includeGuideTemplate(
      commonSnippetPath(context.guidesDirectory, payload.target),
      payload.attributes,
      context,
    ),
  );
  registerGuideContentBlock(registry, GUIDE_EXTERNAL_BLOCK, (payload) =>
    includeGuideAdoc(
      externalPath(context.guidesDirectory, payload.target),
      context,
    ),
  );
  registerGuideContentBlock(
    registry,
    GUIDE_EXTERNAL_TEMPLATE_BLOCK,
    (payload) =>
      includeGuideTemplate(
        externalPath(context.guidesDirectory, payload.target),
        payload.attributes,
        context,
      ),
  );
  registerGuideContentBlock(registry, GUIDE_ROCKER_BLOCK, (payload) =>
    includeGuideRocker(payload.target, context),
  );
  registerGuideContentBlock(registry, GUIDE_DIFF_LINK_BLOCK, (payload) =>
    Promise.resolve([diffLink(payload.target, payload.attributes, context)]),
  );
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

function prepareIncludedGuideSource(
  source: string,
  context: GuideRenderContext,
): string {
  return prepareGuideSourceForExtensions(source, context, {
    appendLicense: false,
  });
}

function commonSnippetPath(guidesDirectory: any, target: any): any {
  return path.join(
    guidesDirectory,
    "src",
    "docs",
    "common",
    "snippets",
    `common-${ensureSuffix(target.trim(), ".adoc")}`,
  );
}

function externalPath(guidesDirectory: any, target: any): any {
  return path.join(
    guidesDirectory,
    "guides",
    ensureSuffix(target.trim(), ".adoc"),
  );
}

function ensureSuffix(value: any, suffix: any): any {
  return value.endsWith(suffix) ? value : `${value}${suffix}`;
}

function diffLink(_target: any, attributes: any, context: any): any {
  const appName = attributes.app || "default";
  const app = findApp(context.guide, appName);
  const excluded = new Set(
    (attributes.featureExcludes || "").split("|").filter(Boolean),
  );
  const features = (
    attributes.features
      ? attributes.features.split("|")
      : appFeatures(context.guide, context.option, appName)
  ).filter((feature: any): any => feature && !excluded.has(feature));
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

function findApp(guide: any, appName: any): any {
  return (
    guide.apps.find((app: any): any => app.name === appName) || guide.apps[0]
  );
}
