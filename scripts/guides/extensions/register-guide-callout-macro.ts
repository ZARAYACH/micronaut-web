import type {
  Block,
  BlockMacroProcessor,
  MacroProcessorDslInterface,
  Registry,
  Section,
} from "@asciidoctor/core";

import type { GuideRenderContext } from "../model.ts";
import { includeGuideCallout } from "./register-guide-callout-resolver.ts";

const GUIDE_CALLOUT_BLOCK = "guide-callout";

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
          await includeGuideCallout(
            payload.target,
            payload.attributes,
            context,
          ),
        );
        return holder;
      });
    },
  );
}

function guideMacroPayloadFromValue(value: unknown): {
  attributes: Record<string, string>;
  target: string;
} {
  return JSON.parse(
    Buffer.from(String(value || ""), "base64url").toString("utf8"),
  );
}
