export function normalizeAsciiDocSource(source: any): any {
  let normalized = source;
  normalized = removeGeneratedConfigurationPropertyIncludes(normalized);
  normalized = normalized.replace(
    /^([ \t]*(?:include|snippet)::[^\r\n\[]+\[[^\r\n\]]*?\bindent\s*=\s*)(?:"false"|'false'|false)(?=\s*(?:,|\]))/gim,
    (_: any, prefix: any): any => `${prefix}0`,
  );
  normalized = normalized.replace(
    /(snippet::[^\[]+\[[^\]]*?\bindent\s*=\s*-?\d+)\s+(title\s*=)/gi,
    "$1, $2",
  );
  return normalized.replace(
    /^\s{4,}`([^`\r\n]+)`\s*$/gm,
    (match: any, code: any): any => {
      const value = code.trim();
      if (!looksLikeJava(value)) {
        return match;
      }
      return `\n[source,java]\n----\n${value}\n----\n`;
    },
  );
}

function removeGeneratedConfigurationPropertyIncludes(source: any): any {
  return source.replace(
    /^include::\{includedir}\/?configurationProperties\/[^\r\n\[]+\[[^\r\n\]]*]\s*$/gm,
    "",
  );
}

function looksLikeJava(code: any): any {
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
