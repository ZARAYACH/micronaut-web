import type {
  Block,
  BlockMacroProcessor,
  MacroProcessorDslInterface,
  Registry,
  Section,
} from "@asciidoctor/core";

import {
  GUIDE_CALLOUT_BLOCK,
  guideMacroPayloadFromValue,
} from "../guide-blocks.ts";
import { includeCallout } from "../preprocessor.ts";
import type { GuideRenderContext } from "../preprocessor.ts";

export function registerGuideCalloutMacro(
  registry: Registry,
  context: GuideRenderContext,
): void {
  registry.blockMacro(
    GUIDE_CALLOUT_BLOCK,
    function registerGuideCalloutMacro(this: MacroProcessorDslInterface): void {
      this.process(async function processGuideCalloutMacro(
        this: BlockMacroProcessor,
        parent: unknown,
        target: unknown,
      ): Promise<Block> {
        const payload = guideMacroPayloadFromValue(target);
        const holder = this.createBlock(
          parent as Block | Section,
          "open",
          "",
          {},
        );
        await this.parseContent(
          holder,
          await includeCallout(payload.target, payload.attributes, context),
        );
        return holder;
      });
    },
  );
}
