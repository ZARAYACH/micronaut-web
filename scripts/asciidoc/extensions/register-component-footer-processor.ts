import type {
  Document,
  DocumentProcessorDslInterface,
  Registry,
} from "@asciidoctor/core";

import { attachComponentFooters } from "../component-renderer.ts";

export function registerComponentFooterProcessor(registry: Registry): void {
  registry.treeProcessor(function registerComponentFooterProcessor(
    this: DocumentProcessorDslInterface,
  ): void {
    this.process(function processComponentFooters(document: unknown): void {
      attachComponentFooters(document as Document);
    });
  });
}
