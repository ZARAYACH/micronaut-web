import { splitList } from "./cli.ts";

type TagDirective = {
  kind: "tag" | "end";
  name: string;
};

type ParsedTagDirectiveLine = {
  before?: string;
  directive: TagDirective;
};

export type TaggedSourceDiagnostic = {
  reason: "empty-tag" | "missing-tag";
  tag: string;
};

export type TaggedSourceSelection = {
  diagnostics: TaggedSourceDiagnostic[];
  source: string;
};

export function extractTaggedSource(
  source: string,
  tags: string | string[] | boolean | undefined,
): string {
  return extractTaggedSourceWithDiagnostics(source, tags).source;
}

export function extractTaggedSourceWithDiagnostics(
  source: string,
  tags: string | string[] | boolean | undefined,
): TaggedSourceSelection {
  const selectedTags = splitList(tags).map(cleanTagName).filter(Boolean);
  const lines = source.replace(/\s+$/, "").split(/\r?\n/);
  if (!selectedTags.length) {
    return {
      diagnostics: [],
      source: lines
        .map((line) => lineWithoutTagDirective(line))
        .filter((line): line is string => line !== undefined)
        .join("\n")
        .trim(),
    };
  }

  const output: string[] = [];
  const diagnostics: TaggedSourceDiagnostic[] = [];
  for (const tag of selectedTags) {
    const hasExplicitEnd = lines.some((line) => {
      const parsed = parseTagDirectiveLine(line);
      return parsed?.directive.kind === "end" && parsed.directive.name === tag;
    });
    const tagOutput: string[] = [];
    let activeDepth = 0;
    let matchedStart = false;
    for (const line of lines) {
      const parsed = parseTagDirectiveLine(line);
      const directive = parsed?.directive;
      if (directive) {
        if (parsed.before !== undefined && activeDepth > 0) {
          tagOutput.push(parsed.before);
        }
        if (directive.name === tag && directive.kind === "tag") {
          matchedStart = true;
          activeDepth =
            !hasExplicitEnd && activeDepth > 0
              ? activeDepth - 1
              : activeDepth + 1;
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
    } else {
      diagnostics.push({
        reason: matchedStart ? "empty-tag" : "missing-tag",
        tag,
      });
    }
  }
  return {
    diagnostics,
    source: output.join("\n\n").trim(),
  };
}

function trimBlankLines(lines: string[]): string[] {
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

function cleanTagName(value: string): string {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function lineWithoutTagDirective(line: string): string | undefined {
  const parsed = parseTagDirectiveLine(line);
  if (!parsed) {
    return line;
  }
  return parsed.before;
}

function parseTagDirectiveLine(
  line: string,
): ParsedTagDirectiveLine | undefined {
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
  const kind = tagDirectiveKind(trailingMatch[2]);
  if (!kind) {
    return undefined;
  }
  return {
    before: trailingMatch[1],
    directive: {
      kind,
      name: trailingMatch[3],
    },
  };
}

function tagDirective(line: string): TagDirective | undefined {
  const match =
    /^(?:(?:\/\/|#|;|<!--|\/\*|\*)\s*)?(tag|end)::([^\s\[\]]+)(?:\[[^\]]*]|\])?\s*(?:-->|\*\/)?\s*$/.exec(
      line.trim(),
    );
  if (!match) {
    return undefined;
  }
  const kind = tagDirectiveKind(match[1]);
  if (!kind) {
    return undefined;
  }
  return {
    kind,
    name: match[2],
  };
}

function tagDirectiveKind(value: string): TagDirective["kind"] | undefined {
  return value === "tag" || value === "end" ? value : undefined;
}
