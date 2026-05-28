import { codeToHtml } from "shiki";

import { docsSnippetLanguageLabel } from "../../../src/components/web/docs-snippet-icons.ts";
import {
  normalizeStandaloneCalloutLines,
  shikiLanguage,
} from "../../shared/highlight.ts";

const shikiThemes = {
  light: "github-light-default",
  dark: "github-dark-default",
};
const CALLOUT_MARKER_PREFIX = "__MICRONAUT_CALLOUT_";
const CALLOUT_MARKER_SUFFIX = "__";

export async function renderSnippetVariant({
  active,
  language,
  panelId,
  sample,
  tabId,
}: any): Promise<any> {
  const displayLanguage = String(language || "text")
    .trim()
    .toLowerCase();
  return {
    active,
    highlightedHtml: await highlightedCodeInnerHtml(
      sample.source || "",
      sample.highlighterLanguage || displayLanguage,
      displayLanguage,
    ),
    label: docsSnippetLanguageLabel(displayLanguage),
    language: displayLanguage,
    panelId,
    source: String(sample.source || "").trimEnd(),
    tabId,
  };
}

async function highlightedCodeInnerHtml(
  source: any,
  highlighterLanguage: any,
  displayLanguage: any,
): Promise<string> {
  const markedSource = encodeCalloutMarkers(
    normalizeStandaloneCalloutLines(
      String(source || "").trimEnd(),
      displayLanguage,
    ),
  );
  let highlighted;
  try {
    highlighted = await codeToHtml(markedSource, {
      lang: shikiLanguage(highlighterLanguage),
      themes: shikiThemes,
    });
  } catch {
    highlighted = await codeToHtml(markedSource, {
      lang: "text",
      themes: shikiThemes,
    });
  }

  return codeElementInnerHtml(highlighted)
    .replace(/&#x3C;(\d+)>/g, '<i class="conum" data-value="$1"></i>')
    .replace(
      new RegExp(`${CALLOUT_MARKER_PREFIX}(\\d+)${CALLOUT_MARKER_SUFFIX}`, "g"),
      '<i class="conum" data-value="$1"></i>',
    );
}

function codeElementInnerHtml(value: string): string {
  return /<code(?:\s[^>]*)?>([\s\S]*)<\/code>/.exec(value)?.[1] || value;
}

function encodeCalloutMarkers(source: any): any {
  return source.replace(
    /<!--(\d+)-->|<(\d+)>/g,
    (_match: any, xmlCommentNumber: any, angleNumber: any): any =>
      `${CALLOUT_MARKER_PREFIX}${xmlCommentNumber || angleNumber}${CALLOUT_MARKER_SUFFIX}`,
  );
}
