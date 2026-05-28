import type { Registry } from "@asciidoctor/core";

import { registerComponentRenderingExtensions } from "../../asciidoc/extensions/index.ts";
import type { GuideRenderContext } from "../model.ts";
import { registerGuideCalloutMacro } from "./register-guide-callout-macro.ts";
import { guideCalloutLineResolver } from "./register-guide-callout-resolver.ts";
import { registerGuideContentBlocks } from "./register-guide-content-blocks.ts";
import { registerGuideDependenciesBlock } from "./register-guide-dependencies-block.ts";
import { registerGuideLinkMacro } from "./register-guide-link-macro.ts";
import { registerGuidePreprocessor } from "./register-guide-preprocessor.ts";
import { registerGuideSnippetBlocks } from "./register-guide-snippet-blocks.ts";

export function guideExtensionRegistry(
  asciidoctor: typeof import("@asciidoctor/core"),
  context: GuideRenderContext,
): Registry {
  const registry = asciidoctor.Extensions.create();
  const resolveCalloutLines = guideCalloutLineResolver(context);
  registerGuidePreprocessor(registry, context);
  registerGuideLinkMacro(registry);
  registerGuideSnippetBlocks(registry, context, resolveCalloutLines);
  registerGuideDependenciesBlock(registry, context, resolveCalloutLines);
  registerGuideCalloutMacro(registry, context);
  registerGuideContentBlocks(registry, context);
  return registerComponentRenderingExtensions(asciidoctor, registry);
}
