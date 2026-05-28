import type { Registry } from "@asciidoctor/core";

import { snippetRenderState } from "../component-renderer.ts";
import { registerApiMacros } from "./register-api-macros.ts";
import { registerComponentFooterProcessor } from "./register-component-footer-processor.ts";
import { registerConfigurationBlock } from "./register-configuration-block.ts";
import { registerDependencyBlock } from "./register-dependency-block.ts";
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
  const renderState = snippetRenderState(registry);
  registerApiMacros(registry, context);
  registerPackageMacro(registry, context);
  registerSnippetBlock(registry, context, options, renderState);
  registerDependencyBlock(registry, context, renderState);
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

  const renderState = snippetRenderState(registry);
  if (options.registerSnippetPayloadBlocks !== false) {
    registerSnippetPayloadBlocks(registry, renderState);
  }
  registerConfigurationBlock(registry, renderState);
  registerComponentFooterProcessor(registry);
  componentRenderingRegistries.add(registry);
  return registry;
}
