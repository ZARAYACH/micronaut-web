import { existsSync, promises as fs } from "node:fs";
import path from "node:path";

import { extractTaggedSource } from "../platform-docs/snippets.ts";
import {
  appFeatures,
  cliCommandForApp,
  featuresWords,
  languageExtension,
  languageSourceDirectory
} from "./model.ts";

const MACRO_LINE = /^([A-Za-z][A-Za-z0-9_-]*):([^\[]*)\[(.*)]\s*$/;
const DEFAULT_MIN_JDK = 21;
const LICENSE_INCLUDE = "common:license.adoc[]";

export async function preprocessGuideSource({ guidesDirectory, guide, option }) {
  const sourceFile = path.join(guide.directory, guide.asciidoc);
  let source = await fs.readFile(sourceFile, "utf8");
  source = `${source.replace(/\s+$/, "")}\n\n${LICENSE_INCLUDE}\n`;
  const context = {
    guidesDirectory,
    guide,
    option,
    version: await readVersion(guidesDirectory)
  };
  const expanded = normalizeOrphanCalloutLists(normalizeCalloutListNumbers(
    await expandLines(source.split(/\r?\n/), context, new Set())
  ));
  return replacePlaceholders(expanded.join("\n"), context);
}

async function expandLines(lines, context, includeStack) {
  const output = [];
  let excludeLanguage = false;
  let excludeBuild = false;
  let excludeMinJdk = false;
  let dependencyGroup = false;
  let groupedDependencies = [];

  for (const rawLine of lines) {
    const line = processGuideLinks(rawLine);
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
      excludeLanguage = excludes(line, ":exclude-for-languages:", context.option.language);
      continue;
    }
    if (line.startsWith(":exclude-for-build:")) {
      excludeBuild = excludes(line, ":exclude-for-build:", context.option.buildTool);
      continue;
    }
    if (line.startsWith(":exclude-for-jdk-lower-than:")) {
      const threshold = Number.parseInt(line.slice(":exclude-for-jdk-lower-than:".length).trim(), 10);
      const guideMinJdk = Number.parseInt(context.guide.minimumJavaVersion || DEFAULT_MIN_JDK, 10);
      excludeMinJdk = Number.isFinite(threshold) && guideMinJdk >= threshold;
      continue;
    }
    if (line === ":dependencies:") {
      dependencyGroup = !dependencyGroup;
      if (!dependencyGroup) {
        output.push(...dependencyLines(groupedDependencies, context));
        groupedDependencies = [];
      }
      continue;
    }
    if (dependencyGroup && line.startsWith("dependency:")) {
      groupedDependencies.push(line);
      continue;
    }
    output.push(...await expandMacroLine(line, context, includeStack));
  }

  if (groupedDependencies.length) {
    output.push(...dependencyLines(groupedDependencies, context));
  }
  return output;
}

async function expandMacroLine(line, context, includeStack) {
  const match = MACRO_LINE.exec(line);
  if (!match) {
    return [line];
  }

  const [, type, target, rawAttributes] = match;
  const attributes = parseAttributes(rawAttributes);
  switch (type) {
    case "callout":
      return includeCallout(target, attributes, context, includeStack);
    case "common":
      if (target.trim() === "header-top.adoc") {
        return [];
      }
      return includeAdoc(commonSnippetPath(context.guidesDirectory, target), context, includeStack);
    case "common-template":
      return includeTemplate(commonSnippetPath(context.guidesDirectory, target), attributes, context, includeStack);
    case "dependency":
      return dependencyLines([line], context);
    case "diffLink":
      return [diffLink(target, attributes, context)];
    case "external":
      return includeAdoc(externalPath(context.guidesDirectory, target), context, includeStack);
    case "external-template":
      return includeTemplate(externalPath(context.guidesDirectory, target), attributes, context, includeStack);
    case "rawTest":
      return sourceBlock(target, attributes, context, "raw-test");
    case "resource":
      return resourceBlock(target, attributes, context, "main");
    case "rocker":
      return includeRocker(target, context);
    case "source":
      return sourceBlock(target, attributes, context, "main");
    case "test":
      return sourceBlock(target, attributes, context, "test");
    case "testResource":
      return resourceBlock(target, attributes, context, "test");
    case "zipInclude":
      return zipIncludeBlock(target, attributes, context);
    default:
      return [line];
  }
}

async function includeAdoc(file, context, includeStack) {
  const normalized = path.resolve(file);
  if (includeStack.has(normalized)) {
    return [];
  }
  try {
    const source = await fs.readFile(normalized, "utf8");
    includeStack.add(normalized);
    try {
      return expandLines(source.split(/\r?\n/), context, includeStack);
    } finally {
      includeStack.delete(normalized);
    }
  } catch {
    return [`NOTE: Missing include \`${path.basename(file)}\`.`];
  }
}

async function includeCallout(target, attributes, context, includeStack) {
  const lines = await includeAdoc(
    path.join(context.guidesDirectory, "src", "docs", "common", "callouts", `callout-${ensureSuffix(target.trim(), ".adoc")}`),
    context,
    includeStack
  );
  const explicitNumber = calloutNumber(attributes);
  return lines.map((line) => {
    const replaced = replaceTemplateArguments(line, attributes);
    return explicitNumber ? replaced.replace(/^<\.>/, `<${explicitNumber}>`) : replaced;
  });
}

async function includeTemplate(file, attributes, context, includeStack) {
  const lines = await includeAdoc(file, context, includeStack);
  return lines.map((line) => replaceTemplateArguments(line, attributes));
}

async function includeRocker(target, context) {
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
    `${target.trim()}.rocker.raw`
  );
  try {
    return (await fs.readFile(file, "utf8")).split(/\r?\n/);
  } catch {
    return [`NOTE: Missing rocker template \`${target.trim()}\`.`];
  }
}

async function sourceBlock(target, attributes, context, kind) {
  const file = await findSourceFile(target.trim(), attributes, context, kind);
  if (!file) {
    return [`NOTE: Missing source \`${target.trim()}\`.`];
  }

  let source = await fs.readFile(file, "utf8");
  source = extractTaggedSource(source, tagSelection(attributes));
  source = normalizeSourceCalloutMarkers(source);
  if (!attributes.tags && !attributes.tag) {
    source = stripLicenseHeader(source);
  }
  source = normalizeIndent(source, attributes.indent);
  const title = path.relative(context.guide.directory, file).replaceAll(path.sep, "/");
  return sourceBlockLines(languageForFile(file, context.option.language), title, source);
}

async function resourceBlock(target, attributes, context, sourceSet) {
  const file = await findResourceFile(target.trim(), attributes, context, sourceSet);
  if (!file) {
    return [`NOTE: Missing resource \`${target.trim()}\`.`];
  }

  let source = await fs.readFile(file, "utf8");
  source = extractTaggedSource(source, tagSelection(attributes));
  source = normalizeSourceCalloutMarkers(source);
  source = normalizeIndent(source, attributes.indent);
  const title = path.relative(context.guide.directory, file).replaceAll(path.sep, "/");
  return sourceBlockLines(languageForFile(file), title, source);
}

async function zipIncludeBlock(target, attributes, context) {
  const file = await findFileInSourceRoots(target.trim(), attributes, context);
  if (!file) {
    return [`NOTE: Missing zip include \`${target.trim()}\`.`];
  }
  let source = await fs.readFile(file, "utf8");
  source = extractTaggedSource(source, tagSelection(attributes));
  source = normalizeSourceCalloutMarkers(source);
  source = normalizeIndent(source, attributes.indent);
  return sourceBlockLines(languageForFile(file), target.trim(), source);
}

function dependencyLines(lines, context) {
  const dependencies = lines
    .map((line) => MACRO_LINE.exec(line))
    .filter(Boolean)
    .map((match) => ({
      artifactId: match[2].trim(),
      attributes: parseAttributes(match[3])
    }));
  if (!dependencies.length) {
    return [];
  }

  if (context.option.buildTool === "maven") {
    const xml = dependencies.map(({ artifactId, attributes }) => {
      const groupId = attributes.groupId || attributes.groupdId || "io.micronaut";
      const scope = attributes.scope ? `\n    <scope>${attributes.scope}</scope>` : "";
      const version = attributes.version ? `\n    <version>${attributes.version}</version>` : "";
      const marker = dependencyCalloutMarker(attributes, "xml");
      return `<dependency>${marker}
    <groupId>${groupId}</groupId>
    <artifactId>${artifactId}</artifactId>${version}${scope}
</dependency>`;
    }).join("\n");
    return sourceBlockLines("xml", "Dependency", xml);
  }

  const gradleScope = {
    test: "testImplementation",
    testImplementation: "testImplementation",
    runtime: "runtimeOnly",
    runtimeOnly: "runtimeOnly",
    compileOnly: "compileOnly",
    annotationProcessor: "annotationProcessor"
  };
  const gradle = dependencies.map(({ artifactId, attributes }) => {
    const groupId = attributes.groupId || attributes.groupdId || "io.micronaut";
    const scope = gradleScope[attributes.scope] || attributes.scope || "implementation";
    const version = attributes.version ? `:${attributes.version}` : "";
    return `${scope}("${groupId}:${artifactId}${version}")${dependencyCalloutMarker(attributes, "gradle")}`;
  }).join("\n");
  return sourceBlockLines("groovy", "Dependency", gradle);
}

function sourceBlockLines(language, title, source) {
  const lines = [""];
  if (title) {
    lines.push(`.${title}`);
  }
  lines.push(`[source,${language || "text"}]`);
  lines.push("----");
  lines.push(source.trimEnd());
  lines.push("----");
  lines.push("");
  return lines;
}

async function findSourceFile(target, attributes, context, kind) {
  const app = attributes.app || "";
  const sourceSet = kind === "main" ? "main" : "test";
  const extension = kind === "raw-test"
    ? rawTestExtension(context.option.testFramework)
    : languageExtension(context.option.language);
  const sourceDirectory = kind === "raw-test"
    ? rawTestSourceDirectory(context.option.testFramework)
    : languageSourceDirectory(context.option.language, sourceSet);
  const className = kind === "test" && target.endsWith("Test")
    ? `${target.slice(0, -"Test".length)}${context.option.testFramework === "spock" ? "Spec" : "Test"}`
    : target;
  const sourcePath = path.join(sourceDirectory, "example", "micronaut", `${className}.${extension}`);
  const relativePath = path.join(app, sourcePath);
  return findExisting(context, [
    path.join(context.guide.directory, relativePath),
    path.join(context.guide.directory, app, context.option.language, sourcePath),
    path.join(context.guide.directory, context.option.language, sourcePath),
    ...guideSourceRoots(context).flatMap((root) => [
      path.join(root, relativePath),
      path.join(root, app, context.option.language, sourcePath),
      path.join(root, context.option.language, sourcePath)
    ])
  ], path.basename(`${className}.${extension}`), sourceSet);
}

async function findResourceFile(target, attributes, context, sourceSet) {
  const app = attributes.app || "";
  const resourcePathWithoutApp = target.startsWith("../")
    ? path.join(`src/${sourceSet}`, target.slice("../".length))
    : path.join(`src/${sourceSet}`, "resources", target);
  const resourcePath = target.startsWith("../")
    ? path.join(app, `src/${sourceSet}`, target.slice("../".length))
    : path.join(app, `src/${sourceSet}`, "resources", target);
  return findExisting(context, [
    path.join(context.guide.directory, resourcePath),
    path.join(context.guide.directory, app, context.option.language, resourcePathWithoutApp),
    path.join(context.guide.directory, context.option.language, resourcePathWithoutApp),
    ...guideSourceRoots(context).flatMap((root) => [
      path.join(root, resourcePath),
      path.join(root, app, context.option.language, resourcePathWithoutApp),
      path.join(root, context.option.language, resourcePathWithoutApp)
    ])
  ], path.basename(target), `src/${sourceSet}/resources`);
}

async function findFileInSourceRoots(target, attributes, context) {
  const app = attributes.app || "";
  return findExisting(context, [
    path.join(context.guide.directory, app, target),
    path.join(context.guide.directory, target),
    ...guideSourceRoots(context).flatMap((root) => [
      path.join(root, app, target),
      path.join(root, target)
    ])
  ], path.basename(target));
}

async function findExisting(context, candidates, fallbackName, requiredSegment = "") {
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

async function findByName(root, name, requiredSegment = "") {
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

function guideSourceRoots(context) {
  if (!context.guide.base) {
    return [];
  }
  return [path.join(context.guidesDirectory, "guides", context.guide.base)];
}

function replacePlaceholders(source, context) {
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
    .replaceAll("@languageextension@", languageExtension(context.option.language))
    .replaceAll("@testsuffix@", context.option.testFramework === "spock" ? "Spec" : "Test")
    .replaceAll("@sourceDir@", context.option.sourceDir)
    .replaceAll("@minJdk@", String(context.guide.minimumJavaVersion || DEFAULT_MIN_JDK))
    .replaceAll("@api@", "https://docs.micronaut.io/latest/api");

  text = rewriteIncludeTargets(text, context);
  text = text.replace(/@([\w-]*):?cli-command@/g, (_, appName) =>
    cliCommandForApp(findApp(context.guide, appName || "default"))
  );
  text = text.replace(/@([\w-]*):?features@/g, (_, appName) =>
    appFeatures(context.guide, context.option, appName || "default").join(",")
  );
  text = text.replace(/@([\w-]*):?features-words@/g, (_, appName) =>
    featuresWords(appFeatures(context.guide, context.option, appName || "default"))
  );
  return text;
}

function processGuideLinks(line) {
  return line.replace(/guideLink:([^\[]+)\[([^\]]+)]/g, "link:$1.html[$2]");
}

function diffLink(_target, attributes, context) {
  const appName = attributes.app || "default";
  const app = findApp(context.guide, appName);
  const excluded = new Set((attributes.featureExcludes || "").split("|").filter(Boolean));
  const features = (attributes.features ? attributes.features.split("|") : appFeatures(context.guide, context.option, appName))
    .filter((feature) => feature && !excluded.has(feature));
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

type Attributes = Record<string, string> & { _positional?: string[] };

function parseAttributes(source): Attributes {
  const attributes: Attributes = {};
  const positional: string[] = [];
  for (const part of splitAttributes(source)) {
    const separator = part.indexOf("=");
    if (separator < 0) {
      positional.push(part);
      continue;
    }
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key) {
      attributes[key] = value;
    }
  }
  if (positional.length) {
    attributes._positional = positional;
  }
  return attributes;
}

function calloutNumber(attributes) {
  const number = attributes.number || attributes.callout || attributes._positional?.[0] || "";
  return /^\d+$/.test(number) ? number : "";
}

function tagSelection(attributes) {
  return (attributes.tags || attributes.tag || "").replaceAll("|", ",");
}

function normalizeSourceCalloutMarkers(source) {
  return source.replace(/([ \t](?:\/\/|#|;)[ \t]*)(\d+)>$/gm, "$1<$2>");
}

function dependencyCalloutMarker(attributes, language) {
  const number = calloutNumber(attributes);
  if (!number) {
    return "";
  }
  return language === "xml" ? ` <!--${number}-->` : ` // <${number}>`;
}

function normalizeCalloutListNumbers(lines) {
  const output = [];
  let nextCallout = 1;
  let inCalloutList = false;
  let blankAfterCallout = false;
  for (const line of lines) {
    const match = /^<(\.|\d+)>/.exec(line);
    if (match) {
      const number = match[1] === "." ? nextCallout : Number.parseInt(match[1], 10);
      output.push(line.replace(/^<(\.|\d+)>/, `<${number}>`));
      nextCallout = number + 1;
      inCalloutList = true;
      blankAfterCallout = false;
      continue;
    }
    output.push(line);
    if (!line.trim()) {
      if (inCalloutList) {
        blankAfterCallout = true;
      } else {
        nextCallout = 1;
      }
      continue;
    }
    if (inCalloutList && blankAfterCallout) {
      inCalloutList = false;
      nextCallout = 1;
      blankAfterCallout = false;
    }
  }
  return output;
}

function normalizeOrphanCalloutLists(lines) {
  const output = [];
  let inListingBlock = false;
  let listingBlockLines = [];
  let listingBlockOutputStart = -1;
  let previousListing = emptyListingContext();

  for (let index = 0; index < lines.length;) {
    const line = lines[index];

    if (isListingDelimiter(line)) {
      output.push(line);
      if (inListingBlock) {
        previousListing = listingCalloutContext(listingBlockLines, listingBlockOutputStart, output.length - 1);
        listingBlockLines = [];
      } else {
        previousListing = emptyListingContext();
        listingBlockOutputStart = output.length;
      }
      inListingBlock = !inListingBlock;
      index += 1;
      continue;
    }

    if (inListingBlock) {
      listingBlockLines.push(line);
      output.push(line);
      index += 1;
      continue;
    }

    if (isCalloutListItem(line)) {
      const { items, nextIndex } = collectCalloutList(lines, index);
      const { listingItems, manualItems } = splitCalloutItems(items, previousListing, output);
      output.push(...listingItems.map((item) => item.line));
      if (manualItems.length) {
        if (listingItems.length) {
          output.push("");
        }
        output.push("[.guide-manual-callouts]");
        output.push(...manualItems.map((item) => `. ${item.text}`));
        output.push("");
      }
      previousListing = emptyListingContext();
      index = nextIndex;
      continue;
    }

    output.push(line);
    if (line.trim()) {
      previousListing = emptyListingContext();
    }
    index += 1;
  }

  return output;
}

function isListingDelimiter(line) {
  return line.trim() === "----";
}

function isCalloutListItem(line) {
  return /^<(\.|\d+)>/.test(line);
}

function listingCalloutContext(lines, outputStart, outputEnd) {
  const source = lines.join("\n");
  if (/^include::/m.test(source)) {
    return { unknown: true, numbers: new Set(), outputStart, outputEnd };
  }
  return {
    unknown: false,
    numbers: new Set(Array.from(source.matchAll(/<(\d+)>|<!--(\d+)-->/g), (match) => match[1] || match[2])),
    outputStart,
    outputEnd
  };
}

function emptyListingContext() {
  return {
    unknown: false,
    numbers: new Set(),
    outputStart: -1,
    outputEnd: -1
  };
}

function collectCalloutList(lines, startIndex) {
  const items = [];
  let index = startIndex;
  while (index < lines.length) {
    const line = lines[index];
    const match = /^<(\.|\d+)>\s*(.*)$/.exec(line);
    if (match) {
      items.push({
        number: match[1],
        text: match[2],
        line
      });
      index += 1;
      continue;
    }
    if (!line.trim() && nextNonBlankLineIsCallout(lines, index + 1)) {
      index += 1;
      continue;
    }
    break;
  }
  return { items, nextIndex: index };
}

function splitCalloutItems(items, listing, output) {
  if (listing.unknown) {
    return { listingItems: items, manualItems: [] };
  }
  const listingItems = [];
  const manualItems = [];
  for (const item of items) {
    if (listing.numbers.has(item.number)) {
      listingItems.push(item);
    } else {
      manualItems.push(item);
    }
  }
  if (listingItems.length) {
    manualItems.push(...renumberListingCallouts(listingItems, listing, output));
  }
  return { listingItems, manualItems };
}

function renumberListingCallouts(items, listing, output) {
  const numberMap = new Map();
  for (const item of items) {
    if (!numberMap.has(item.number)) {
      numberMap.set(item.number, String(numberMap.size + 1));
    }
  }
  if (!canRenumberListing(numberMap, listing.numbers)) {
    const { listingItems, manualItems } = sequentialPrefix(items);
    items.splice(0, items.length, ...listingItems);
    return manualItems;
  }
  if ([...numberMap].every(([from, to]) => from === to)) {
    return [];
  }
  for (let index = listing.outputStart; index < listing.outputEnd; index += 1) {
    output[index] = output[index].replace(/<(\d+)>|<!--(\d+)-->/g, (match, xmlNumber, commentNumber) => {
      const nextNumber = numberMap.get(xmlNumber || commentNumber);
      if (!nextNumber) {
        return match;
      }
      return xmlNumber ? `<${nextNumber}>` : `<!--${nextNumber}-->`;
    });
  }
  for (const item of items) {
    item.line = item.line.replace(/^<(\.|\d+)>/, `<${numberMap.get(item.number) || item.number}>`);
  }
  return [];
}

function canRenumberListing(numberMap, listingNumbers) {
  for (const [from, to] of numberMap) {
    if (from !== to && listingNumbers.has(to) && !numberMap.has(to)) {
      return false;
    }
  }
  return true;
}

function sequentialPrefix(items) {
  const listingItems = [];
  const manualItems = [];
  let expected = 1;
  for (const item of items) {
    if (Number.parseInt(item.number, 10) === expected) {
      listingItems.push(item);
      expected += 1;
    } else {
      manualItems.push(item);
    }
  }
  return { listingItems, manualItems };
}

function nextNonBlankLineIsCallout(lines, startIndex) {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (!lines[index].trim()) {
      continue;
    }
    return isCalloutListItem(lines[index]);
  }
  return false;
}

function rewriteIncludeTargets(source, context) {
  return source.replace(/^include::([^\[]+)\[([^\]]*)]/gm, (match, target, attributes) => {
    const resolved = resolveGuideIncludeTarget(target, context);
    return resolved ? `include::${resolved}[${attributes}]` : match;
  });
}

function resolveGuideIncludeTarget(target, context) {
  const normalized = target
    .replaceAll("\\", "/")
    .replaceAll("@sourceDir@", context.option.sourceDir)
    .replaceAll("@lang@", context.option.language)
    .replaceAll("@languageextension@", languageExtension(context.option.language));
  const candidates = includeTargetCandidates(normalized, context);
  for (const candidate of candidates) {
    const found = findExistingIncludeTarget(candidate, context);
    if (found) {
      return found;
    }
  }
  return "";
}

function includeTargetCandidates(target, context) {
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

function findExistingIncludeTarget(candidate, context) {
  if (path.isAbsolute(candidate) && existsSync(candidate)) {
    return candidate.replaceAll(path.sep, "/");
  }
  for (const root of [context.guide.directory, ...guideSourceRoots(context)]) {
    const file = path.join(root, candidate);
    if (existsSync(file)) {
      return path.relative(context.guide.directory, file).replaceAll(path.sep, "/");
    }
  }
  return "";
}

function splitAttributes(source) {
  const parts = [];
  let current = "";
  let quote = "";
  for (const char of source || "") {
    if ((char === "\"" || char === "'") && (!quote || quote === char)) {
      quote = quote ? "" : char;
      current += char;
      continue;
    }
    if (char === "," && !quote) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function replaceTemplateArguments(line, attributes) {
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

function commonSnippetPath(guidesDirectory, target) {
  return path.join(guidesDirectory, "src", "docs", "common", "snippets", `common-${ensureSuffix(target.trim(), ".adoc")}`);
}

function externalPath(guidesDirectory, target) {
  return path.join(guidesDirectory, "guides", ensureSuffix(target.trim(), ".adoc"));
}

function ensureSuffix(value, suffix) {
  return value.endsWith(suffix) ? value : `${value}${suffix}`;
}

function excludes(line, prefix, value) {
  return line.slice(prefix.length).split(",").some((item) => item.trim().toLowerCase() === value.toLowerCase());
}

function rawTestExtension(testFramework) {
  return testFramework === "spock" ? "groovy" : "java";
}

function rawTestSourceDirectory(testFramework) {
  return testFramework === "spock" ? "src/test/groovy" : "src/test/java";
}

function stripLicenseHeader(source) {
  return source.replace(/^\/\*[\s\S]*?Licensed under the Apache License[\s\S]*?\*\/\s*/i, "");
}

function normalizeIndent(source, indentValue) {
  const indent = Number.parseInt(indentValue || "0", 10);
  if (!Number.isFinite(indent) || indent <= 0) {
    return source.trim();
  }
  const prefix = " ".repeat(indent);
  return source.trim().split(/\r?\n/).map((line) => `${prefix}${line}`).join("\n");
}

function languageForFile(file, fallback = "text") {
  const extension = path.extname(file).toLowerCase().slice(1);
  return {
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
    yml: "yaml"
  }[extension] || extension || fallback;
}

function findApp(guide, appName) {
  return guide.apps.find((app) => app.name === appName) || guide.apps[0];
}

async function readVersion(guidesDirectory) {
  try {
    return (await fs.readFile(path.join(guidesDirectory, "version.txt"), "utf8")).trim();
  } catch {
    return "";
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
