import { splitList } from "./cli.ts";

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
