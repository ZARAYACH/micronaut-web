import type {
  Block,
  BlockProcessor,
  BlockProcessorDslInterface,
  Reader,
  Registry,
  Section,
} from "@asciidoctor/core";

import {
  renderSnippetBlockWithCalloutReader,
  type CalloutLineResolver,
} from "../../asciidoc/extensions/snippet-block-renderer.ts";
import type { GuideRenderContext } from "../model.ts";

const GUIDE_DEPENDENCIES_BLOCK = "guide-dependencies";
const GUIDE_DEPENDENCY_BLOCK = "guide-dependency";

export function registerGuideDependenciesBlock(
  registry: Registry,
  context: GuideRenderContext,
  resolveCalloutLines: CalloutLineResolver,
): void {
  registry.block(function registerGuideDependencyBlock(
    this: BlockProcessorDslInterface,
  ): void {
    this.named(GUIDE_DEPENDENCY_BLOCK);
    this.onContext("open");
    this.process(async function processGuideDependencyBlock(
      this: BlockProcessor,
      parent: unknown,
      reader: unknown,
      attrs: unknown,
    ): Promise<Block> {
      const attributes = attrs as Record<string, unknown>;
      const payload = guideMacroPayloadFromValue(attributes.payload);
      return renderGuideDependencyBlock(
        this,
        parent as Block | Section,
        reader as Reader,
        dependencySnippetPayload(
          [{ target: payload.target, attributes: payload.attributes }],
          context,
        ),
        resolveCalloutLines,
      );
    });
  });

  registry.block(function registerGuideDependenciesBlock(
    this: BlockProcessorDslInterface,
  ): void {
    this.named(GUIDE_DEPENDENCIES_BLOCK);
    this.onContext("open");
    this.process(async function processGuideDependenciesBlock(
      this: BlockProcessor,
      parent: unknown,
      reader: unknown,
      attrs: unknown,
    ): Promise<Block> {
      const attributes = attrs as Record<string, unknown>;
      const payload = guideDependencyPayloadFromValue(attributes.payload);
      return renderGuideDependencyBlock(
        this,
        parent as Block | Section,
        reader as Reader,
        dependencySnippetPayload(payload.dependencies, context),
        resolveCalloutLines,
      );
    });
  });
}

function renderGuideDependencyBlock(
  processor: BlockProcessor,
  parent: Block | Section,
  reader: Reader,
  payload: Record<string, unknown>,
  resolveCalloutLines: CalloutLineResolver,
): Promise<Block> {
  return renderSnippetBlockWithCalloutReader(
    processor,
    parent,
    payload,
    reader,
    {
      collectManualCallouts: true,
      resolveCalloutLines,
    },
  );
}

function dependencySnippetPayload(
  dependencies: { target: string; attributes: Record<string, string> }[],
  context: GuideRenderContext,
): any {
  if (!dependencies.length) {
    return missingNotePayload("Missing dependency.");
  }

  const buildTool = String(context.option.buildTool || "").toLowerCase();
  if (buildTool === "maven") {
    return {
      kind: "dependency",
      samples: [
        {
          highlighterLanguage: "xml",
          language: "maven",
          source: mavenDependencySource(dependencies, context),
        },
      ],
      title: "pom.xml",
    };
  }

  return {
    kind: "dependency",
    samples: [
      {
        highlighterLanguage: "groovy",
        language: "gradle",
        source: gradleDependencySource(dependencies, context),
      },
    ],
    title: "build.gradle",
  };
}

function gradleDependencySource(
  dependencies: { target: string; attributes: Record<string, string> }[],
  context: GuideRenderContext,
): string {
  return dependencies
    .map(({ target, attributes }): string => {
      let rendered = toGradleScope(attributes, context) || "implementation";
      if (pomDependency(attributes)) {
        rendered += " platform";
      }
      return `${rendered}("${groupId(attributes)}:${target.trim()}${attributes.version ? `:${attributes.version}` : ""}")${dependencyCalloutMarker(attributes)}`;
    })
    .join("\n");
}

function mavenDependencySource(
  dependencies: { target: string; attributes: Record<string, string> }[],
  context: GuideRenderContext,
): string {
  return dependencies
    .flatMap(({ target, attributes }): string[] => {
      const gradleScope = toGradleScope(attributes, context);
      if (gradleScope === "annotationProcessor" || gradleScope === "kapt") {
        return mavenAnnotationProcessorDependencyLines(
          target,
          attributes,
          context,
        );
      }
      return mavenDependencyLines(target, attributes);
    })
    .join("\n");
}

function mavenAnnotationProcessorDependencyLines(
  target: string,
  attributes: Record<string, string>,
  context: GuideRenderContext,
): string[] {
  const elementName =
    String(context.option.language || "").toLowerCase() === "kotlin"
      ? "annotationProcessorPath"
      : "path";
  return [
    "<!-- Add the following to your annotationProcessorPaths element -->",
    `<${elementName}>${dependencyCalloutMarker(attributes)}`,
    `    <groupId>${groupId(attributes)}</groupId>`,
    `    <artifactId>${target.trim()}</artifactId>`,
    ...versionLines(attributes, true),
    `</${elementName}>`,
  ];
}

function mavenDependencyLines(
  target: string,
  attributes: Record<string, string>,
): string[] {
  const pom = pomDependency(attributes);
  return [
    ...(pom
      ? ["<!-- Add the following to your dependencyManagement element -->"]
      : []),
    `<dependency>${dependencyCalloutMarker(attributes)}`,
    `    <groupId>${groupId(attributes)}</groupId>`,
    `    <artifactId>${target.trim()}</artifactId>`,
    ...versionLines(attributes, false),
    ...(pom
      ? ["    <type>pom</type>", "    <scope>import</scope>"]
      : [`    <scope>${toMavenScope(attributes) || "compile"}</scope>`]),
    "</dependency>",
    ...(pom ? [""] : []),
  ];
}

function versionLines(
  attributes: Record<string, string>,
  includeVersionProperty: boolean,
): string[] {
  if (attributes.version) {
    return [`    <version>${attributes.version}</version>`];
  }
  if (includeVersionProperty && attributes.versionProperty) {
    return [`    <version>${attributes.versionProperty}</version>`];
  }
  return [];
}

function groupId(attributes: Record<string, string>): string {
  return attributes.groupId || attributes.groupdId || "io.micronaut";
}

function pomDependency(attributes: Record<string, string>): boolean {
  return String(attributes.pom || "false").toLowerCase() === "true";
}

function dependencyCalloutMarker(attributes: Record<string, string>): string {
  const callout = attributes.callout;
  return callout && /^\d+$/.test(callout) ? ` // <${callout}>` : "";
}

function toMavenScope(attributes: Record<string, string>): string | undefined {
  const scope = attributes.scope;
  if (!scope) {
    return undefined;
  }
  const scopes: Record<string, string> = {
    annotationProcessor: "compile",
    api: "compile",
    compileOnly: "provided",
    implementation: "compile",
    runtimeOnly: "runtime",
    testCompile: "test",
    testImplementation: "test",
    testRuntimeOnly: "test",
  };
  return scopes[scope] || scope;
}

function toGradleScope(
  attributes: Record<string, string>,
  context: GuideRenderContext,
): string | undefined {
  const scope = attributes.scope;
  if (!scope) {
    return undefined;
  }
  const language = String(context.option.language || "").toLowerCase();
  const scopes: Record<string, string> = {
    compile: "implementation",
    provided: "developmentOnly",
    test: "testImplementation",
    testCompile: "testImplementation",
  };
  if (scope === "annotationProcessor" && language === "kotlin") {
    return "kapt";
  }
  if (scope === "annotationProcessor" && language === "groovy") {
    return "compileOnly";
  }
  return scopes[scope] || scope;
}

function missingNotePayload(message: string): any {
  return {
    kind: "code",
    samples: [
      {
        language: "text",
        source: `NOTE: ${message}`,
      },
    ],
    title: "",
  };
}

function guideMacroPayloadFromValue(value: unknown): {
  attributes: Record<string, string>;
  target: string;
} {
  return JSON.parse(
    Buffer.from(String(value || ""), "base64url").toString("utf8"),
  );
}

function guideDependencyPayloadFromValue(value: unknown): {
  dependencies: { attributes: Record<string, string>; target: string }[];
} {
  return JSON.parse(
    Buffer.from(String(value || ""), "base64url").toString("utf8"),
  );
}
