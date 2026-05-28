import type { Registry } from "@asciidoctor/core";

import { registerSnippetPayloadBlock } from "./register-snippet-payload-block.ts";

export function registerSnippetPayloadBlocks(registry: Registry): void {
  registerSnippetPayloadBlock(registry, "snippet");
  registerSnippetPayloadBlock(registry, "dependency");
}
