import type {
  DocumentProcessorDslInterface,
  Reader,
  Registry,
} from "@asciidoctor/core";

import { rewriteGuideSourceForExtensions } from "../preprocessor.ts";
import type { GuideRenderContext } from "../preprocessor.ts";

export function registerGuidePreprocessor(
  registry: Registry,
  context: GuideRenderContext,
): void {
  registry.preprocessor(function registerGuidePreprocessor(
    this: DocumentProcessorDslInterface,
  ): void {
    this.process(function processGuidePreprocessor(
      document: unknown,
      reader: unknown,
    ): Reader {
      const sourceReader = reader as Reader;
      return new (reader as any).constructor(
        document,
        rewriteGuideSourceForExtensions(
          sourceReader.lines.join("\n"),
          context,
        ).split(/\r?\n/),
        sourceReader.cursor,
        {},
      );
    });
  });
}
