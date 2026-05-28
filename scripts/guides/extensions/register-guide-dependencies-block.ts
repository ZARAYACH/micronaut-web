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
import {
  GUIDE_DEPENDENCIES_BLOCK,
  guideDependencyPayloadFromValue,
} from "../guide-blocks.ts";
import { dependencySnippetPayload } from "../preprocessor.ts";
import type { GuideRenderContext } from "../preprocessor.ts";

export function registerGuideDependenciesBlock(
  registry: Registry,
  context: GuideRenderContext,
  renderState: SnippetRenderState,
): void {
  registry.block(function registerGuideDependenciesBlock(
    this: BlockProcessorDslInterface,
  ): void {
    this.named(GUIDE_DEPENDENCIES_BLOCK);
    this.onContext("open");
    this.process(async function processGuideDependenciesBlock(
      this: BlockProcessor,
      parent: unknown,
      reader: unknown,
      attrs: unknown,
    ): Promise<Block> {
      const attributes = attrs as Record<string, unknown>;
      const payload = guideDependencyPayloadFromValue(attributes.payload);
      return renderSnippetBlockWithCalloutReader(
        this,
        parent as Block | Section,
        dependencySnippetPayload(payload.dependencies, context),
        renderState,
        reader as Reader,
        { collectManualCallouts: true },
      );
    });
  });
}
