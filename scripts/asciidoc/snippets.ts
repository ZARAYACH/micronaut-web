import { splitList } from "../shared/cli.ts";
import { parseAttributeList } from "./adoc-attributes.ts";
import { macroAttribute } from "./listing.ts";
import { snippetBlock } from "./snippet-blocks.ts";

export function expandSnippetMacrosToBlocks(
  source: any,
  context: any,
  resolveSamples: any,
): any {
  const lines = source.split(/\r?\n/);
  const output = [];
  let delimiter: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (delimiter) {
      output.push(line);
      if (trimmed === delimiter) {
        delimiter = undefined;
      }
      continue;
    }

    const delimiterMatch = /^(-{4,}|\.{4,}|\+{4,}|_{4,})$/.exec(trimmed);
    if (delimiterMatch) {
      delimiter = delimiterMatch[1];
      output.push(line);
      continue;
    }

    const macroMatch = /^snippet::([^\[]+)\[(.*)]\s*$/.exec(line);
    if (!macroMatch) {
      output.push(line);
      continue;
    }

    const attrs = parseAttributeList(macroMatch[2], {
      includeText: true,
      positionalKey: "$positional",
    });
    const samples = snippetSamples(
      macroMatch[1],
      attrs,
      context,
      resolveSamples,
    );
    if (!samples.length) {
      output.push(line);
      continue;
    }

    output.push(
      snippetBlock("code", {
        title: macroAttribute(attrs, "title") || "",
        description: macroAttribute(attrs, "description") || "",
        samples,
      }),
    );
  }

  return output.join("\n");
}

export function normalizeSnippetIndent(source: any, indentValue: any): any {
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

function snippetSamples(
  target: any,
  attrs: any,
  context: any,
  resolveSamples: any,
): any {
  const samples = [];
  for (const snippetTarget of splitList(target)) {
    const targetSamples = resolveSamples(snippetTarget, attrs, context);
    samples.push(
      ...targetSamples.map((sample: any): any => ({
        ...sample,
        group: sample.group || snippetTarget,
      })),
    );
  }
  return dedupeSamples(samples);
}

function dedupeSamples(samples: any): any {
  const seen = new Set();
  return samples.filter((sample: any): any => {
    const key = `${sample.group || ""}:${sample.language}:${sample.source}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
