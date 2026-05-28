import type { Registry } from "@asciidoctor/core";

import { MicronautComponentHtmlConverter } from "./component-renderer.ts";
import { registerComponentRenderingExtensions } from "./extensions/index.ts";

type AsciidoctorConvertOptions = Record<string, unknown> & {
  converter?: unknown;
  extension_registry?: Registry;
};

type RenderAsciiDocOptions = {
  asciidoctor: typeof import("@asciidoctor/core");
  source: string;
  convertOptions: AsciidoctorConvertOptions;
  diagnosticsLabel?: string;
  fatalDiagnostic?: (diagnostic: string) => boolean;
  strict?: boolean;
};

export async function renderAsciiDoc({
  asciidoctor,
  source,
  convertOptions,
  diagnosticsLabel = "AsciiDoc source",
  fatalDiagnostic,
  strict = false,
}: RenderAsciiDocOptions): Promise<string> {
  const logger = asciidoctor.MemoryLogger.create();
  const previousLogger = asciidoctor.LoggerManager.getLogger();
  let html;
  const hasExtensionRegistry = Boolean(convertOptions.extension_registry);
  const extensionRegistry = registerComponentRenderingExtensions(
    asciidoctor,
    convertOptions.extension_registry,
    {
      registerSnippetPayloadBlocks: !hasExtensionRegistry,
    },
  );
  try {
    asciidoctor.LoggerManager.setLogger(logger);
    html = String(
      await asciidoctor.convert(source, {
        header_footer: false,
        safe: "unsafe",
        ...convertOptions,
        converter: convertOptions.converter || MicronautComponentHtmlConverter,
        extension_registry: extensionRegistry,
      }),
    );
  } finally {
    asciidoctor.LoggerManager.setLogger(previousLogger);
  }

  const diagnostics = logger
    .getMessages()
    .map(formatAsciidoctorDiagnostic)
    .filter((diagnostic) => !isHandledCalloutDiagnostic(diagnostic));
  if (diagnostics.length) {
    if (strict) {
      const fatalDiagnostics = fatalDiagnostic
        ? diagnostics.filter(fatalDiagnostic)
        : diagnostics;
      if (fatalDiagnostics.length) {
        throw new Error(
          `Asciidoctor diagnostics for ${diagnosticsLabel}: ${fatalDiagnostics.join("; ")}`,
        );
      }
    }
    for (const diagnostic of diagnostics) {
      console.warn(diagnostic);
    }
  }

  return html;
}

function formatAsciidoctorDiagnostic(message: any): string {
  const severity = message.getSeverity();
  const location = message.getSourceLocation?.();
  const pathName = location?.getPath?.();
  const lineNumber = location?.getLineNumber?.();
  const source = pathName
    ? `${pathName}${lineNumber ? `:${lineNumber}` : ""}: `
    : "";
  return `asciidoctor: ${severity}: ${source}${message.getText()}`;
}

function isHandledCalloutDiagnostic(diagnostic: string): boolean {
  // Snippet block processors and listing tree processors render callout lists
  // outside Asciidoctor's built-in callout catalog.
  return [
    /no callout found for <\d+>/i,
    /callout list item index: expected \d+, got \d+/i,
  ].some((pattern) => pattern.test(diagnostic));
}
