import type {
  Block,
  Inline,
  InlineMacroProcessor,
  InlineMacroProcessorDslInterface,
  Registry,
} from "@asciidoctor/core";

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

function macroText(attrs: any): any {
  return macroAttribute(attrs, "text") || attrs?.$positional?.[0] || "";
}

function macroAttribute(attrs: any, name: string): any {
  if (attrs?.[name] !== undefined) {
    return String(attrs[name]);
  }
  const text = attrs?.text || attrs?.$positional?.join(",");
  if (typeof text === "string") {
    const match = new RegExp(
      `(?:^|,)\\s*${escapeRegExp(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^,]+))`,
    ).exec(text);
    if (match) {
      return (match[1] ?? match[2] ?? match[3] ?? "").trim();
    }
  }
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
