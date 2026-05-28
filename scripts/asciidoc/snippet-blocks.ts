import { snippetBlockAttributeLine } from "./snippet-payloads.ts";

export const SNIPPET_CALLOUT_VALIDATION_CLASS =
  "docs-snippet-callout-validation";

export function snippetBlock(kind: any, payload: any): any {
  return snippetBlockLines(kind, payload, {
    surroundWithBlankLines: false,
  }).join("\n");
}

export function snippetBlockLines(
  kind: any,
  payload: any,
  options: { surroundWithBlankLines?: boolean } = {},
): any {
  const normalized = normalizeSnippetPayload(payload);
  const lines = [];
  if (options.surroundWithBlankLines !== false) {
    lines.push("");
  }
  lines.push(snippetBlockAttributeLine(kind, normalized));
  lines.push("--");
  lines.push("--");
  lines.push(...snippetCalloutValidationLines(normalized.samples));
  if (options.surroundWithBlankLines !== false) {
    lines.push("");
  }
  return lines;
}

export function snippetCalloutValidationLines(samples: any): any {
  const source = (Array.isArray(samples) ? samples : [])
    .map((sample: any): any => sample.source || "")
    .filter((sampleSource: any): any => snippetSourceHasCallouts(sampleSource))
    .join("\n");
  if (!source) {
    return [];
  }
  const delimiter = sourceBlockDelimiter(source);
  return [
    `[.${SNIPPET_CALLOUT_VALIDATION_CLASS}]`,
    delimiter,
    source,
    delimiter,
  ];
}

function normalizeSnippetPayload(payload: any): any {
  return {
    ...payload,
    description: payload?.description || "",
    samples: normalizeSnippetSamples(payload?.samples),
    title: payload?.title || "",
  };
}

function normalizeSnippetSamples(samples: any): any {
  return (Array.isArray(samples) ? samples : []).map((sample: any): any => {
    const normalized: any = {
      language: sample.language || "text",
      source: String(sample.source || "").trimEnd(),
    };
    if (sample.group) {
      normalized.group = String(sample.group);
    }
    if (sample.highlighterLanguage) {
      normalized.highlighterLanguage = sample.highlighterLanguage;
    }
    return normalized;
  });
}

function snippetSourceHasCallouts(source: any): any {
  return /<\d+>|<!--\d+-->/.test(String(source || ""));
}

function sourceBlockDelimiter(source: any): any {
  const longestHyphenRun = Math.max(
    3,
    ...Array.from(String(source).matchAll(/^-{4,}$/gm)).map(
      (match: any): any => match[0].length,
    ),
  );
  return "-".repeat(longestHyphenRun + 1);
}
