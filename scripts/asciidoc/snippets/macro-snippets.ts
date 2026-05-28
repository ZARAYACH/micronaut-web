import { renderGeneratedSnippetCard } from "./component-cards.ts";
import { inlineTitleHtml } from "../listing.ts";
import { renderSnippetVariant } from "./snippet-variants.ts";

type RenderedSnippetCards = {
  count: number;
  html: string;
};

export async function renderSnippetPayloadCards({
  footerHtml,
  payload,
  startIndex,
}: {
  footerHtml: string;
  payload: any;
  startIndex: number;
}): Promise<RenderedSnippetCards> {
  const kind = payload.kind === "dependency" ? "dependency" : "code";
  const sampleGroups = groupedSnippetSamples(payload.samples, kind);
  const snippets = [];

  for (const [index, samples] of sampleGroups.entries()) {
    snippets.push(
      await renderSnippetCard({
        description: index === 0 ? payload.description || "" : "",
        footerHtml: index === sampleGroups.length - 1 ? footerHtml : "",
        id: `generated-docs-snippet-${startIndex + index}`,
        kind,
        optionsLabel:
          kind === "dependency" ? "Dependency format" : "Code language",
        samples,
        title: index === 0 ? payload.title || "" : "",
      }),
    );
  }

  return {
    count: sampleGroups.length,
    html: snippets.join(""),
  };
}

async function renderSnippetCard({
  description,
  footerHtml,
  id,
  kind,
  optionsLabel,
  samples,
  title,
}: any): Promise<string> {
  return renderGeneratedSnippetCard({
    copyLabel: "Copy code",
    descriptionHtml: description ? inlineTitleHtml(description) : "",
    footerHtml,
    id,
    kind,
    optionsLabel,
    titleHtml: title ? inlineTitleHtml(title) : "",
    variants: await Promise.all(
      samples.map((sample: any, index: number): any =>
        renderSnippetVariant({
          active: index === 0,
          language: sample.language || "text",
          panelId: `${id}-panel-${index}`,
          sample,
          tabId: `${id}-tab-${index}`,
        }),
      ),
    ),
  });
}

function groupedSnippetSamples(samples: any, kind: any): any {
  const normalizedSamples = Array.isArray(samples) ? samples : [];
  if (kind !== "code" || normalizedSamples.length < 2) {
    return [normalizedSamples];
  }

  if (normalizedSamples.every((sample: any): any => sample.group)) {
    const groups = new Map();
    for (const sample of normalizedSamples) {
      const group = sample.group;
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group).push(sample);
    }
    if (groups.size > 1) {
      return Array.from(groups.values());
    }
  }

  const languageCounts = new Map();
  for (const sample of normalizedSamples) {
    const language = sample.language || "text";
    languageCounts.set(language, (languageCounts.get(language) || 0) + 1);
  }
  if ([...languageCounts.values()].some((count: any): any => count > 1)) {
    return normalizedSamples.map((sample: any): any => [sample]);
  }
  return [normalizedSamples];
}
