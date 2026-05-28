import type { Registry } from "@asciidoctor/core";

import { registerApiMacros } from "./register-api-macros.ts";
import { registerComponentFooterProcessor } from "./register-component-footer-processor.ts";
import { registerConfigurationBlock } from "./register-configuration-block.ts";
import { registerDependencyBlock } from "./register-dependency-block.ts";
import { registerDocsSourcePreprocessor } from "./register-docs-source-preprocessor.ts";
import { registerPackageMacro } from "./register-package-macro.ts";
import { registerSnippetBlock } from "./register-snippet-block.ts";
import { registerSnippetPayloadBlocks } from "./register-snippet-payload-blocks.ts";

const componentRenderingRegistries = new WeakSet<Registry>();

export function micronautExtensionRegistry(
  asciidoctor: typeof import("@asciidoctor/core"),
  context: any,
  options: { snippetSamples: any },
): Registry {
  const registry = asciidoctor.Extensions.create();
  registerDocsSourcePreprocessor(registry);
  registerApiMacros(registry, context);
  registerPackageMacro(registry, context);
  registerSnippetBlock(registry, context, options);
  registerDependencyBlock(registry, context);
  return registry;
}

export function registerComponentRenderingExtensions(
  asciidoctor: typeof import("@asciidoctor/core"),
  registry: Registry = asciidoctor.Extensions.create(),
  options: { registerSnippetPayloadBlocks?: boolean } = {},
): Registry {
  if (componentRenderingRegistries.has(registry)) {
    return registry;
  }

  if (options.registerSnippetPayloadBlocks !== false) {
    registerSnippetPayloadBlocks(registry);
  }
  registerConfigurationBlock(registry);
  registerComponentFooterProcessor(registry);
  componentRenderingRegistries.add(registry);
  return registry;
}
