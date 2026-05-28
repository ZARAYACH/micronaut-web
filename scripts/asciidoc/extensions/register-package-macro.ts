import type {
  Block,
  Inline,
  InlineMacroProcessor,
  InlineMacroProcessorDslInterface,
  Registry,
} from "@asciidoctor/core";

export function registerPackageMacro(registry: Registry, context: any): void {
  registry.inlineMacro(
    "pkg",
    function registerPackageMacro(
      this: InlineMacroProcessorDslInterface,
    ): void {
      this.process(function processPackageMacro(
        this: InlineMacroProcessor,
        parent: unknown,
        target: unknown,
        attrs: unknown,
      ): Inline {
        const link = packageLink(
          context,
          String(target),
          attrs as Record<string, unknown>,
        );
        return this.createInline(parent as Block, "anchor", link.label, {
          type: "link",
          target: link.href,
        });
      });
    },
  );
}

function packageLink(context: any, target: any, attrs: any): any {
  let packageName = target;
  if (!packageName.startsWith("io.micronaut.")) {
    packageName = `io.micronaut.${packageName}`;
  }
  return {
    href: `assets/${context.project.slug}/docs/api/${packageName.replaceAll(".", "/")}/package-summary.html`,
    label: macroText(attrs) || packageName,
  };
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
