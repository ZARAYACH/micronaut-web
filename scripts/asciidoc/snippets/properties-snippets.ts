import { escapeRegExp } from "../../shared/html.ts";
import { renderGeneratedPropertiesCard } from "./component-cards.ts";

export async function renderPropertiesSnippetCard({
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

export function isConfigurationPropertyTable(node: any): boolean {
  return (
    node?.context === "table" &&
    /configuration properties/i.test(configurationPropertyTitle(node))
  );
}

export function configurationPropertyTitle(node: any): string {
  return String(node?.title || "")
    .trim()
    .replace(/^Table\s+\d+\.\s*/i, "");
}

export function configurationPropertyCount(node: any): number {
  return Number(node?.rows?.body?.length || node?.attributes?.rowcount || 0);
}

export function configurationPropertyTableHtml(
  tableHtml: string,
  id: any,
): string {
  return hideTableCaption(removeTableId(tableHtml, id));
}

function hideTableCaption(tableHtml: string): string {
  return tableHtml.replace(
    /<caption class="title">/,
    '<caption class="sr-only">',
  );
}

function removeTableId(tableHtml: string, id: any): string {
  if (!id) {
    return tableHtml;
  }
  return tableHtml.replace(
    new RegExp(`(<table\\b[^>]*)\\s+id="${escapeRegExp(String(id))}"`),
    "$1",
  );
}
