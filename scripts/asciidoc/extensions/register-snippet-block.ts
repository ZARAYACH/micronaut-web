import type {
  Block,
  BlockProcessor,
  BlockProcessorDslInterface,
  Registry,
  Section,
} from "@asciidoctor/core";

import { renderSnippetBlock } from "../component-renderer.ts";
import type { SnippetRenderState } from "../component-renderer.ts";
import { SNIPPET_BLOCK, snippetPayloadFromValue } from "../snippet-payloads.ts";
import { macroAttribute } from "../listing.ts";
import { splitList } from "../../shared/cli.ts";

export function registerSnippetBlock(
  registry: Registry,
  context: any,
  options: { snippetSamples: any },
  renderState: SnippetRenderState,
): void {
  registry.block(function registerSnippetBlock(
    this: BlockProcessorDslInterface,
  ): void {
    this.named(SNIPPET_BLOCK);
    this.onContext("open");
    this.process(async function processSnippetBlock(
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
      const target = blockTarget(attributes);
      const payload = snippetPayloadForTarget(
        target,
        attributes,
        context,
        options.snippetSamples,
      );
      if (!payload) {
        return undefined;
      }
      return renderSnippetBlock(
        this,
        blockParent,
        { ...payload, kind: "code" },
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

function snippetPayloadForTarget(
  target: any,
  attrs: any,
  context: any,
  resolveSamples: any,
): any {
  const deduped = snippetSamples(target, attrs, context, resolveSamples);
  if (!deduped.length) {
    return undefined;
  }
  return {
    title: macroAttribute(attrs, "title") || "",
    description: macroAttribute(attrs, "description") || "",
    samples: deduped,
  };
}

function snippetSamples(
  target: any,
  attrs: any,
  context: any,
  resolveSamples: any,
): any {
  const samples = [];
  for (const snippetTarget of splitList(target)) {
    const targetSamples = resolveSamples(snippetTarget, attrs, context);
    samples.push(
      ...targetSamples.map((sample: any): any => ({
        ...sample,
        group: sample.group || snippetTarget,
      })),
    );
  }
  return dedupeSamples(samples);
}

function dedupeSamples(samples: any): any {
  const seen = new Set();
  return samples.filter((sample: any): any => {
    const key = `${sample.group || ""}:${sample.language}:${sample.source}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
