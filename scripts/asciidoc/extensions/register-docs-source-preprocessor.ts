import type {
  DocumentProcessorDslInterface,
  Reader,
  Registry,
} from "@asciidoctor/core";

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

export function registerDocsSourcePreprocessor(registry: Registry): void {
  registry.preprocessor(function registerDocsSourcePreprocessor(
    this: DocumentProcessorDslInterface,
  ): void {
    this.process(function processDocsSourcePreprocessor(
      document: unknown,
      reader: unknown,
    ): Reader {
      const sourceReader = reader as ConstructableReader;
      return new sourceReader.constructor(
        document,
        rewriteDocsSource(sourceReader.lines.join("\n")).split(/\r?\n/),
        sourceReader.cursor,
        {},
      );
    });
  });
}

function rewriteDocsSource(source: string): string {
  let normalized = source;
  normalized = removeGeneratedConfigurationPropertyIncludes(normalized);
  normalized = normalized.replace(
    /^([ \t]*(?:include|snippet)::[^\r\n\[]+\[[^\r\n\]]*?\bindent\s*=\s*)(?:"false"|'false'|false)(?=\s*(?:,|\]))/gim,
    (_match: string, prefix: string): string => `${prefix}0`,
  );
  normalized = normalized.replace(
    /(snippet::[^\[]+\[[^\]]*?\bindent\s*=\s*-?\d+)\s+(title\s*=)/gi,
    "$1, $2",
  );
  normalized = normalized.replace(
    /^[ \t]{4,}(\[source,[^\]\r\n]+])\s*\r?\n(?=----\s*$)/gim,
    "$1\n",
  );
  return normalized.replace(
    /^\s{4,}`([^`\r\n]+)`\s*$/gm,
    (match: string, code: string): string => {
      const value = code.trim();
      if (!looksLikeJava(value)) {
        return match;
      }
      return `\n[source,java]\n----\n${value}\n----\n`;
    },
  );
}

function removeGeneratedConfigurationPropertyIncludes(source: string): string {
  return source.replace(
    /^include::\{includedir}\/?configurationProperties\/[^\r\n\[]+\[[^\r\n\]]*]\s*$/gm,
    "",
  );
}

function looksLikeJava(code: string): boolean {
  return (
    code.startsWith("@") ||
    code.includes(" public ") ||
    code.startsWith("public ") ||
    code.startsWith("protected ") ||
    code.startsWith("private ") ||
    code.startsWith("class ") ||
    code.startsWith("interface ") ||
    code.startsWith("enum ") ||
    code.startsWith("record ")
  );
}
