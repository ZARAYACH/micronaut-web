import { existsSync, readFileSync } from "node:fs";
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

const GUIDE_DEPENDENCIES_BLOCK = "guide-dependencies";
const DEPENDENCY_LINE = /^dependency:{1,2}([^\[]*)\[(.*)]\s*$/;
const CALLOUT_LINE_MACRO = /^callout:{1,2}([^\[]+)\[([^\]]*)]\s*$/;
const EXCLUDE_DIRECTIVE_LINE =
  /^:(exclude-for-languages|exclude-for-build|exclude-for-jdk-lower-than):(.*)$/;
const DEFAULT_MIN_JDK = 21;
const LICENSE_INCLUDE = "common::license.adoc[]";
const EXPANDED_CONTENT_MACRO_LINE =
  /^(common|common-template|external|external-template):{1,2}([^\[]+)\[([^\]]*)]\s*$/;
const LEGACY_LINE_BLOCK_MACROS = new Set([
  "callout",
  "common",
  "common-template",
  "dependency",
  "diffLink",
  "external",
  "external-template",
  "rawTest",
  "resource",
  "rocker",
  "source",
  "test",
  "testResource",
  "zipInclude",
]);

type ExcludeMacroName =
  | "exclude-for-languages"
  | "exclude-for-build"
  | "exclude-for-jdk-lower-than";

type ExcludeDirective = {
  name: ExcludeMacroName;
  values: string[];
};

type ConstructableReader = Reader & {
  constructor: new (
    document: unknown,
    lines: string[],
    cursor: unknown,
    options: Record<string, unknown>,
  ) => Reader;
  cursor: unknown;
  lines: string[];
};

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
      const sourceReader = reader as ConstructableReader;
      return new sourceReader.constructor(
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

function rewriteGuideLines(
  lines: string[],
  context: GuideRenderContext,
): string[] {
  const output: string[] = [];
  let dependencyGroup = false;
  let groupedDependencies: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const expandedContent = expandedGuideContentLines(line, context);
    if (expandedContent) {
      output.push(...expandedContent);
      continue;
    }
    const expandedCallout = expandedGuideCalloutLines(line, context);
    if (expandedCallout) {
      output.push(...expandedCallout);
      continue;
    }
    const legacyBlockMacro = legacyLineBlockMacro(line);
    if (legacyBlockMacro) {
      output.push(legacyBlockMacro);
      continue;
    }
    const excludeBlock = legacyExcludeBlockLines(lines, index, context);
    if (excludeBlock) {
      output.push(...excludeBlock.lines);
      index = excludeBlock.nextIndex - 1;
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
    output.push(line);
  }

  if (groupedDependencies.length) {
    output.push(...dependencyGroupBlockLines(groupedDependencies));
  }
  return output;
}

function expandedGuideContentLines(
  line: string,
  context: GuideRenderContext,
): string[] | undefined {
  const match = EXPANDED_CONTENT_MACRO_LINE.exec(line);
  if (!match) {
    return undefined;
  }

  const [, macroName, target, rawAttributes] = match;
  if (macroName === "common" && target.trim() === "header-top.adoc") {
    return [];
  }

  const file =
    macroName === "common" || macroName === "common-template"
      ? commonSnippetPath(context.guidesDirectory, target)
      : externalPath(context.guidesDirectory, target);
  try {
    let source = readFileSync(file, "utf8");
    if (macroName.endsWith("-template")) {
      const attributes = parseAttributes(rawAttributes);
      source = source
        .split(/\r?\n/)
        .map((sourceLine) =>
          replaceGuideTemplateArguments(sourceLine, attributes),
        )
        .join("\n");
    }
    return prepareGuideSourceForExtensions(source, context, {
      appendLicense: false,
    }).split(/\r?\n/);
  } catch {
    return [`NOTE: Missing include \`${path.basename(file)}\`.`];
  }
}

function expandedGuideCalloutLines(
  line: string,
  context: GuideRenderContext,
): string[] | undefined {
  const match = CALLOUT_LINE_MACRO.exec(line);
  if (!match) {
    return undefined;
  }

  const [, target, rawAttributes] = match;
  const attributes = parseAttributes(rawAttributes);
  const file = path.join(
    context.guidesDirectory,
    "src",
    "docs",
    "common",
    "callouts",
    `callout-${ensureSuffix(target.trim(), ".adoc")}`,
  );
  try {
    const explicitNumber = calloutNumber(attributes);
    return prepareGuideSourceForExtensions(
      readFileSync(file, "utf8"),
      context,
      {
        appendLicense: false,
      },
    )
      .split(/\r?\n/)
      .map((sourceLine) =>
        replaceGuideTemplateArguments(sourceLine, attributes),
      )
      .map((sourceLine) => {
        return explicitNumber
          ? sourceLine.replace(/^<\.>/, `<${explicitNumber}>`)
          : sourceLine;
      });
  } catch {
    return [`NOTE: Missing include \`${path.basename(file)}\`.`];
  }
}

function legacyLineBlockMacro(line: string): string | undefined {
  const match = /^([A-Za-z][\w-]*):([^:]*\[[^\]]*])\s*$/.exec(line);
  return match && LEGACY_LINE_BLOCK_MACROS.has(match[1])
    ? `${match[1]}::${match[2]}`
    : undefined;
}

function legacyExcludeBlockLines(
  lines: string[],
  startIndex: number,
  context: GuideRenderContext,
): { lines: string[]; nextIndex: number } | undefined {
  const directive = parseExcludeDirective(lines[startIndex]);
  if (!directive) {
    return undefined;
  }
  if (!directive.values.length) {
    return { lines: [], nextIndex: startIndex + 1 };
  }

  const values = [...directive.values];
  let index = startIndex + 1;
  while (index < lines.length) {
    const nextDirective = parseExcludeDirective(lines[index]);
    if (
      !nextDirective ||
      nextDirective.name !== directive.name ||
      !nextDirective.values.length
    ) {
      break;
    }
    values.push(...nextDirective.values);
    index += 1;
  }

  const bodyLines: string[] = [];
  while (index < lines.length) {
    const nextDirective = parseExcludeDirective(lines[index]);
    if (
      nextDirective &&
      nextDirective.name === directive.name &&
      !nextDirective.values.length
    ) {
      index += 1;
      break;
    }
    bodyLines.push(lines[index]);
    index += 1;
  }

  return {
    lines: shouldExcludeDirective(directive.name, values, context)
      ? []
      : ["", ...rewriteGuideLines(bodyLines, context), ""],
    nextIndex: index,
  };
}

function shouldExcludeDirective(
  name: ExcludeMacroName,
  values: string[],
  context: GuideRenderContext,
): boolean {
  if (name === "exclude-for-languages") {
    return values.some(
      (value) => value.toLowerCase() === context.option.language.toLowerCase(),
    );
  }
  if (name === "exclude-for-build") {
    return values.some(
      (value) => value.toLowerCase() === context.option.buildTool.toLowerCase(),
    );
  }
  const threshold = Number.parseInt(values[0] || "", 10);
  const guideMinJdk = Number.parseInt(
    String(context.guide.minimumJavaVersion || DEFAULT_MIN_JDK),
    10,
  );
  return Number.isFinite(threshold) && guideMinJdk >= threshold;
}

function parseExcludeDirective(line: string): ExcludeDirective | undefined {
  const match = EXCLUDE_DIRECTIVE_LINE.exec(line);
  if (!match) {
    return undefined;
  }
  return {
    name: match[1] as ExcludeMacroName,
    values: splitExcludeDirectiveValues(match[2]),
  };
}

function splitExcludeDirectiveValues(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function dependencyGroupBlockLines(
  lines: string[],
  bodyLines: string[] = [],
): string[] {
  const dependencies = lines
    .map((line) => DEPENDENCY_LINE.exec(line))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => ({
      attributes: parseAttributes(match[2]),
      target: match[1].trim(),
    }));
  return dependencies.length
    ? guideBlockLines(GUIDE_DEPENDENCIES_BLOCK, { dependencies }, bodyLines)
    : [];
}

function collectFollowingCalloutLines(
  lines: string[],
  startIndex: number,
): { bodyLines: string[]; nextIndex: number } {
  const bodyLines: string[] = [];
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
    return isCalloutListLine(line);
  }
  return false;
}

function isCalloutListLine(line: string): boolean {
  return /^<(\.|\d+)>/.test(line);
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

function encodePayload(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function parseAttributes(
  source: unknown,
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
): Record<string, string | string[]> & {
  $positional?: string[];
  _positional?: string[];
  text?: string;
} {
  const attributes: Record<string, string | string[]> = {};
  const positional: string[] = [];
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
  const items: string[] = [];
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

function replaceGuideTemplateArguments(
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

function calloutNumber(
  attributes: Record<string, string> & { _positional?: string[] },
): string {
  const number =
    attributes.number ||
    attributes.callout ||
    attributes._positional?.[1] ||
    attributes._positional?.[0] ||
    "";
  return /^\d+$/.test(number) ? number : "";
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
