import type {
  Block,
  BlockProcessor,
  BlockProcessorDslInterface,
  Reader,
  Registry,
  Section,
} from "@asciidoctor/core";

import { renderSnippetBlockWithCalloutReader } from "../../asciidoc/component-renderer.ts";
import type { SnippetRenderState } from "../../asciidoc/component-renderer.ts";
import { guideMacroPayloadFromValue } from "../guide-blocks.ts";

type GuideSnippetPayloadResolver = (
  payload: ReturnType<typeof guideMacroPayloadFromValue>,
) => Promise<Record<string, unknown>>;

export function registerGuideSnippetBlock(
  registry: Registry,
  blockName: string,
  resolvePayload: GuideSnippetPayloadResolver,
  renderState: SnippetRenderState,
): void {
  registry.block(function registerGuideSnippetBlock(
    this: BlockProcessorDslInterface,
  ): void {
    this.named(blockName);
    this.onContext("open");
    this.process(async function processGuideSnippetBlock(
      this: BlockProcessor,
      parent: unknown,
      reader: unknown,
      attrs: unknown,
    ): Promise<Block> {
      const attributes = attrs as Record<string, unknown>;
      return renderSnippetBlockWithCalloutReader(
        this,
        parent as Block | Section,
        await resolvePayload(guideMacroPayloadFromValue(attributes.payload)),
        renderState,
        reader as Reader,
        { collectManualCallouts: true },
      );
    });
  });
}
