import { parseAttributeList } from "./adoc-attributes.ts";
import { macroAttribute } from "./listing.ts";
import { snippetBlock } from "./snippet-blocks.ts";

export function expandDependencyMacrosToBlocks(source: any, context: any): any {
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

export function dependencyPayload(target: any, attrs: any, context: any): any {
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
