import type {
  Block,
  BlockProcessor,
  BlockProcessorDslInterface,
  Registry,
  Section,
} from "@asciidoctor/core";

type GuideMacroPayload = {
  attributes: Record<string, string>;
  target: string;
};

type GuideContentResolver = (payload: GuideMacroPayload) => Promise<string[]>;

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
      const lines = await resolveLines(
        guideMacroPayloadFromValue(attributes.payload),
      );
      await this.parseContent(
        guideContentParseTarget(parent, holder, lines),
        lines,
      );
      return holder;
    });
  });
}

function guideContentParseTarget(
  parent: unknown,
  holder: Block,
  lines: string[],
): Block | Section {
  return lines.some((line) => /^={1,6}\s+\S/.test(line))
    ? (parent as Block | Section)
    : holder;
}

function guideMacroPayloadFromValue(value: unknown): GuideMacroPayload {
  return JSON.parse(
    Buffer.from(String(value || ""), "base64url").toString("utf8"),
  ) as GuideMacroPayload;
}
