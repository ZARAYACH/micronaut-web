import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { splitList } from "./cli.ts";
import { macroAttribute } from "./listing.ts";
import { snippetMarkerHtml } from "./snippet-markers.ts";

export function snippetBlocksHtml(target: any, attrs: any, context: any): any {
  const samples = [];
  for (const snippetTarget of splitList(target)) {
    samples.push(...findSnippetSamplesSync(snippetTarget, attrs, context));
  }
  const deduped = dedupeSamples(samples);
  if (!deduped.length) {
    return "";
  }
  return snippetMarkerHtml("code", {
    title: macroAttribute(attrs, "title") || "",
    description: macroAttribute(attrs, "description") || "",
    samples: deduped.map((sample: any): any => ({
      language: sample.language,
      source: sample.source,
    })),
  });
}

function findSnippetSamplesSync(target: any, attrs: any, context: any): any {
  const baseDirectories = snippetBaseDirectoriesSync(attrs, context);
  const sources = macroAttribute(attrs, "source")
    ? [macroAttribute(attrs, "source")]
    : ["test", "main"];
  const explicit = explicitSnippetLanguage(target);
  const languages = explicit ? [explicit] : languagesToRender(context);
  const samples = [];
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
        let source = readFileSync(file, "utf8");
        source = extractTaggedSource(
          source,
          macroAttribute(attrs, "tags") || macroAttribute(attrs, "tag") || "",
        );
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
  return samples;
}

function languagesToRender(context: any): any {
  const defaultLanguage = context.attributes["default-language"];
  const languages = [
    ["java", "java"],
    ["python", "py"],
    ["kotlin", "kt"],
    ["groovy", "groovy"],
  ];
  return defaultLanguage
    ? languages.filter(([language]: any): any => language === defaultLanguage)
    : languages;
}

function explicitSnippetLanguage(target: any): any {
  if (target.endsWith(".java")) return ["java", "java"];
  if (target.endsWith(".py")) return ["python", "py"];
  if (target.endsWith(".kt")) return ["kotlin", "kt"];
  if (target.endsWith(".groovy")) return ["groovy", "groovy"];
  return undefined;
}

function snippetPathTarget(target: any, extension: any): any {
  const suffix = `.${extension}`;
  const normalized = target.endsWith(suffix)
    ? target.slice(0, -suffix.length)
    : target;
  return normalized.replaceAll(".", path.sep);
}

function snippetBaseDirectoriesSync(attrs: any, context: any): any {
  const project = macroAttribute(attrs, "project");
  if (project) {
    return [path.join(context.submoduleDirectory, project)];
  }
  const projectBase = macroAttribute(attrs, "project-base");
  if (projectBase) {
    const requested = path.join(context.submoduleDirectory, projectBase);
    const directories = [];
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

function sortSnippetDirectories(directories: any): any {
  const rank = (value: any): any => {
    if (value.endsWith("-java")) return 0;
    if (value.endsWith("-python")) return 1;
    if (value.endsWith("-kotlin")) return 2;
    if (value.endsWith("-kotlin-ksp")) return 3;
    if (value.endsWith("-groovy")) return 4;
    return 5;
  };
  return directories.sort(
    (left: any, right: any): any =>
      rank(left) - rank(right) || left.localeCompare(right),
  );
}

export function extractTaggedSource(source: any, tags: any): any {
  const selectedTags = splitList(tags).map(cleanTagName).filter(Boolean);
  const lines = source.replace(/\s+$/, "").split(/\r?\n/);
  if (!selectedTags.length) {
    return lines
      .map((line: any): any => lineWithoutTagDirective(line))
      .filter((line: any): any => line !== undefined)
      .join("\n")
      .trim();
  }

  const output = [];
  for (const tag of selectedTags) {
    const tagOutput = [];
    let activeDepth = 0;
    for (const line of lines) {
      const parsed = parseTagDirectiveLine(line);
      const directive = parsed?.directive;
      if (directive) {
        if (parsed.before !== undefined && activeDepth > 0) {
          tagOutput.push(parsed.before);
        }
        if (directive.name === tag && directive.kind === "tag") {
          activeDepth += 1;
        } else if (
          directive.name === tag &&
          directive.kind === "end" &&
          activeDepth > 0
        ) {
          activeDepth -= 1;
        }
        continue;
      }
      if (activeDepth > 0) {
        tagOutput.push(line);
      }
    }
    const selected = trimBlankLines(tagOutput).join("\n");
    if (selected.trim()) {
      output.push(selected);
    }
  }
  return output.join("\n\n").trim();
}

function trimBlankLines(lines: any): any {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start].trim()) {
    start += 1;
  }
  while (end > start && !lines[end - 1].trim()) {
    end -= 1;
  }
  return lines.slice(start, end);
}

function cleanTagName(value: any): any {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function lineWithoutTagDirective(line: any): any {
  const parsed = parseTagDirectiveLine(line);
  if (!parsed) {
    return line;
  }
  return parsed.before;
}

function parseTagDirectiveLine(line: any): any {
  const directive = tagDirective(line);
  if (directive) {
    return { directive };
  }

  const trailingMatch =
    /^(.*?)(?:[ \t]+)(?:(?:\/\/|#|;|<!--|\/\*)\s*)(tag|end)::([^\s\[\]]+)(?:\[[^\]]*]|\])?\s*(?:-->|\*\/)?\s*$/.exec(
      line,
    );
  if (!trailingMatch) {
    return undefined;
  }
  return {
    before: trailingMatch[1],
    directive: {
      kind: trailingMatch[2],
      name: trailingMatch[3],
    },
  };
}

function tagDirective(line: any): any {
  const match =
    /^(?:(?:\/\/|#|;|<!--|\/\*|\*)\s*)?(tag|end)::([^\s\[\]]+)(?:\[[^\]]*]|\])?\s*(?:-->|\*\/)?\s*$/.exec(
      line.trim(),
    );
  if (!match) {
    return undefined;
  }
  return {
    kind: match[1],
    name: match[2],
  };
}

function normalizeSnippetIndent(source: any, indentValue: any): any {
  const lines = source.replace(/\s+$/, "").split(/\r?\n/);
  const nonBlank = lines.filter((line: any): any => line.trim());
  const commonIndent = nonBlank.length
    ? Math.min(
        ...nonBlank.map(
          (line: any): any =>
            line.match(/^[ \t]*/)[0].replaceAll("\t", "    ").length,
        ),
      )
    : 0;
  const indent = Number.parseInt(indentValue || "0", 10);
  const prefix =
    Number.isFinite(indent) && indent > 0 ? " ".repeat(indent) : "";
  return lines
    .map(
      (line: any): any =>
        prefix + line.slice(Math.min(commonIndent, line.length)),
    )
    .join("\n");
}

function dedupeSamples(samples: any): any {
  const seen = new Set();
  return samples.filter((sample: any): any => {
    const key = `${sample.language}:${sample.source}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
