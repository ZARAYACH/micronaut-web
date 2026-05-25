const languageAliases: Record<string, string> = {
  bash: "bash",
  cmd: "bash",
  commandline: "bash",
  console: "bash",
  plaintext: "text",
  pom: "xml",
  props: "properties",
  property: "properties",
  sh: "bash",
  shell: "bash",
  shellscript: "bash",
  txt: "text",
  yml: "yaml",
  zsh: "bash"
};

const highlighterLanguageAliases: Record<string, string> = {
  bash: "shellscript",
  conf: "properties",
  gradle: "groovy",
  hocon: "properties",
  maven: "xml",
  properties: "properties",
  xml: "xml"
};

const languageLabels: Record<string, string> = {
  bash: "Bash",
  gradle: "Gradle",
  groovy: "Groovy",
  hocon: "HOCON",
  java: "Java",
  json: "JSON",
  kotlin: "Kotlin",
  maven: "Maven",
  properties: "Properties",
  text: "Text",
  toml: "TOML",
  xml: "XML",
  yaml: "YAML"
};

export function codeLanguageFromFenceInfo(info: string, source: string, context = "Markdown code block") {
  const value = info.trim();
  if (!value) {
    return inferCodeLanguage(source);
  }
  if (/\s/.test(value)) {
    throw new Error(`${context} uses nonstandard fence metadata "${value}". Use only the language name.`);
  }
  return normalizeCodeLanguage(value);
}

export function normalizeCodeLanguage(language: string) {
  const normalized = String(language || "text").trim().toLowerCase();
  return languageAliases[normalized] || normalized || "text";
}

export function highlighterLanguageFor(language: string) {
  const normalized = normalizeCodeLanguage(language);
  return highlighterLanguageAliases[normalized] || normalized || "text";
}

export function formatCodeLanguage(language: string) {
  const normalized = normalizeCodeLanguage(language);
  return languageLabels[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function inferCodeLanguage(source: string) {
  const value = source.trim();
  if (!value) {
    return "text";
  }
  if (/^<\?xml\b|^<\/?[A-Za-z][\s\S]*>$|<(?:dependency|parent|properties|path|plugin|groupId)\b/.test(value)) {
    return "xml";
  }
  if (/^(?:plugins|dependencies|micronaut|java)\s*\{|(?:implementation|runtimeOnly|annotationProcessor|compileOnly|testImplementation)\s*\(|\bid\(["'][^"']+["']\)\s+version\b/.test(value)) {
    return "gradle";
  }
  if (/\bfun\s+\w+\s*\(|\blateinit\s+var\b|\bdata\s+class\s+\w+|\bclass\s+\w+\s*\(|\bval\s+\w+\s*=/.test(value)) {
    return "kotlin";
  }
  if (/\bdef\s+\w+\s*=|class\s+\w+\s+extends\s+Specification\b|void\s+['"][^'"]+['"]\s*\(|\[[A-Za-z_][\w-]*\s*:/.test(value)) {
    return "groovy";
  }
  if (/^(?:package|import)\s+(?:jakarta|javax|io|java|org)\.|public\s+(?:class|record|interface|enum)\b|@\w+(?:\(|\s|$)/m.test(value)) {
    return "java";
  }
  if (/^(?:curl|source|sdk|mn|mvn|gradle|\.\/gradlew|docker|git)\b|^\$ /m.test(value)) {
    return "bash";
  }
  if (/^[A-Za-z0-9_.-]+\s*=\s*.+$/m.test(value)) {
    return "properties";
  }
  if (/^[A-Za-z0-9_.-]+:\s+.+$/m.test(value)) {
    return "yaml";
  }
  if (/^[\[{][\s\S]*[\]}]$/.test(value)) {
    return "json";
  }
  return "text";
}
