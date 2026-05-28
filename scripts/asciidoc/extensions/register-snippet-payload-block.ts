import type {
  Block,
  BlockProcessor,
  BlockProcessorDslInterface,
  Registry,
  Section,
} from "@asciidoctor/core";

import { renderSnippetBlock } from "./snippet-block-renderer.ts";

export function registerSnippetPayloadBlock(
  registry: Registry,
  blockName: string,
): void {
  registry.block(function registerSnippetPayloadBlock(
    this: BlockProcessorDslInterface,
  ): void {
    this.named(blockName);
    this.onContext("open");
    this.process(async function processSnippetPayloadBlock(
      this: BlockProcessor,
      parent: unknown,
      _reader: unknown,
      attrs: unknown,
    ): Promise<Block | undefined> {
      const attributes = attrs as Record<string, unknown>;
      const payload = attributes?.payload
        ? snippetPayloadFromValue(attributes.payload)
        : undefined;
      return payload
        ? renderSnippetBlock(this, parent as Block | Section, payload)
        : undefined;
    });
  });
}

function snippetPayloadFromValue(value: unknown): any {
  return JSON.parse(
    Buffer.from(String(value || ""), "base64url").toString("utf8"),
  );
}
