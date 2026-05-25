import { apiLink, packageLink } from "./api-links.ts";
import { dependencyBlocksHtml } from "./dependencies.ts";
import { snippetBlocksHtml } from "./snippets.ts";

export function platformDocsExtensionRegistry(
  asciidoctor: any,
  context: any,
): any {
  const registry = asciidoctor.Extensions.create();
  for (const kind of [
    "api",
    "ann",
    "mnapi",
    "jdk",
    "jee",
    "rs",
    "rx",
    "reactor",
  ]) {
    registry.inlineMacro(kind, function registerApiMacro(this: any): any {
      this.process(function processApiMacro(
        this: any,
        parent: any,
        target: any,
        attrs: any,
      ): any {
        const link = apiLink(context, kind, target, attrs);
        return this.createInline(parent, "anchor", link.label, {
          type: "link",
          target: link.href,
        });
      });
    });
  }
  registry.inlineMacro("pkg", function registerPackageMacro(this: any): any {
    this.process(function processPackageMacro(
      this: any,
      parent: any,
      target: any,
      attrs: any,
    ): any {
      const link = packageLink(context, target, attrs);
      return this.createInline(parent, "anchor", link.label, {
        type: "link",
        target: link.href,
      });
    });
  });
  registry.inlineMacro(
    "dependency",
    function registerDependencyMacro(this: any): any {
      this.process(function processDependencyMacro(
        this: any,
        parent: any,
        target: any,
        attrs: any,
      ): any {
        return this.createInlinePass(
          parent,
          dependencyBlocksHtml(target, attrs, context),
        );
      });
    },
  );
  registry.blockMacro("snippet", function registerSnippetMacro(this: any): any {
    this.process(function processSnippetMacro(
      this: any,
      parent: any,
      target: any,
      attrs: any,
    ): any {
      const htmlContent = snippetBlocksHtml(target, attrs, context);
      if (!htmlContent) {
        return undefined;
      }
      return this.createBlock(parent, "pass", htmlContent);
    });
  });
  return registry;
}
