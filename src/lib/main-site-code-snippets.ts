import { docsSnippetCodeLanguageIcon } from "@/components/web/docs-snippet-icons";
import { renderDocsSnippetTemplates } from "@/components/web/docs-snippet-templates";
import { docsSnippetStyles } from "@/components/web/docs-snippet-styles";
import {
  codeLanguageFromFenceInfo,
  formatCodeLanguage,
  highlighterLanguageFor,
} from "@/lib/code-snippet-languages";
import { highlightCodeSnippetHtml } from "@/lib/docs-code-highlighting";

type CodeSample = {
  language: string;
  source: string;
};

const codeBlockPattern = /<pre([^>]*)><code([^>]*)>([\s\S]*?)<\/code><\/pre>/gi;
let snippetTemplates: ReturnType<typeof renderDocsSnippetTemplates> | undefined;

export async function renderMainSiteCodeSnippets(html: string) {
  const codeBlocks = Array.from(html.matchAll(codeBlockPattern));
  if (codeBlocks.length === 0) {
    return html;
  }

  let result = "";
  let position = 0;
  let snippetIndex = 0;
  for (const match of codeBlocks) {
    result += html.slice(position, match.index);
    const preAttributes = match[1] ?? "";
    const codeAttributes = match[2] ?? "";
    if (
      /\bshiki\b/.test(preAttributes) ||
      /\bdocs-code-block\b/.test(preAttributes)
    ) {
      result += match[0];
      position = (match.index ?? 0) + match[0].length;
      continue;
    }

    const source = decodeHtml(stripHtml(match[3] ?? "")).replace(/\n$/, "");
    const language = codeLanguageFromFenceInfo(
      codeLanguage(`${preAttributes} ${codeAttributes}`),
      source,
      "Main-site Markdown code block",
    );
    result += await renderStaticCodeSnippetCard(
      `main-site-code-snippet-${snippetIndex}`,
      [{ language, source }],
    );
    position = (match.index ?? 0) + match[0].length;
    snippetIndex += 1;
  }
  result += html.slice(position);
  return result;
}

async function renderStaticCodeSnippetCard(
  snippetId: string,
  samples: CodeSample[],
) {
  const template = getSnippetTemplates()["docs/snippets/code-snippet.html"];
  const optionButtonsHtml = samples
    .map((sample, index) =>
      renderLanguageOption({
        active: index === 0,
        label: formatCodeLanguage(sample.language),
        language: sample.language,
        panelId: `${snippetId}-panel-${index}`,
        tabId: `${snippetId}-tab-${index}`,
      }),
    )
    .join("");
  const snippetPanelsHtml = (
    await Promise.all(
      samples.map((sample, index) =>
        renderSnippetPanel({
          active: index === 0,
          language: sample.language,
          panelId: `${snippetId}-panel-${index}`,
          sample,
          tabId: `${snippetId}-tab-${index}`,
        }),
      ),
    )
  ).join("");

  return renderTemplate(template.html, {
    copyLabel: "Copy code",
    optionButtonsHtml,
    optionsLabel: html("Code language"),
    snippetId: attribute(snippetId),
    snippetPanelsHtml,
  });
}

function getSnippetTemplates() {
  snippetTemplates ??= renderDocsSnippetTemplates();
  return snippetTemplates;
}

function renderLanguageOption({
  active,
  label,
  language,
  panelId,
  tabId,
}: {
  active: boolean;
  label: string;
  language: string;
  panelId: string;
  tabId: string;
}) {
  const className = [
    docsSnippetStyles.buttonGhostXs,
    docsSnippetStyles.languageButton,
    active
      ? docsSnippetStyles.languageButtonActive
      : docsSnippetStyles.languageButtonInactive,
  ].join(" ");
  return `<button data-slot="button" data-variant="ghost" data-size="xs" class="${attribute(className)}" type="button" id="${attribute(tabId)}" role="tab" aria-controls="${attribute(panelId)}" aria-selected="${active}" data-lang="${attribute(language)}" tabindex="${active ? "0" : "-1"}">${languageIconHtml(language)}<span class="${attribute(docsSnippetStyles.languageText)}">${html(label)}</span></button>`;
}

function languageIconHtml(language: string) {
  const { icon, key } = docsSnippetCodeLanguageIcon(language);
  const className = `${docsSnippetStyles.languageIcon} docs-code-language-icon-${key}${icon.fill ? ` ${docsSnippetStyles.languageIconFill}` : ""}`;
  const svgAttributes = icon.fill
    ? `fill="currentColor"`
    : `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  return `<span class="${attribute(className)}" aria-hidden="true"><svg viewBox="${attribute(icon.viewBox)}" ${svgAttributes} focusable="false">${icon.body}</svg></span>`;
}

async function renderSnippetPanel({
  active,
  language,
  panelId,
  sample,
  tabId,
}: {
  active: boolean;
  language: string;
  panelId: string;
  sample: CodeSample;
  tabId: string;
}) {
  const highlighted = await highlightCodeSnippetHtml(
    sample.source,
    highlighterLanguageFor(language),
  );
  return `<div id="${attribute(panelId)}" role="tabpanel" aria-labelledby="${attribute(tabId)}" aria-hidden="${!active}"${active ? "" : " hidden"} class="${attribute(docsSnippetStyles.panel)}">
<pre class="${attribute(docsSnippetStyles.codePre)}" tabindex="0"><code class="language-${attribute(language)} ${attribute(docsSnippetStyles.codeElement)}" data-lang="${attribute(language)}">${highlighted}</code></pre>
</div>`;
}

function renderTemplate(source: string, replacements: Record<string, string>) {
  return source.replace(
    /{{(\w+)}}/g,
    (_match, key: string) => replacements[key] ?? "",
  );
}

function codeLanguage(attributes: string) {
  const match =
    attributes.match(/\blanguage-([A-Za-z0-9_+-]+)/) ??
    attributes.match(/\bdata-lang="([^"]+)"/);
  return match?.[1] ?? "";
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "");
}

function decodeHtml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'");
}

function html(value: string) {
  return attribute(value);
}

function attribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
