import type {
  Block,
  BlockProcessor,
  BlockProcessorDslInterface,
  Reader,
  Registry,
  Section,
} from "@asciidoctor/core";
import yaml from "js-yaml";
import { stringify as stringifyToml } from "smol-toml";

import { renderSnippetBlock } from "./snippet-block-renderer.ts";

export function registerConfigurationBlock(registry: Registry): void {
  registry.block(function registerConfigurationBlock(
    this: BlockProcessorDslInterface,
  ): void {
    this.named("configuration");
    this.onContext("listing");
    this.process(async function processConfigurationBlock(
      this: BlockProcessor,
      parent: unknown,
      reader: unknown,
      attrs: unknown,
    ): Promise<Block> {
      const attributes = attrs as Record<string, unknown>;
      return renderSnippetBlock(this, parent as Block | Section, {
        kind: "code",
        samples: configurationSamples(
          (await (reader as Reader).readLines()).join("\n"),
        ),
        title: String(attributes.title || ""),
      });
    });
  });
}

const GROOVY_KEYWORDS = new Set([
  "abstract",
  "as",
  "assert",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "continue",
  "def",
  "default",
  "double",
  "else",
  "enum",
  "extends",
  "false",
  "final",
  "finally",
  "float",
  "for",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "int",
  "interface",
  "long",
  "native",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "strictfp",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "transient",
  "true",
  "try",
  "void",
  "volatile",
  "while",
]);

function configurationSamples(source: any): any {
  const parsed = parseConfigurationSource(source);
  return [
    {
      language: "properties",
      highlighterLanguage: "properties",
      source: parsed === undefined ? source : toJavaProperties(parsed),
    },
    {
      language: "yaml",
      highlighterLanguage: "yaml",
      source,
    },
    {
      language: "toml",
      highlighterLanguage: "toml",
      source: parsed === undefined ? source : toTomlSource(parsed),
    },
    {
      language: "groovy-config",
      highlighterLanguage: "groovy",
      source: parsed === undefined ? source : toGroovyConfig(parsed),
    },
    {
      language: "hocon",
      highlighterLanguage: "hocon",
      source: parsed === undefined ? source : toHocon(parsed),
    },
    {
      language: "json-config",
      highlighterLanguage: "json",
      source: parsed === undefined ? source : JSON.stringify(parsed, null, 2),
    },
  ].filter((sample: any): any => sample.source.trim());
}

function parseConfigurationSource(source: any): any {
  try {
    return yaml.load(source);
  } catch {
    return undefined;
  }
}

function isPlainObject(value: any): any {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toJavaProperties(value: any): any {
  return flattenConfiguration(value)
    .map(
      ({ path: propertyPath, value: propertyValue }: any): any =>
        `${propertyPath.join(".")}=${formatPropertiesValue(propertyValue)}`,
    )
    .join("\n");
}

function flattenConfiguration(value: any, propertyPath: any = []): any {
  if (Array.isArray(value)) {
    return value.flatMap((item: any, index: any): any =>
      flattenConfiguration(item, [
        ...propertyPath.slice(0, -1),
        `${propertyPath.at(-1) || ""}[${index}]`,
      ]),
    );
  }
  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, item]: any): any =>
      flattenConfiguration(item, [...propertyPath, key]),
    );
  }
  return propertyPath.length ? [{ path: propertyPath, value }] : [];
}

function formatPropertiesValue(value: any): any {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map(formatPropertiesValue).join(",");
  }
  return String(value);
}

function toTomlSource(value: any): any {
  if (isPlainObject(value)) {
    return stringifyToml(value).trim();
  }
  return formatTomlValue(value);
}

function formatTomlValue(value: any): any {
  if (Array.isArray(value)) {
    return `[${value.map(formatTomlValue).join(", ")}]`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) {
    return '""';
  }
  return JSON.stringify(String(value));
}

function toGroovyConfig(value: any): any {
  if (!isPlainObject(value)) {
    return formatGroovyValue(value);
  }
  return Object.entries(value)
    .map(([key, item]: any): any => formatGroovyEntry(key, item, 0))
    .join("\n");
}

function formatGroovyEntry(key: any, value: any, depth: any): any {
  const indent = "  ".repeat(depth);
  const token = formatGroovyKey(key);
  if (isPlainObject(value)) {
    const children = Object.entries(value)
      .map(([childKey, child]: any): any =>
        formatGroovyEntry(childKey, child, depth + 1),
      )
      .join("\n");
    return `${indent}${token} {\n${children}\n${indent}}`;
  }
  return `${indent}${token} = ${formatGroovyValue(value)}`;
}

function formatGroovyKey(key: any): any {
  if (GROOVY_KEYWORDS.has(key) || /[^\x00-\x7F]/.test(key)) {
    return `'${String(key).replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
  }
  return String(key).replace(/-([A-Za-z0-9])/g, (_: any, char: any): any =>
    char.toUpperCase(),
  );
}

function formatGroovyValue(value: any): any {
  if (Array.isArray(value)) {
    return `[${value.map(formatGroovyValue).join(", ")}]`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) {
    return "null";
  }
  return `'${String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}

function toHocon(value: any): any {
  return formatHoconValue(value, 0);
}

function formatHoconValue(value: any, depth: any): any {
  if (Array.isArray(value)) {
    return `[${value.map((item: any): any => formatHoconValue(item, depth)).join(", ")}]`;
  }
  if (isPlainObject(value)) {
    const indent = "  ".repeat(depth);
    const childIndent = "  ".repeat(depth + 1);
    const entries = Object.entries(value).map(
      ([key, item]: any): any =>
        `${childIndent}${key} = ${formatHoconValue(item, depth + 1)}`,
    );
    return `{\n${entries.join("\n")}\n${indent}}`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) {
    return "null";
  }
  return JSON.stringify(String(value));
}
