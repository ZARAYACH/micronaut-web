import type {
  Block,
  BlockProcessor,
  BlockProcessorDslInterface,
  DocumentProcessorDslInterface,
  Reader,
  Registry,
  Section,
} from "@asciidoctor/core";

import { renderSnippetBlock } from "./snippet-block-renderer.ts";

const DEPENDENCY_BLOCK = "dependency";
const SNIPPET_CALLOUT_VALIDATION_CLASS = "docs-snippet-callout-validation";

export function registerDependencyBlock(
  registry: Registry,
  context: any,
): void {
  registry.preprocessor(function registerDependencyMacroPreprocessor(
    this: DocumentProcessorDslInterface,
  ): void {
    this.process(function processDependencyMacroPreprocessor(
      document: unknown,
      reader: unknown,
    ): Reader {
      const sourceReader = reader as Reader;
      return new (sourceReader as any).constructor(
        document,
        rewriteDependencyMacrosForExtension(
          sourceReader.lines.join("\n"),
          context,
        ).split(/\r?\n/),
        sourceReader.cursor,
        {},
      );
    });
  });

  registry.block(function registerDependencyBlock(
    this: BlockProcessorDslInterface,
  ): void {
    this.named(DEPENDENCY_BLOCK);
    this.onContext("open");
    this.process(async function processDependencyBlock(
      this: BlockProcessor,
      parent: unknown,
      _reader: unknown,
      attrs: unknown,
    ): Promise<Block | undefined> {
      const attributes = attrs as Record<string, unknown>;
      const blockParent = parent as Block | Section;
      if (attributes?.payload) {
        return renderSnippetBlock(
          this,
          blockParent,
          snippetPayloadFromValue(attributes.payload),
        );
      }
      return renderSnippetBlock(this, blockParent, {
        ...dependencyPayload(blockTarget(attributes), attributes, context),
        kind: "dependency",
      });
    });
  });
}

function rewriteDependencyMacrosForExtension(source: any, context: any): any {
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

    const macroMatch = /^dependency:([^\[]+)\[(.*)]\s*$/.exec(line);
    if (!macroMatch) {
      output.push(line);
      continue;
    }

    const attrs = parseAttributeList(macroMatch[2], {
      includeText: true,
      positionalKey: "$positional",
    });
    output.push(
      snippetBlock("dependency", {
        ...dependencyPayload(macroMatch[1], attrs, context),
        kind: "dependency",
      }),
    );
  }

  return output.join("\n");
}

function blockTarget(attrs: Record<string, unknown>): string {
  const positional = Array.isArray(attrs._positional) ? attrs._positional : [];
  const dollarPositional = Array.isArray(attrs.$positional)
    ? attrs.$positional
    : [];
  return String(
    attrs?.target ||
      attrs?.name ||
      attrs?.[2] ||
      positional[0] ||
      dollarPositional[0] ||
      "",
  );
}

function snippetBlock(kind: string, payload: any): string {
  return snippetBlockLines(kind, payload, {
    surroundWithBlankLines: false,
  }).join("\n");
}

function snippetBlockLines(
  kind: string,
  payload: any,
  options: { surroundWithBlankLines?: boolean } = {},
): string[] {
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

function snippetBlockAttributeLine(kind: string, payload: any): string {
  return `[${kind === DEPENDENCY_BLOCK ? DEPENDENCY_BLOCK : "snippet"},payload=${encodePayload(
    {
      ...payload,
      kind,
    },
  )}]`;
}

function snippetPayloadFromValue(value: unknown): any {
  return JSON.parse(
    Buffer.from(String(value || ""), "base64url").toString("utf8"),
  );
}

function encodePayload(payload: any): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function snippetCalloutValidationLines(samples: any): string[] {
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

function snippetSourceHasCallouts(source: any): boolean {
  return /<\d+>|<!--\d+-->/.test(String(source || ""));
}

function sourceBlockDelimiter(source: any): string {
  const longestHyphenRun = Math.max(
    3,
    ...Array.from(String(source).matchAll(/^-{4,}$/gm)).map(
      (match: any): any => match[0].length,
    ),
  );
  return "-".repeat(longestHyphenRun + 1);
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

function macroAttribute(attrs: any, name: string): any {
  if (attrs?.[name] !== undefined) {
    return cleanMacroAttributeValue(String(attrs[name]), name);
  }
  const text = attrs?.text || attrs?.$positional?.join(",");
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

function dependencyPayload(target: any, attrs: any, context: any): any {
  const dependency = dependencyForTargetAndAttributes(
    target.trim(),
    attrs,
    context,
  );
  const gradle = gradleDependency(dependency);
  const maven = mavenDependency(dependency);
  return {
    title: dependency.title,
    description: dependency.description,
    samples: [
      {
        language: "gradle",
        highlighterLanguage: "gradle",
        source: gradle,
      },
      {
        language: "maven",
        highlighterLanguage: "maven",
        source: maven,
      },
    ],
  };
}

function dependencyForTargetAndAttributes(
  target: any,
  attrs: any,
  context: any,
): any {
  let groupId;
  let artifactId;
  let version;
  const groupAttribute =
    macroAttribute(attrs, "groupId") ||
    macroAttribute(attrs, "group") ||
    context.attributes.projectGroup;

  if (target.includes(":")) {
    const tokens = target.split(":");
    groupId = tokens[0] || "io.micronaut";
    artifactId = tokens[1];
    version =
      tokens.length === 3 ? tokens[2] : macroAttribute(attrs, "version");
  } else {
    groupId = groupAttribute || "io.micronaut";
    artifactId =
      target.startsWith("micronaut-") || !groupId.startsWith("io.micronaut.")
        ? target
        : `micronaut-${target}`;
    version = macroAttribute(attrs, "version");
  }

  return {
    groupId,
    artifactId,
    version,
    classifier: macroAttribute(attrs, "classifier"),
    gradleScope:
      macroAttribute(attrs, "gradleScope") ||
      toGradleScope(attrs) ||
      "implementation",
    mavenScope:
      macroAttribute(attrs, "mavenScope") || toMavenScope(attrs) || "compile",
    title: macroAttribute(attrs, "title") || "",
    description: macroAttribute(attrs, "description") || "",
  };
}

function toMavenScope(attrs: any): any {
  const scope = macroAttribute(attrs, "scope");
  if (!scope) {
    return "";
  }
  const scopes: Record<string, string> = {
    api: "compile",
    implementation: "compile",
    testCompile: "test",
    testRuntime: "test",
    testRuntimeOnly: "test",
    testImplementation: "test",
    developmentOnly: "provided",
    compileOnly: "provided",
    runtimeOnly: "runtime",
  };
  return scopes[scope] || scope;
}

function toGradleScope(attrs: any): any {
  const scope = macroAttribute(attrs, "scope");
  if (!scope) {
    return "";
  }
  const scopes: Record<string, string> = {
    compile: "implementation",
    testCompile: "testImplementation",
    test: "testImplementation",
    runtime: "runtimeOnly",
    provided: "developmentOnly",
  };
  return scopes[scope] || scope;
}

function gradleDependency(dependency: any): any {
  const gav = `${dependency.groupId}:${dependency.artifactId}${dependency.version !== undefined || dependency.classifier !== undefined ? ":" : ""}${dependency.version || ""}${dependency.classifier !== undefined ? `:${dependency.classifier}` : ""}`;
  return `${dependency.gradleScope}("${gav}")`;
}

function mavenDependency(dependency: any): any {
  if (dependency.mavenScope === "annotationProcessor") {
    return `<annotationProcessorPaths>
    <path>
        <groupId>${dependency.groupId}</groupId>
        <artifactId>${dependency.artifactId}</artifactId>${dependency.version ? `\n        <version>${dependency.version}</version>` : ""}${dependency.classifier ? `\n        <classifier>${dependency.classifier}</classifier>` : ""}
    </path>
</annotationProcessorPaths>`;
  }
  return `<dependency>
    <groupId>${dependency.groupId}</groupId>
    <artifactId>${dependency.artifactId}</artifactId>${dependency.version ? `\n    <version>${dependency.version}</version>` : ""}${dependency.mavenScope && dependency.mavenScope !== "compile" ? `\n    <scope>${dependency.mavenScope}</scope>` : ""}${dependency.classifier ? `\n    <classifier>${dependency.classifier}</classifier>` : ""}
</dependency>`;
}
