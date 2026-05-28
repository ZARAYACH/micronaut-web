import type {
  Block,
  BlockProcessor,
  BlockProcessorDslInterface,
  Registry,
  Section,
} from "@asciidoctor/core";

import { renderSnippetBlock } from "../component-renderer.ts";
import type { SnippetRenderState } from "../component-renderer.ts";
import { dependencyPayload } from "../dependencies.ts";
import {
  DEPENDENCY_BLOCK,
  snippetPayloadFromValue,
} from "../snippet-payloads.ts";

export function registerDependencyBlock(
  registry: Registry,
  context: any,
  renderState: SnippetRenderState,
): void {
  registry.block(function registerDependencyBlock(
    this: BlockProcessorDslInterface,
  ): void {
    this.named(DEPENDENCY_BLOCK);
    this.onContext("open");
    this.process(async function processDependencyBlock(
      this: BlockProcessor,
      parent: unknown,
      _reader: unknown,
      attrs: unknown,
    ): Promise<Block | undefined> {
      const attributes = attrs as Record<string, unknown>;
      const blockParent = parent as Block | Section;
      if (attributes?.payload) {
        return renderSnippetBlock(
          this,
          blockParent,
          snippetPayloadFromValue(attributes.payload),
          renderState,
        );
      }
      return renderSnippetBlock(
        this,
        blockParent,
        {
          ...dependencyPayload(blockTarget(attributes), attributes, context),
          kind: "dependency",
        },
        renderState,
      );
    });
  });
}

function blockTarget(attrs: Record<string, unknown>): string {
  const positional = Array.isArray(attrs._positional) ? attrs._positional : [];
  const dollarPositional = Array.isArray(attrs.$positional)
    ? attrs.$positional
    : [];
  return String(
    attrs?.target ||
      attrs?.name ||
      attrs?.[2] ||
      positional[0] ||
      dollarPositional[0] ||
      "",
  );
}
