import type { Registry } from "@asciidoctor/core";

import type { SnippetRenderState } from "../component-renderer.ts";
import { DEPENDENCY_BLOCK, SNIPPET_BLOCK } from "../snippet-payloads.ts";
import { registerSnippetPayloadBlock } from "./register-snippet-payload-block.ts";

export function registerSnippetPayloadBlocks(
  registry: Registry,
  renderState: SnippetRenderState,
): void {
  registerSnippetPayloadBlock(registry, SNIPPET_BLOCK, renderState);
  registerSnippetPayloadBlock(registry, DEPENDENCY_BLOCK, renderState);
}
