import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  extractTaggedSourceWithDiagnostics,
  type TaggedSourceDiagnostic,
} from "../shared/tagged-source.ts";
import type { Properties } from "./project-manifest.ts";

type MacroAttributes = Record<string, unknown> & {
  text?: unknown;
  $positional?: unknown;
};

type SnippetContext = {
  submoduleDirectory: string;
  attributes: Properties;
};

type SnippetLanguage = [language: string, extension: string];

type SnippetSample = {
  language: string;
  source: string;
};

export function docsSnippetSamples(
  target: string,
  attrs: MacroAttributes,
  context: SnippetContext,
): SnippetSample[] {
  const baseDirectories = snippetBaseDirectoriesSync(attrs, context);
  const source = macroAttribute(attrs, "source");
  const sources = source ? [source] : ["test", "main"];
  const explicit = explicitSnippetLanguage(target);
  const languages = explicit ? [explicit] : languagesToRender(context);
  const samples: SnippetSample[] = [];
  let matchedFiles = 0;
  for (const baseDirectory of baseDirectories) {
    for (const sourceSet of sources) {
      for (const [language, extension] of languages) {
        const file = path.join(
          baseDirectory,
          "src",
          sourceSet,
          language,
          `${snippetPathTarget(target, extension)}.${extension}`,
        );
        if (!existsSync(file) || !statSync(file).isFile()) {
          continue;
        }
        matchedFiles += 1;
        let source = readFileSync(file, "utf8");
        const taggedSource = extractTaggedSourceWithDiagnostics(
          source,
          macroAttribute(attrs, "tags") || macroAttribute(attrs, "tag") || "",
        );
        if (taggedSource.diagnostics.length) {
          samples.push({
            language,
            source: taggedSourceDiagnosticNote(
              taggedSource.diagnostics,
              file,
              context,
            ),
          });
          continue;
        }
        source = taggedSource.source;
        source = normalizeSnippetIndent(
          source,
          macroAttribute(attrs, "indent"),
        );
        if (source.trim()) {
          samples.push({ language, source });
        }
      }
    }
  }
  if (!matchedFiles) {
    samples.push({
      language: "text",
      source: `NOTE: Missing snippet source \`${target.trim()}\`.`,
    });
  }
  return samples;
}

function taggedSourceDiagnosticNote(
  diagnostics: TaggedSourceDiagnostic[],
  file: string,
  context: SnippetContext,
): string {
  const missingTags = diagnostics
    .filter((diagnostic) => diagnostic.reason === "missing-tag")
    .map((diagnostic) => diagnostic.tag);
  const emptyTags = diagnostics
    .filter((diagnostic) => diagnostic.reason === "empty-tag")
    .map((diagnostic) => diagnostic.tag);
  return `NOTE: ${[
    missingTags.length
      ? `Missing ${tagNoun(missingTags)} ${formatTags(missingTags)}`
      : "",
    emptyTags.length
      ? `Empty ${tagNoun(emptyTags)} ${formatTags(emptyTags)}`
      : "",
  ]
    .filter(Boolean)
    .join("; ")} in \`${relativeSnippetFile(file, context)}\`.`;
}

function tagNoun(tags: string[]): string {
  return tags.length === 1 ? "tag" : "tags";
}

function formatTags(tags: string[]): string {
  return tags.map((tag) => `\`${tag}\``).join(", ");
}

function relativeSnippetFile(file: string, context: SnippetContext): string {
  return path
    .relative(context.submoduleDirectory, file)
    .replaceAll(path.sep, "/");
}

function languagesToRender(context: SnippetContext): SnippetLanguage[] {
  const defaultLanguage = context.attributes["default-language"];
  const languages: SnippetLanguage[] = [
    ["java", "java"],
    ["python", "py"],
    ["kotlin", "kt"],
    ["groovy", "groovy"],
  ];
  return defaultLanguage
    ? languages.filter(([language]) => language === defaultLanguage)
    : languages;
}

function explicitSnippetLanguage(target: string): SnippetLanguage | undefined {
  if (target.endsWith(".java")) return ["java", "java"];
  if (target.endsWith(".py")) return ["python", "py"];
  if (target.endsWith(".kt")) return ["kotlin", "kt"];
  if (target.endsWith(".groovy")) return ["groovy", "groovy"];
  return undefined;
}

function snippetPathTarget(target: string, extension: string): string {
  const suffix = `.${extension}`;
  const normalized = target.endsWith(suffix)
    ? target.slice(0, -suffix.length)
    : target;
  return normalized.replaceAll(".", path.sep);
}

function snippetBaseDirectoriesSync(
  attrs: MacroAttributes,
  context: SnippetContext,
): string[] {
  const project = macroAttribute(attrs, "project");
  if (project) {
    return [path.join(context.submoduleDirectory, project)];
  }
  const projectBase = macroAttribute(attrs, "project-base");
  if (projectBase) {
    const requested = path.join(context.submoduleDirectory, projectBase);
    const directories: string[] = [];
    if (existsSync(requested) && statSync(requested).isDirectory()) {
      directories.push(requested);
    }
    const parent = path.dirname(requested);
    const baseName = path.basename(requested);
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith(`${baseName}-`)) {
        directories.push(path.join(parent, entry.name));
      }
    }
    return sortSnippetDirectories([...new Set(directories)]);
  }
  return [
    path.join(context.submoduleDirectory, "test-suite"),
    path.join(context.submoduleDirectory, "test-suite-python"),
    path.join(context.submoduleDirectory, "test-suite-kotlin"),
    path.join(context.submoduleDirectory, "test-suite-groovy"),
    context.submoduleDirectory,
  ];
}

function sortSnippetDirectories(directories: string[]): string[] {
  const rank = (value: string): number => {
    if (value.endsWith("-java")) return 0;
    if (value.endsWith("-python")) return 1;
    if (value.endsWith("-kotlin")) return 2;
    if (value.endsWith("-kotlin-ksp")) return 3;
    if (value.endsWith("-groovy")) return 4;
    return 5;
  };
  return directories.sort(
    (left, right) => rank(left) - rank(right) || left.localeCompare(right),
  );
}

function normalizeSnippetIndent(
  source: string,
  indentValue: string | undefined,
): string {
  const lines = source.replace(/\s+$/, "").split(/\r?\n/);
  const nonBlank = lines.filter((line) => line.trim());
  const commonIndent = nonBlank.length
    ? Math.min(
        ...nonBlank.map(
          (line) =>
            (line.match(/^[ \t]*/)?.[0] ?? "").replaceAll("\t", "    ").length,
        ),
      )
    : 0;
  const indent = Number.parseInt(indentValue || "0", 10);
  const prefix =
    Number.isFinite(indent) && indent > 0 ? " ".repeat(indent) : "";
  return lines
    .map((line) => prefix + line.slice(Math.min(commonIndent, line.length)))
    .join("\n");
}

function macroAttribute(
  attrs: MacroAttributes | undefined,
  name: string,
): string | undefined {
  if (attrs?.[name] !== undefined) {
    return cleanMacroAttributeValue(String(attrs[name]), name);
  }
  const positional = Array.isArray(attrs?.$positional)
    ? attrs.$positional.join(",")
    : undefined;
  const text = attrs?.text || positional;
  if (typeof text === "string") {
    const match = new RegExp(
      `(?:^|,)\\s*${escapeRegExp(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^,]+))`,
    ).exec(text);
    if (match) {
      return cleanMacroAttributeValue(
        (match[1] ?? match[2] ?? match[3] ?? "").trim(),
        name,
      );
    }
  }
  return undefined;
}

function cleanMacroAttributeValue(value: string, name: string): string {
  if (name !== "title") {
    return value;
  }
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && !trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && !trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1);
  }
  if (
    (!trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (!trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
