import type {
  Block,
  BlockMacroProcessor,
  BlockProcessor,
  BlockProcessorDslInterface,
  MacroProcessorDslInterface,
  Registry,
  Section,
} from "@asciidoctor/core";

import { renderSnippetBlock } from "./snippet-block-renderer.ts";
import { splitList } from "../../shared/cli.ts";

const SNIPPET_BLOCK = "snippet";

export function registerSnippetBlock(
  registry: Registry,
  context: any,
  options: { snippetSamples: any },
): void {
  registry.blockMacro(
    "snippet",
    function registerSnippetMacro(this: MacroProcessorDslInterface): void {
      this.process(async function processSnippetMacro(
        this: BlockMacroProcessor,
        parent: unknown,
        target: unknown,
        attrs: unknown,
      ): Promise<Block | undefined> {
        const payload = snippetPayloadForTarget(
          target,
          attrs,
          context,
          options.snippetSamples,
        );
        return payload
          ? renderSnippetBlock(this, parent as Block | Section, {
              ...payload,
              kind: "code",
            })
          : undefined;
      });
    },
  );

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
      return renderSnippetBlock(this, blockParent, {
        ...payload,
        kind: "code",
      });
    });
  });
}

function snippetPayloadFromValue(value: unknown): any {
  return JSON.parse(
    Buffer.from(String(value || ""), "base64url").toString("utf8"),
  );
}

function macroAttribute(attrs: any, name: string): any {
  if (attrs?.[name] !== undefined) {
    return cleanMacroAttributeValue(String(attrs[name]), name);
  }
  const text = attrs?.text || attrs?.$positional?.join(",");
  if (typeof text === "string") {
    const match = new RegExp(
      `(?:^|,)\\s*${escapeRegExp(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^,]+))`,
    ).exec(text);
    if (match) {
      return cleanMacroAttributeValue(
        (match[1] ?? match[2] ?? match[3] ?? "").trim(),
        name,
      );
    }
  }
  return undefined;
}

function cleanMacroAttributeValue(value: string, name: string): string {
  if (name !== "title") {
    return value;
  }
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && !trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && !trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1);
  }
  if (
    (!trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (!trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
