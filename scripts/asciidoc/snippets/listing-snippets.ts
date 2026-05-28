import { renderGeneratedSnippetCard } from "./component-cards.ts";
import { renderSnippetVariant } from "./snippet-variants.ts";

export async function renderListingSnippetCard({
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
