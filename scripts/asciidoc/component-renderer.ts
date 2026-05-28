import { Html5Converter } from "@asciidoctor/core";
import type {
  Block,
  BlockProcessor,
  Document,
  Registry,
  Section,
} from "@asciidoctor/core";

import { absorbFollowingCalloutLines } from "./callouts.ts";
import type { CalloutLineResolver, CalloutReader } from "./callouts.ts";
import { renderListingSnippetCard } from "./snippets/listing-snippets.ts";
import { renderSnippetPayloadCards } from "./snippets/macro-snippets.ts";
import {
  configurationPropertyCount,
  configurationPropertyTableHtml,
  configurationPropertyTitle,
  isConfigurationPropertyTable,
  renderPropertiesSnippetCard,
} from "./snippets/properties-snippets.ts";

export type SnippetRenderState = {
  resolveCalloutLines?: CalloutLineResolver;
  snippetIndex: number;
};

type SnippetPayload = Record<string, unknown> & {
  footerSource?: unknown;
};

type SnippetRenderOptions = {
  collectManualCallouts?: boolean;
};

type ComponentBlockProcessor = Pick<
  BlockProcessor,
  "createBlock" | "parseContent"
>;

type ComponentBlockNode = {
  blocks?: ComponentBlockNode[];
  convert?: () => Promise<string> | string;
  context?: string;
  role?: string | string[];
};

const footerNodes = new WeakMap<object, ComponentBlockNode>();
const snippetRenderStates = new WeakMap<Registry, SnippetRenderState>();

export class MicronautComponentHtmlConverter extends Html5Converter {
  private micronautListingIndex = 0;
  private micronautPropertiesIndex = 0;

  override async convert_listing(node: any): Promise<string> {
    if (isSnippetCalloutValidationBlock(node)) {
      return "";
    }

    const footerHtml = await this.footerHtml(node);
    const generatedIndex = this.micronautListingIndex;
    this.micronautListingIndex += 1;
    return renderListingSnippetCard({
      descriptionHtml: "",
      footerHtml,
      id: node.id || `generated-listing-snippet-${generatedIndex}`,
      language: listingBlockLanguage(node),
      source: node.getSource?.() || "",
      titleHtml: node.hasTitle() ? String(node.title || "") : "",
    });
  }

  override async convert_table(node: any): Promise<string> {
    if (!isConfigurationPropertyTable(node)) {
      return super.convert_table(node);
    }

    const generatedIndex = this.micronautPropertiesIndex;
    this.micronautPropertiesIndex += 1;
    const anchorId = node.id || `generated-properties-${generatedIndex}`;
    const tableHtml = configurationPropertyTableHtml(
      await super.convert_table(node),
      node.id,
    );
    const propertyCount = configurationPropertyCount(node);
    return renderPropertiesSnippetCard({
      anchorId,
      propertyCount,
      tableHtml,
      title: configurationPropertyTitle(node),
    });
  }

  private async footerHtml(node: object): Promise<string> {
    const footerNode = footerNodes.get(node);
    return footerNode ? super.convert_colist(footerNode) : "";
  }
}

export function snippetRenderState(registry: Registry): SnippetRenderState {
  let renderState = snippetRenderStates.get(registry);
  if (!renderState) {
    renderState = { snippetIndex: 0 };
    snippetRenderStates.set(registry, renderState);
  }
  return renderState;
}

export async function renderSnippetBlock(
  processor: ComponentBlockProcessor,
  parent: Block | Section,
  payload: SnippetPayload,
  renderState: SnippetRenderState,
): Promise<Block> {
  const documentReader = (parent.document as { reader?: CalloutReader }).reader;
  return renderSnippetBlockWithCalloutReader(
    processor,
    parent,
    payload,
    renderState,
    documentReader,
  );
}

export async function renderSnippetBlockWithCalloutReader(
  processor: ComponentBlockProcessor,
  parent: Block | Section,
  payload: SnippetPayload,
  renderState: SnippetRenderState,
  reader: CalloutReader | undefined,
  options: SnippetRenderOptions = {},
): Promise<Block> {
  const manualCalloutLines: string[] = [];
  const payloadWithCallouts = await absorbFollowingCalloutLines(
    reader,
    payload,
    {
      collectManualCalloutLines: options.collectManualCallouts
        ? (lines: string[]): void => {
            manualCalloutLines.push(...lines);
          }
        : undefined,
      resolveCalloutLines: renderState.resolveCalloutLines,
    },
  );
  const rendered = await renderSnippetPayloadCards({
    footerHtml: await snippetFooterHtml(processor, parent, payloadWithCallouts),
    payload: payloadWithCallouts,
    startIndex: renderState.snippetIndex,
  });
  renderState.snippetIndex += rendered.count;
  const manualCalloutHtml = await manualCalloutsHtml(
    processor,
    parent,
    manualCalloutLines,
  );
  return processor.createBlock(
    parent,
    "pass",
    rendered.html + manualCalloutHtml,
    {
      role: "docs-snippet",
    },
  );
}

export function attachComponentFooters(
  parent: Document | ComponentBlockNode,
): void {
  const blocks = parent.blocks || [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    attachComponentFooters(block);

    if (isRenderableListingBlock(block)) {
      attachFollowingCalloutList(blocks, index, block);
    }
  }
}

async function snippetFooterHtml(
  processor: ComponentBlockProcessor,
  parent: Block | Section,
  payload: SnippetPayload,
): Promise<string> {
  const footerLines = String(payload.footerSource || "")
    .split(/\r?\n/)
    .filter((line: string): boolean => Boolean(line.trim()));
  if (!footerLines.length) {
    return "";
  }

  const holder = processor.createBlock(parent, "open", "", {});
  await processor.parseContent(holder, [
    "[source,text]",
    "----",
    ...footerLines.map(
      (line: string): string =>
        `callout ${calloutNumberFromLine(line)} <${calloutNumberFromLine(line)}>`,
    ),
    "----",
    ...footerLines,
  ]);
  const colist = holder.blocks?.find(isCalloutList);
  return colist ? String(await colist.convert()) : "";
}

async function manualCalloutsHtml(
  processor: ComponentBlockProcessor,
  parent: Block | Section,
  lines: string[],
): Promise<string> {
  if (!lines.length) {
    return "";
  }
  const holder = processor.createBlock(parent, "open", "", {});
  await processor.parseContent(holder, lines);
  return (
    await Promise.all(
      (holder.blocks || []).map(
        async (block: ComponentBlockNode): Promise<string> =>
          block.convert ? String(await block.convert()) : "",
      ),
    )
  ).join("\n");
}

function calloutNumberFromLine(line: string): string {
  return /^<(\d+)>/.exec(String(line || "").trim())?.[1] || "1";
}

function attachFollowingCalloutList(
  blocks: ComponentBlockNode[],
  index: number,
  target: ComponentBlockNode,
): void {
  const next = blocks[index + 1];
  if (isCalloutList(next)) {
    footerNodes.set(target, next);
    blocks.splice(index + 1, 1);
  }
}

function isRenderableListingBlock(node: unknown): node is ComponentBlockNode {
  return (
    isComponentBlockNode(node) &&
    node.context === "listing" &&
    !isSnippetCalloutValidationBlock(node)
  );
}

function isSnippetCalloutValidationBlock(node: unknown): boolean {
  return (
    isComponentBlockNode(node) &&
    node.context === "listing" &&
    node.role === "docs-snippet-callout-validation"
  );
}

function isCalloutList(node: unknown): node is ComponentBlockNode {
  return isComponentBlockNode(node) && node.context === "colist";
}

function isComponentBlockNode(node: unknown): node is ComponentBlockNode {
  return Boolean(node && typeof node === "object");
}

function listingBlockLanguage(node: any): string {
  return String(
    node.getAttribute?.("language") ||
      node.attributes?.language ||
      node.getAttribute?.("lang") ||
      "text",
  )
    .trim()
    .toLowerCase();
}
