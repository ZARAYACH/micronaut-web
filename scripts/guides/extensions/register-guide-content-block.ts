import type {
  Block,
  BlockProcessor,
  BlockProcessorDslInterface,
  Registry,
  Section,
} from "@asciidoctor/core";

import { guideMacroPayloadFromValue } from "../guide-blocks.ts";

type GuideContentResolver = (
  payload: ReturnType<typeof guideMacroPayloadFromValue>,
) => Promise<string[]>;

export function registerGuideContentBlock(
  registry: Registry,
  blockName: string,
  resolveLines: GuideContentResolver,
): void {
  registry.block(function registerGuideContentBlock(
    this: BlockProcessorDslInterface,
  ): void {
    this.named(blockName);
    this.onContext("open");
    this.process(async function processGuideContentBlock(
      this: BlockProcessor,
      parent: unknown,
      _reader: unknown,
      attrs: unknown,
    ): Promise<Block> {
      const attributes = attrs as Record<string, unknown>;
      const holder = this.createBlock(
        parent as Block | Section,
        "open",
        "",
        {},
      );
      await this.parseContent(
        holder,
        await resolveLines(guideMacroPayloadFromValue(attributes.payload)),
      );
      return holder;
    });
  });
}
