import { existsSync } from "node:fs";
import path from "node:path";

import type {
  DocumentProcessorDslInterface,
  Reader,
  Registry,
} from "@asciidoctor/core";

import {
  appFeatures,
  cliCommandForApp,
  featuresWords,
  languageExtension,
  type GuideRenderContext,
} from "../model.ts";

const GUIDE_CALLOUT_BLOCK = "guide-callout";
const GUIDE_COMMON_BLOCK = "guide-common";
const GUIDE_COMMON_TEMPLATE_BLOCK = "guide-common-template";
const GUIDE_DEPENDENCIES_BLOCK = "guide-dependencies";
const GUIDE_DEPENDENCY_BLOCK = "guide-dependency";
const GUIDE_DIFF_LINK_BLOCK = "guide-diff-link";
const GUIDE_EXTERNAL_BLOCK = "guide-external";
const GUIDE_EXTERNAL_TEMPLATE_BLOCK = "guide-external-template";
const GUIDE_RAW_TEST_BLOCK = "guide-raw-test";
const GUIDE_RESOURCE_BLOCK = "guide-resource";
const GUIDE_ROCKER_BLOCK = "guide-rocker";
const GUIDE_SOURCE_BLOCK = "guide-source";
const GUIDE_TEST_BLOCK = "guide-test";
const GUIDE_TEST_RESOURCE_BLOCK = "guide-test-resource";
const GUIDE_ZIP_INCLUDE_BLOCK = "guide-zip-include";
const MACRO_LINE = /^([A-Za-z][A-Za-z0-9_-]*):([^\[]*)\[(.*)]\s*$/;
const DEFAULT_MIN_JDK = 21;
const LICENSE_INCLUDE = "common:license.adoc[]";

export function registerGuidePreprocessor(
  registry: Registry,
  context: GuideRenderContext,
): void {
  registry.preprocessor(function registerGuidePreprocessor(
    this: DocumentProcessorDslInterface,
  ): void {
    this.process(function processGuidePreprocessor(
      document: unknown,
      reader: unknown,
    ): Reader {
      const sourceReader = reader as Reader;
      return new (reader as any).constructor(
        document,
        prepareGuideSourceForExtensions(
          sourceReader.lines.join("\n"),
          context,
        ).split(/\r?\n/),
        sourceReader.cursor,
        {},
      );
    });
  });
}

export function prepareGuideSourceForExtensions(
  source: string,
  context: GuideRenderContext,
  options: { appendLicense?: boolean } = {},
): string {
  const withLicense =
    options.appendLicense === false
      ? source
      : `${source.replace(/\s+$/, "")}\n\n${LICENSE_INCLUDE}\n`;
  return rewriteGuideSourceForExtensions(
    replacePlaceholders(withLicense, context),
    context,
  );
}

export function rewriteGuideSourceForExtensions(
  source: string,
  context: GuideRenderContext,
): string {
  return rewriteGuideLines(source.split(/\r?\n/), context).join("\n");
}

function rewriteGuideLines(lines: string[], context: GuideRenderContext): any {
  const output = [];
  let excludeLanguage = false;
  let excludeBuild = false;
  let excludeMinJdk = false;
  let dependencyGroup = false;
  let groupedDependencies = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === ":exclude-for-languages:") {
      excludeLanguage = false;
      continue;
    }
    if (line === ":exclude-for-build:") {
      excludeBuild = false;
      continue;
    }
    if (line === ":exclude-for-jdk-lower-than:") {
      excludeMinJdk = false;
      continue;
    }
    if (excludeLanguage || excludeBuild || excludeMinJdk) {
      continue;
    }
    if (line.startsWith(":exclude-for-languages:")) {
      excludeLanguage = excludes(
        line,
        ":exclude-for-languages:",
        context.option.language,
      );
      continue;
    }
    if (line.startsWith(":exclude-for-build:")) {
      excludeBuild = excludes(
        line,
        ":exclude-for-build:",
        context.option.buildTool,
      );
      continue;
    }
    if (line.startsWith(":exclude-for-jdk-lower-than:")) {
      const threshold = Number.parseInt(
        line.slice(":exclude-for-jdk-lower-than:".length).trim(),
        10,
      );
      const guideMinJdk = Number.parseInt(
        String(context.guide.minimumJavaVersion || DEFAULT_MIN_JDK),
        10,
      );
      excludeMinJdk = Number.isFinite(threshold) && guideMinJdk >= threshold;
      continue;
    }
    if (line === ":dependencies:") {
      dependencyGroup = !dependencyGroup;
      if (!dependencyGroup) {
        const { bodyLines, nextIndex } = collectFollowingCalloutLines(
          lines,
          index + 1,
        );
        output.push(
          ...dependencyGroupBlockLines(groupedDependencies, bodyLines),
        );
        groupedDependencies = [];
        index = nextIndex - 1;
      }
      continue;
    }
    if (dependencyGroup && line.startsWith("dependency:")) {
      groupedDependencies.push(line);
      continue;
    }
    if (snippetMacroLine(line)) {
      const { bodyLines, nextIndex } = collectFollowingCalloutLines(
        lines,
        index + 1,
      );
      output.push(...rewriteMacroLine(line, bodyLines));
      index = nextIndex - 1;
      continue;
    }
    output.push(...rewriteMacroLine(line));
  }

  if (groupedDependencies.length) {
    output.push(...dependencyGroupBlockLines(groupedDependencies));
  }
  return output;
}

function rewriteMacroLine(line: any, bodyLines: string[] = []): any {
  const match = MACRO_LINE.exec(line);
  if (!match) {
    return [line];
  }

  const [, type, target, rawAttributes] = match;
  const attributes = parseAttributes(rawAttributes);
  const payload = { attributes, target };
  switch (type) {
    case "callout":
      return guideMacroLines(GUIDE_CALLOUT_BLOCK, payload);
    case "common":
      return guideBlockLines(GUIDE_COMMON_BLOCK, payload);
    case "common-template":
      return guideBlockLines(GUIDE_COMMON_TEMPLATE_BLOCK, payload);
    case "dependency":
      return guideBlockLines(GUIDE_DEPENDENCY_BLOCK, payload, bodyLines);
    case "diffLink":
      return guideBlockLines(GUIDE_DIFF_LINK_BLOCK, payload);
    case "external":
      return guideBlockLines(GUIDE_EXTERNAL_BLOCK, payload);
    case "external-template":
      return guideBlockLines(GUIDE_EXTERNAL_TEMPLATE_BLOCK, payload);
    case "rawTest":
      return guideBlockLines(GUIDE_RAW_TEST_BLOCK, payload, bodyLines);
    case "resource":
      return guideBlockLines(GUIDE_RESOURCE_BLOCK, payload, bodyLines);
    case "rocker":
      return guideBlockLines(GUIDE_ROCKER_BLOCK, payload);
    case "source":
      return guideBlockLines(GUIDE_SOURCE_BLOCK, payload, bodyLines);
    case "test":
      return guideBlockLines(GUIDE_TEST_BLOCK, payload, bodyLines);
    case "testResource":
      return guideBlockLines(GUIDE_TEST_RESOURCE_BLOCK, payload, bodyLines);
    case "zipInclude":
      return guideBlockLines(GUIDE_ZIP_INCLUDE_BLOCK, payload, bodyLines);
    default:
      return [line];
  }
}

function dependencyGroupBlockLines(
  lines: string[],
  bodyLines: string[] = [],
): string[] {
  const dependencies = lines
    .map((line: any): any => MACRO_LINE.exec(line))
    .filter(Boolean)
    .map((match: any): any => ({
      attributes: parseAttributes(match[3]),
      target: match[2].trim(),
    }));
  return dependencies.length
    ? guideBlockLines(GUIDE_DEPENDENCIES_BLOCK, { dependencies }, bodyLines)
    : [];
}

function snippetMacroLine(line: string): boolean {
  const match = MACRO_LINE.exec(line);
  return Boolean(
    match &&
    new Set([
      "dependency",
      "rawTest",
      "resource",
      "source",
      "test",
      "testResource",
      "zipInclude",
    ]).has(match[1]),
  );
}

function collectFollowingCalloutLines(
  lines: string[],
  startIndex: number,
): { bodyLines: string[]; nextIndex: number } {
  const bodyLines = [];
  let index = startIndex;
  let found = false;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      if (nextNonBlankLineStartsCallout(lines, index + 1)) {
        bodyLines.push(line);
        index += 1;
        continue;
      }
      break;
    }
    if (isCalloutListLine(line)) {
      bodyLines.push(line);
      found = true;
      index += 1;
      continue;
    }
    if (isCalloutMacroLine(line)) {
      bodyLines.push(...rewriteMacroLine(line));
      found = true;
      index += 1;
      continue;
    }
    break;
  }
  return {
    bodyLines: found ? bodyLines : [],
    nextIndex: found ? index : startIndex,
  };
}

function nextNonBlankLineStartsCallout(
  lines: string[],
  startIndex: number,
): boolean {
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }
    return isCalloutListLine(line) || isCalloutMacroLine(line);
  }
  return false;
}

function isCalloutListLine(line: string): boolean {
  return /^<(\.|\d+)>/.test(line);
}

function isCalloutMacroLine(line: string): boolean {
  return MACRO_LINE.exec(line)?.[1] === "callout";
}

function guideBlockLines(
  blockName: string,
  payload: unknown,
  bodyLines: string[] = [],
): string[] {
  return [
    "",
    `[${blockName},payload=${encodePayload(payload)}]`,
    "--",
    ...bodyLines,
    "--",
    "",
  ];
}

function guideMacroLines(blockName: string, payload: unknown): string[] {
  return ["", `${blockName}::${encodePayload(payload)}[]`, ""];
}

function encodePayload(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function parseAttributes(
  source: any,
): Record<string, string> & { _positional?: string[] } {
  return parseAttributeList(String(source || ""), {
    positionalKey: "_positional",
  }) as Record<string, string> & { _positional?: string[] };
}

function parseAttributeList(
  value: string,
  options: {
    includeText?: boolean;
    positionalKey?: "$positional" | "_positional";
  } = {},
): Record<string, string> & {
  $positional?: string[];
  _positional?: string[];
  text?: string;
} {
  const attributes: Record<string, any> = {};
  const positional = [];
  if (options.includeText) {
    attributes.text = value;
  }
  for (const item of splitAttributeList(value)) {
    const separator = item.indexOf("=");
    if (separator < 0) {
      const positionalValue = stripQuotes(item);
      if (positionalValue) {
        positional.push(positionalValue);
      }
      continue;
    }
    const key = item.slice(0, separator).trim();
    const raw = item.slice(separator + 1).trim();
    if (key) {
      attributes[key] = stripQuotes(raw);
    }
  }
  if (options.positionalKey && positional.length) {
    attributes[options.positionalKey] = positional;
  }
  return attributes;
}

function splitAttributeList(value: string): string[] {
  const items = [];
  let current = "";
  let quote = "";
  for (const char of value || "") {
    if (quote) {
      if (char === quote) {
        quote = "";
      }
      current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ",") {
      items.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    items.push(current.trim());
  }
  return items;
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function replacePlaceholders(
  source: string,
  context: GuideRenderContext,
): string {
  let text = source
    .replaceAll("{githubSlug}", context.guide.slug)
    .replaceAll("@guideTitle@", context.guide.title)
    .replaceAll("@guideIntro@", context.guide.intro)
    .replaceAll("@micronaut@", context.version)
    .replaceAll("@micronautVersion@", context.version)
    .replaceAll("@language@", context.option.languageLabel)
    .replaceAll("@lang@", context.option.language)
    .replaceAll("@build@", context.option.buildTool)
    .replaceAll("@testFramework@", context.option.testFramework)
    .replaceAll("@authors@", context.guide.authors.join(", "))
    .replaceAll(
      "@languageextension@",
      languageExtension(context.option.language),
    )
    .replaceAll(
      "@testsuffix@",
      context.option.testFramework === "spock" ? "Spec" : "Test",
    )
    .replaceAll("@sourceDir@", context.option.sourceDir)
    .replaceAll(
      "@minJdk@",
      String(context.guide.minimumJavaVersion || DEFAULT_MIN_JDK),
    )
    .replaceAll("@api@", "https://docs.micronaut.io/latest/api");

  text = rewriteIncludeTargets(text, context);
  text = text.replace(/@([\w-]*):?cli-command@/g, (_match, appName) =>
    cliCommandForApp(findApp(context.guide, appName || "default")),
  );
  text = text.replace(/@([\w-]*):?features@/g, (_match, appName) =>
    appFeatures(context.guide, context.option, appName || "default").join(","),
  );
  text = text.replace(/@([\w-]*):?features-words@/g, (_match, appName) =>
    featuresWords(
      appFeatures(context.guide, context.option, appName || "default"),
    ),
  );
  return text;
}

function rewriteIncludeTargets(
  source: string,
  context: GuideRenderContext,
): string {
  return source.replace(
    /^include::([^\[]+)\[([^\]]*)]/gm,
    (match, target, attributes) => {
      const resolved = resolveGuideIncludeTarget(target, context);
      return resolved ? `include::${resolved}[${attributes}]` : match;
    },
  );
}

function resolveGuideIncludeTarget(
  target: string,
  context: GuideRenderContext,
): string {
  const normalized = target
    .replaceAll("\\", "/")
    .replaceAll("@sourceDir@", context.option.sourceDir)
    .replaceAll("@lang@", context.option.language)
    .replaceAll(
      "@languageextension@",
      languageExtension(context.option.language),
    );
  const candidates = includeTargetCandidates(normalized, context);
  for (const candidate of candidates) {
    const found = findExistingIncludeTarget(candidate, context);
    if (found) {
      return found;
    }
  }
  return "";
}

function includeTargetCandidates(
  target: string,
  context: GuideRenderContext,
): string[] {
  const candidates = [target];
  const withoutAttributeRoot = target.replace(/^\{sourceDir}\//, "");
  candidates.push(withoutAttributeRoot);

  const prefixedOption = `${context.guide.slug}/${context.option.sourceDir}/`;
  if (withoutAttributeRoot.startsWith(prefixedOption)) {
    candidates.push(withoutAttributeRoot.slice(prefixedOption.length));
  }

  const prefixedSlug = `${context.guide.slug}/`;
  if (withoutAttributeRoot.startsWith(prefixedSlug)) {
    candidates.push(withoutAttributeRoot.slice(prefixedSlug.length));
  }

  for (const candidate of [...candidates]) {
    if (candidate.startsWith("src/")) {
      candidates.push(`${context.option.language}/${candidate}`);
    }
  }

  return [...new Set(candidates.filter(Boolean))];
}

function findExistingIncludeTarget(
  candidate: string,
  context: GuideRenderContext,
): string {
  if (path.isAbsolute(candidate) && existsSync(candidate)) {
    return candidate.replaceAll(path.sep, "/");
  }
  for (const root of [context.guide.directory, ...guideSourceRoots(context)]) {
    const file = path.join(root, candidate);
    if (existsSync(file)) {
      return path
        .relative(context.guide.directory, file)
        .replaceAll(path.sep, "/");
    }
  }
  return "";
}

function guideSourceRoots(context: GuideRenderContext): string[] {
  if (!context.guide.base) {
    return [];
  }
  return [path.join(context.guidesDirectory, "guides", context.guide.base)];
}

function findApp(
  guide: GuideRenderContext["guide"],
  appName: string,
): GuideRenderContext["guide"]["apps"][number] | undefined {
  return guide.apps.find((app) => app.name === appName) || guide.apps[0];
}

function excludes(line: string, prefix: string, selected: string): boolean {
  return line
    .slice(prefix.length)
    .split(",")
    .map((value: any): any => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(String(selected || "").toLowerCase());
}
