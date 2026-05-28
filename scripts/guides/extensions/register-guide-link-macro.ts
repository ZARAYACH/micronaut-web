import type {
  Block,
  Inline,
  InlineMacroProcessor,
  InlineMacroProcessorDslInterface,
  Registry,
} from "@asciidoctor/core";

import { macroText } from "../../asciidoc/listing.ts";

export function registerGuideLinkMacro(registry: Registry): void {
  registry.inlineMacro(
    "guideLink",
    function registerGuideLinkMacro(
      this: InlineMacroProcessorDslInterface,
    ): void {
      this.process(function processGuideLinkMacro(
        this: InlineMacroProcessor,
        parent: unknown,
        target: unknown,
        attrs: unknown,
      ): Inline {
        return this.createInline(
          parent as Block,
          "anchor",
          String(macroText(attrs as Record<string, unknown>)),
          {
            type: "link",
            target: `${String(target)}.html`,
          },
        );
      });
    },
  );
}
