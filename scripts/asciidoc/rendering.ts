import { Html5Converter } from "@asciidoctor/core";
import type { Registry } from "@asciidoctor/core";

import { escapeRegExp } from "../shared/html.ts";
import { registerComponentRenderingExtensions } from "./extensions/index.ts";
import { componentFooterHtml } from "./extensions/register-component-footer-processor.ts";
import {
  renderGeneratedPropertiesCard,
  renderGeneratedSnippetCard,
  renderSnippetVariant,
} from "./extensions/snippet-block-renderer.ts";

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

type AsciidoctorNode = {
  id?: string;
  title?: unknown;
  context?: unknown;
  role?: unknown;
  attributes?: Record<string, unknown>;
  rows?: { body?: unknown[] };
  hasTitle?: () => boolean;
  getAttribute?: (name: string) => unknown;
  getSource?: () => string;
};

type AsciidoctorDiagnostic = {
  getSeverity(): string;
  getSourceLocation?: () => {
    getPath?: () => string | undefined;
    getLineNumber?: () => number | undefined;
  };
  getText(): string;
};

class MicronautComponentHtmlConverter extends Html5Converter {
  private micronautListingIndex = 0;
  private micronautPropertiesIndex = 0;

  override async convert_listing(node: AsciidoctorNode): Promise<string> {
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
      titleHtml: node.hasTitle?.() ? String(node.title || "") : "",
    });
  }

  override async convert_table(node: AsciidoctorNode): Promise<string> {
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
    return componentFooterHtml(node, (footerNode) =>
      super.convert_colist(footerNode),
    );
  }
}

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
    let diagnosticsToWarn = diagnostics;
    if (strict) {
      const fatalDiagnostics = fatalDiagnostic
        ? diagnostics.filter(fatalDiagnostic)
        : diagnostics;
      if (fatalDiagnostics.length) {
        throw new Error(
          `Asciidoctor diagnostics for ${diagnosticsLabel}: ${fatalDiagnostics.join("; ")}`,
        );
      }
      diagnosticsToWarn = fatalDiagnostic ? fatalDiagnostics : diagnostics;
    }
    for (const diagnostic of diagnosticsToWarn) {
      console.warn(diagnostic);
    }
  }

  return html;
}

function isSnippetCalloutValidationBlock(node: unknown): boolean {
  const candidate = node as { context?: unknown; role?: unknown };
  return (
    Boolean(node && typeof node === "object") &&
    candidate.context === "listing" &&
    candidate.role === "docs-snippet-callout-validation"
  );
}

function listingBlockLanguage(node: AsciidoctorNode): string {
  return String(
    node.getAttribute?.("language") ||
      node.attributes?.language ||
      node.getAttribute?.("lang") ||
      "text",
  )
    .trim()
    .toLowerCase();
}

async function renderListingSnippetCard({
  descriptionHtml = "",
  footerHtml,
  id,
  language,
  source,
  titleHtml = "",
}: {
  descriptionHtml?: string;
  footerHtml: string;
  id: string;
  language: string;
  source: string;
  titleHtml?: string;
}): Promise<string> {
  return renderGeneratedSnippetCard({
    copyLabel: "Copy code",
    descriptionHtml,
    footerHtml,
    id,
    kind: "code",
    optionsLabel: "Code language",
    titleHtml,
    variants: [
      await renderSnippetVariant({
        active: true,
        language,
        panelId: `${id}-panel-0`,
        sample: { language, source },
        tabId: `${id}-tab-0`,
      }),
    ],
  });
}

async function renderPropertiesSnippetCard({
  anchorId,
  propertyCount,
  tableHtml,
  title,
}: {
  anchorId: string;
  propertyCount: number;
  tableHtml: string;
  title: string;
}): Promise<string> {
  return renderGeneratedPropertiesCard({
    anchorId,
    countLabel: `${propertyCount} ${
      propertyCount === 1 ? "property" : "properties"
    }`,
    eyebrow: "Configuration properties",
    id: `${anchorId}-properties`,
    tableHtml,
    title,
  });
}

function isConfigurationPropertyTable(node: AsciidoctorNode): boolean {
  return (
    node?.context === "table" &&
    /configuration properties/i.test(configurationPropertyTitle(node))
  );
}

function configurationPropertyTitle(node: AsciidoctorNode): string {
  return String(node?.title || "")
    .trim()
    .replace(/^Table\s+\d+\.\s*/i, "");
}

function configurationPropertyCount(node: AsciidoctorNode): number {
  return Number(node?.rows?.body?.length || node?.attributes?.rowcount || 0);
}

function configurationPropertyTableHtml(
  tableHtml: string,
  id: unknown,
): string {
  return hideTableCaption(removeTableId(tableHtml, id));
}

function hideTableCaption(tableHtml: string): string {
  return tableHtml.replace(
    /<caption class="title">/,
    '<caption class="sr-only">',
  );
}

function removeTableId(tableHtml: string, id: unknown): string {
  if (!id) {
    return tableHtml;
  }
  return tableHtml.replace(
    new RegExp(`(<table\\b[^>]*)\\s+id="${escapeRegExp(String(id))}"`),
    "$1",
  );
}

function formatAsciidoctorDiagnostic(message: AsciidoctorDiagnostic): string {
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
