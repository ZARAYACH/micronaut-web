import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";
import * as parse5 from "parse5";
import { codeToHtml } from "shiki";

import { attribute, html } from "../shared/html.ts";
import {
  normalizeStandaloneCalloutLines,
  shikiLanguage,
} from "../shared/highlight.ts";
import { inlineTitleHtml } from "./listing.ts";
import { decodeSnippetMarkerPayload } from "./snippet-markers.ts";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const shikiThemes = {
  light: "github-light-default",
  dark: "github-dark-default",
};
const CALLOUT_MARKER_PREFIX = "__MICRONAUT_CALLOUT_";
const CALLOUT_MARKER_SUFFIX = "__";

let snippetSupportPromise: Promise<any> | undefined;

export async function renderStaticDocsSnippets(input: any): Promise<any> {
  const support = await loadSnippetSupport();
  const fragment = parse5.parseFragment(input);
  const state = {
    propertiesIndex: 0,
    snippetIndex: 0,
    support,
  };

  await replaceSnippetMarkers(fragment, state);
  replaceConfigurationPropertyTables(fragment, state);
  return parse5.serialize(fragment);
}

async function replaceSnippetMarkers(parent: any, state: any): Promise<any> {
  const children = parent.childNodes || [];
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (isElement(child, "micronaut-snippet")) {
      const nextIndex = nextMeaningfulSiblingIndex(parent, index + 1);
      const nextSibling = nextIndex >= 0 ? children[nextIndex] : undefined;
      const footerHtml = isElementWithClass(nextSibling, "div", "colist")
        ? footerHtmlForNode(nextSibling, state.support.styles)
        : "";
      if (footerHtml) {
        children.splice(nextIndex, 1);
      }

      const replacement =
        parse5.parseFragment(
          await renderSnippetMarker(child, state, footerHtml),
        ).childNodes || [];
      attachNodes(parent, replacement);
      children.splice(index, 1, ...replacement);
      index += replacement.length - 1;
      continue;
    }

    if (child.childNodes) {
      await replaceSnippetMarkers(child, state);
    }
  }
}

async function renderSnippetMarker(
  node: any,
  state: any,
  footerHtml: any,
): Promise<any> {
  const payload = decodeSnippetMarkerPayload(attr(node, "data-payload"));
  const styles = state.support.styles;
  const kind = payload.kind === "dependency" ? "dependency" : "code";
  const templateName =
    kind === "dependency"
      ? "docs/snippets/dependency-snippet.html"
      : "docs/snippets/code-snippet.html";
  const template = state.support.templates[templateName];
  const snippetId = `generated-docs-snippet-${state.snippetIndex}`;
  const samples = Array.isArray(payload.samples) ? payload.samples : [];
  const optionsLabel =
    kind === "dependency" ? "Dependency format" : "Code language";

  const optionButtonsHtml = samples
    .map((sample: any, index: any): any =>
      renderLanguageOption({
        active: index === 0,
        label: formatLanguage(sample.language),
        language: sample.language,
        panelId: `${snippetId}-panel-${index}`,
        styles,
        tabId: `${snippetId}-tab-${index}`,
      }),
    )
    .join("");
  const snippetPanelsHtml = (
    await Promise.all(
      samples.map((sample: any, index: any): any =>
        renderSnippetPanel({
          active: index === 0,
          language: sample.language,
          panelId: `${snippetId}-panel-${index}`,
          sample,
          styles,
          tabId: `${snippetId}-tab-${index}`,
        }),
      ),
    )
  ).join("");

  let cardHtml = renderTemplate(template.html, {
    copyLabel: "Copy code",
    optionButtonsHtml,
    optionsLabel: html(optionsLabel),
    snippetId: attribute(snippetId),
    snippetPanelsHtml,
  });

  if (footerHtml) {
    cardHtml = appendFooterToCard(cardHtml, footerHtml, styles);
  }

  const introHtml = externalSnippetIntroHtml({
    description: payload.description || "",
    forceHeader: kind === "dependency",
    styles,
    title: payload.title || "",
  });
  state.snippetIndex += 1;
  return `${introHtml}${cardHtml}`;
}

function renderLanguageOption({
  active,
  label,
  language,
  panelId,
  styles,
  tabId,
}: any): any {
  const className = [
    styles.buttonGhostXs,
    styles.languageButton,
    active ? styles.languageButtonActive : styles.languageButtonInactive,
  ].join(" ");
  return `<button data-slot="button" data-variant="ghost" data-size="xs" class="${attribute(className)}" type="button" id="${attribute(tabId)}" role="tab" aria-controls="${attribute(panelId)}" aria-selected="${active}" data-lang="${attribute(language)}" tabindex="${active ? "0" : "-1"}">${languageIconHtml(language, styles)}<span class="${attribute(styles.languageText)}">${html(label)}</span></button>`;
}

function languageIconHtml(language: any, styles: any): any {
  const key = String(language || "")
    .trim()
    .toLowerCase();
  if (key !== "gradle") {
    return "";
  }
  const className = `${styles.languageIcon} docs-code-language-icon-gradle ${styles.languageIconFill}`;
  return `<span class="${attribute(className)}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d="M22.695 4.297a3.807 3.807 0 0 0-5.29-.09.368.368 0 0 0 0 .533l.46.47a.363.363 0 0 0 .474.032 2.182 2.182 0 0 1 2.86 3.291c-3.023 3.02-7.056-5.447-16.211-1.083a1.24 1.24 0 0 0-.534 1.745l1.571 2.713a1.238 1.238 0 0 0 1.681.461l.037-.02-.029.02.688-.384a16.083 16.083 0 0 0 2.193-1.635.384.384 0 0 1 .499-.016.357.357 0 0 1 .016.534 16.435 16.435 0 0 1-2.316 1.741H8.77l-.696.39a1.958 1.958 0 0 1-.963.25 1.987 1.987 0 0 1-1.726-.989L3.9 9.696C1.06 11.72-.686 15.603.26 20.522a.363.363 0 0 0 .354.296h1.675a.363.363 0 0 0 .37-.331 2.478 2.478 0 0 1 4.915 0 .36.36 0 0 0 .357.317h1.638a.363.363 0 0 0 .357-.317 2.478 2.478 0 0 1 4.914 0 .363.363 0 0 0 .358.317h1.627a.363.363 0 0 0 .363-.357c.037-2.294.656-4.93 2.42-6.25 6.108-4.57 4.502-8.486 3.088-9.9zm-6.229 6.901l-1.165-.584a.73.73 0 1 1 1.165.587z"/></svg></span>`;
}

async function renderSnippetPanel({
  active,
  language,
  panelId,
  sample,
  styles,
  tabId,
}: any): Promise<any> {
  const highlighted = await highlightedCodeHtml(
    sample.source || "",
    sample.highlighterLanguage || language,
    language,
    styles,
  );
  return `<div id="${attribute(panelId)}" role="tabpanel" aria-labelledby="${attribute(tabId)}" aria-hidden="${!active}"${active ? "" : " hidden"} class="${attribute(styles.panel)}">
${highlighted}
</div>`;
}

async function highlightedCodeHtml(
  source: any,
  highlighterLanguage: any,
  displayLanguage: any,
  styles: any,
): Promise<any> {
  const markedSource = encodeCalloutMarkers(
    normalizeStandaloneCalloutLines(source.trimEnd(), displayLanguage),
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

  return highlighted
    .replace(/<pre class="[^"]*"/, `<pre class="${attribute(styles.codePre)}"`)
    .replace(
      "<code>",
      `<code class="language-${attribute(displayLanguage)} ${attribute(styles.codeElement)}" data-lang="${attribute(displayLanguage)}">`,
    )
    .replace(/&#x3C;(\d+)>/g, '<i class="conum" data-value="$1"></i>')
    .replace(
      new RegExp(`${CALLOUT_MARKER_PREFIX}(\\d+)${CALLOUT_MARKER_SUFFIX}`, "g"),
      '<i class="conum" data-value="$1"></i>',
    );
}

function encodeCalloutMarkers(source: any): any {
  return source.replace(
    /<(\d+)>/g,
    `${CALLOUT_MARKER_PREFIX}$1${CALLOUT_MARKER_SUFFIX}`,
  );
}

function externalSnippetIntroHtml({
  description,
  forceHeader,
  styles,
  title,
}: any): any {
  const titleHtml = title ? inlineTitleHtml(title) : "";
  const descriptionHtml = description ? inlineTitleHtml(description) : "";
  if (!titleHtml && !descriptionHtml) {
    return "";
  }

  if (forceHeader || descriptionHtml) {
    return `<div class="${attribute(styles.externalHeader)}">${titleHtml ? `<div class="${attribute(styles.externalHeaderTitle)}">${titleHtml}</div>` : ""}${descriptionHtml ? `<div class="${attribute(styles.externalHeaderDescription)}">${descriptionHtml}</div>` : ""}</div>`;
  }
  return `<div class="${attribute(styles.externalTitle)}">${titleHtml}</div>`;
}

function appendFooterToCard(cardHtml: any, footerHtml: any, styles: any): any {
  const fragment = parse5.parseFragment(cardHtml);
  const card = firstElementChild(fragment);
  if (!card) {
    return cardHtml;
  }
  addClass(card, styles.cardWithFooter);
  const footer = parse5.parseFragment(footerHtml).childNodes || [];
  attachNodes(card, footer);
  card.childNodes = [...(card.childNodes || []), ...footer];
  return parse5.serialize(fragment);
}

function footerHtmlForNode(node: any, styles: any): any {
  setAttr(node, "data-slot", "card-footer");
  setAttr(node, "class", styles.footer);
  return serializeNode(node);
}

function replaceConfigurationPropertyTables(parent: any, state: any): any {
  const children = parent.childNodes || [];
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (isConfigurationPropertyTable(child)) {
      const previousIndex = previousMeaningfulSiblingIndex(parent, index - 1);
      const previous = previousIndex >= 0 ? children[previousIndex] : undefined;
      const anchor =
        isElement(previous, "a") && attr(previous, "id") ? previous : undefined;
      const replacement =
        parse5.parseFragment(renderPropertiesCard(child, anchor, state))
          .childNodes || [];
      attachNodes(parent, replacement);

      if (anchor) {
        children.splice(
          previousIndex,
          index - previousIndex + 1,
          ...replacement,
        );
        index = previousIndex + replacement.length - 1;
      } else {
        children.splice(index, 1, ...replacement);
        index += replacement.length - 1;
      }
      continue;
    }

    if (
      child.childNodes &&
      !isElementWithClass(child, "div", "docs-properties-template")
    ) {
      replaceConfigurationPropertyTables(child, state);
    }
  }
}

function renderPropertiesCard(table: any, anchor: any, state: any): any {
  const styles = state.support.styles;
  const caption = firstDescendant(table, (node: any): any =>
    isElement(node, "caption"),
  );
  const title =
    textContent(caption)
      .trim()
      .replace(/^Table\s+\d+\.\s*/i, "") || "Configuration Properties";
  const rows = countDescendants(
    table,
    (node: any): any => isElement(node, "tr") && hasAncestor(node, "tbody"),
  );
  const propertiesAnchorId =
    attr(anchor, "id") || `generated-properties-${state.propertiesIndex}`;
  setAttr(caption, "class", "sr-only");
  state.propertiesIndex += 1;
  return renderTemplate(
    state.support.templates["docs/snippets/properties-snippet.html"].html,
    {
      propertiesAnchorId: attribute(propertiesAnchorId),
      propertiesCountLabel: html(
        `${rows} ${rows === 1 ? "property" : "properties"}`,
      ),
      propertiesEyebrow: "Configuration properties",
      propertiesId: attribute(`${propertiesAnchorId}-properties`),
      propertiesTableHtml: serializeNode(table),
      propertiesTitle: html(title),
    },
  );
}

function isConfigurationPropertyTable(node: any): any {
  if (
    !isElementWithClass(node, "table", "tableblock") ||
    hasAncestorWithClass(node, "docs-properties-template")
  ) {
    return false;
  }
  const caption = firstDescendant(node, (child: any): any =>
    isElement(child, "caption"),
  );
  return /configuration properties/i.test(textContent(caption));
}

function renderTemplate(source: any, replacements: any): any {
  return source.replace(
    /{{(\w+)}}/g,
    (_: any, key: any): any => replacements[key] ?? "",
  );
}

function formatLanguage(language: any): any {
  const normalized = String(language || "")
    .trim()
    .toLowerCase();
  return (
    {
      bash: "Terminal",
      conf: "HOCON",
      console: "Terminal",
      gradle: "Gradle",
      "gradle-groovy": "Gradle",
      "gradle-kotlin": "Gradle",
      groovy: "Groovy",
      hocon: "HOCON",
      java: "Java",
      "json-config": "JSON",
      kotlin: "Kotlin",
      maven: "Maven",
      pom: "Maven",
      properties: "Properties",
      python: "Python",
      sh: "Terminal",
      shell: "Terminal",
      text: "Text",
      toml: "TOML",
      xml: "XML",
      yaml: "YAML",
      yml: "YAML",
      zsh: "Terminal",
    }[normalized] ||
    normalized.charAt(0).toUpperCase() + normalized.slice(1) ||
    "Code"
  );
}

function attr(node: any, name: any): any {
  return node?.attrs?.find((entry: any): any => entry.name === name)?.value;
}

function setAttr(node: any, name: any, value: any): any {
  if (!node.attrs) {
    node.attrs = [];
  }
  const existing = node.attrs.find((entry: any): any => entry.name === name);
  if (existing) {
    existing.value = value;
  } else {
    node.attrs.push({ name, value });
  }
}

function isElement(node: any, tagName: any): any {
  return node?.tagName === tagName;
}

function isElementWithClass(node: any, tagName: any, className: any): any {
  return (
    isElement(node, tagName) &&
    ` ${attr(node, "class") || ""} `.includes(` ${className} `)
  );
}

function addClass(node: any, className: any): any {
  const classes = new Set(
    String(attr(node, "class") || "")
      .split(/\s+/)
      .filter(Boolean),
  );
  classes.add(className);
  setAttr(node, "class", Array.from(classes).join(" "));
}

function firstElementChild(node: any): any {
  return (node.childNodes || []).find((child: any): any => child.tagName);
}

function firstDescendant(node: any, predicate: any): any {
  if (!node) {
    return undefined;
  }
  if (predicate(node)) {
    return node;
  }
  for (const child of node.childNodes || []) {
    const found = firstDescendant(child, predicate);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function countDescendants(node: any, predicate: any): any {
  let count = predicate(node) ? 1 : 0;
  for (const child of node.childNodes || []) {
    count += countDescendants(child, predicate);
  }
  return count;
}

function hasAncestor(node: any, tagName: any): any {
  let current = node?.parentNode;
  while (current) {
    if (isElement(current, tagName)) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

function hasAncestorWithClass(node: any, className: any): any {
  let current = node?.parentNode;
  while (current) {
    if (` ${attr(current, "class") || ""} `.includes(` ${className} `)) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

function nextMeaningfulSiblingIndex(parent: any, startIndex: any): any {
  const children = parent.childNodes || [];
  for (let index = startIndex; index < children.length; index += 1) {
    if (!isWhitespaceText(children[index])) {
      return index;
    }
  }
  return -1;
}

function previousMeaningfulSiblingIndex(parent: any, startIndex: any): any {
  const children = parent.childNodes || [];
  for (let index = startIndex; index >= 0; index -= 1) {
    if (!isWhitespaceText(children[index])) {
      return index;
    }
  }
  return -1;
}

function isWhitespaceText(node: any): any {
  return node?.nodeName === "#text" && !String(node.value || "").trim();
}

function textContent(node: any): any {
  if (!node) {
    return "";
  }
  if (node.nodeName === "#text") {
    return node.value || "";
  }
  return (node.childNodes || []).map(textContent).join("");
}

function serializeNode(node: any): any {
  return parse5.serialize({
    childNodes: [node],
    nodeName: "#document-fragment",
  });
}

function attachNodes(parent: any, nodes: any): any {
  for (const node of nodes) {
    node.parentNode = parent;
  }
}

function loadSnippetSupport(): any {
  if (!snippetSupportPromise) {
    snippetSupportPromise = renderSnippetSupport();
  }
  return snippetSupportPromise;
}

async function renderSnippetSupport(): Promise<any> {
  const tempDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-snippet-templates-"),
  );
  const outfile = path.join(tempDirectory, "docs-snippet-templates.cjs");
  try {
    await build({
      entryPoints: [
        path.join(
          projectDirectory,
          "src",
          "components",
          "web",
          "docs-snippet-templates.tsx",
        ),
      ],
      outfile,
      bundle: true,
      format: "cjs",
      jsx: "automatic",
      platform: "node",
      logLevel: "silent",
      plugins: [
        {
          name: "micronaut-web-alias",
          setup(buildContext: any): any {
            buildContext.onResolve({ filter: /^@\// }, (args: any): any => ({
              path: resolveSourceImport(args.path),
            }));
          },
        },
      ],
    });
    const requireTemplateBundle = createRequire(import.meta.url);
    const module = requireTemplateBundle(outfile);
    return module.renderDocsSnippetStaticSupport();
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

function resolveSourceImport(specifier: any): any {
  const candidate = path.join(projectDirectory, "src", specifier.slice(2));
  for (const extension of ["", ".tsx", ".ts", ".jsx", ".js"]) {
    const resolved = `${candidate}${extension}`;
    if (existsSync(resolved)) {
      return resolved;
    }
  }
  return candidate;
}
