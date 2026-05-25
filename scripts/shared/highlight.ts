import { codeToHtml } from "shiki";

import { attribute, decodeHtml, escapeRegExp } from "./html.ts";

const CALLOUT_MARKER_PREFIX = "__MICRONAUT_CALLOUT_";
const CALLOUT_MARKER_SUFFIX = "__";

export function unwrapBlockParagraphs(input: any): any {
  const startPattern = /<div class="paragraph">\s*<p>/gi;
  let result = "";
  let position = 0;
  let match;
  while ((match = startPattern.exec(input)) !== null) {
    const paragraphStart = match.index;
    const contentStart = startPattern.lastIndex;
    const paragraphEnd = input.indexOf("</p>", contentStart);
    if (paragraphEnd < 0) {
      break;
    }
    const wrapper = /^\s*<\/div>/i.exec(input.slice(paragraphEnd + 4));
    if (!wrapper) {
      continue;
    }
    const wrapperEnd = paragraphEnd + 4 + wrapper[0].length;
    const paragraphContent = input.slice(contentStart, paragraphEnd).trim();
    if (!paragraphContent.startsWith("<micronaut-snippet")) {
      continue;
    }
    result += input.slice(position, paragraphStart);
    result += `${paragraphContent}\n`;
    position = wrapperEnd;
    startPattern.lastIndex = wrapperEnd;
  }
  result += input.slice(position);
  return result;
}

export async function highlightListingBlocks(input: any): Promise<any> {
  let current = input;
  for (let pass = 0; pass < 4; pass += 1) {
    const next = await highlightListingBlocksOnce(current);
    if (next === current) {
      return current;
    }
    current = next;
  }
  return current;
}

export function shikiStyle(): any {
  return `<style data-docs-shiki>
.shiki {
  overflow: auto;
  border-radius: 0.5rem;
  border: 1px solid hsl(var(--border, 214.3 31.8% 91.4%));
  padding: 1rem;
  background-color: var(--shiki-light-bg);
  color: var(--shiki-light);
}
.shiki code {
  display: grid;
  min-width: max-content;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace);
  font-size: 0.875rem;
  line-height: 1.45;
}
.dark .shiki {
  background-color: var(--shiki-dark-bg);
  color: var(--shiki-dark);
}
.dark .shiki span {
  color: var(--shiki-dark);
  font-style: var(--shiki-dark-font-style);
  font-weight: var(--shiki-dark-font-weight);
  text-decoration: var(--shiki-dark-text-decoration);
}
</style>`;
}

async function highlightListingBlocksOnce(input: any): Promise<any> {
  const pattern =
    /<div class="listingblock([^"]*)"(?![^>]*\sdata-lang=)([^>]*)>\s*(<div class="title">(?:(?!<\/div>)[\s\S])*<\/div>\s*)?<div class="content">\s*<pre([^>]*)><code([^>]*)>([\s\S]*?)<\/code><\/pre>\s*<\/div>\s*<\/div>/g;
  const matches: RegExpMatchArray[] = Array.from(input.matchAll(pattern));
  let result = "";
  let position = 0;
  for (const match of matches) {
    const matchIndex = match.index ?? 0;
    result += input.slice(position, matchIndex);
    const classes = match[1].trim();
    const divAttributes = removeHtmlAttribute(match[2] || "", "data-lang");
    const title = match[3] || "";
    const preAttributes = match[4] || "";
    const codeAttributes = match[5] || "";
    if (/\bshiki\b/.test(preAttributes)) {
      result += match[0];
      position = matchIndex + match[0].length;
      continue;
    }
    const language = codeLanguage(codeAttributes);
    const decodedSource = decodeHtml(
      match[6]
        .replace(
          /<i\b[^>]*class="conum"[^>]*data-value="(\d+)"[^>]*><\/i>\s*<b>\(\d+\)<\/b>/g,
          "&lt;$1&gt;",
        )
        .replace(/<b class="conum"[^>]*>\((\d+)\)<\/b>/g, "&lt;$1&gt;")
        .replace(/<[^>]+>/g, ""),
    );
    const source = encodeCalloutMarkers(
      normalizeStandaloneCalloutLines(decodedSource, language),
    );
    let highlighted = await codeToHtml(source, {
      lang: shikiLanguage(language),
      themes: {
        light: "github-light-default",
        dark: "github-dark-default",
      },
    });
    highlighted = highlighted
      .replace(
        "<code>",
        `<code class="language-${attribute(language)} shiki-code" data-lang="${attribute(language)}">`,
      )
      .replace(/&#x3C;(\d+)>/g, '<i class="conum" data-value="$1"></i>');
    highlighted = decodeCalloutMarkers(highlighted);
    result += `<div class="listingblock${classes ? ` ${classes}` : ""}"${divAttributes} data-lang="${attribute(language)}">\n${title}<div class="content">\n${highlighted}\n</div>\n</div>`;
    position = matchIndex + match[0].length;
  }
  result += input.slice(position);
  return result;
}

function encodeCalloutMarkers(source: any): any {
  return source.replace(
    /<(\d+)>/g,
    `${CALLOUT_MARKER_PREFIX}$1${CALLOUT_MARKER_SUFFIX}`,
  );
}

function decodeCalloutMarkers(source: any): any {
  return source.replace(
    new RegExp(`${CALLOUT_MARKER_PREFIX}(\\d+)${CALLOUT_MARKER_SUFFIX}`, "g"),
    '<i class="conum" data-value="$1"></i>',
  );
}

export function normalizeStandaloneCalloutLines(
  source: any,
  language: any,
): any {
  if (!standaloneCalloutLanguage(language)) {
    return source;
  }
  const lines = source.split(/\r?\n/);
  const output = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const marker = /^[ \t]*(?:[#;][ \t]*)?<(\.|\d+)>[ \t]*$/.exec(line)?.[1];
    const targetIndex = marker
      ? nextCalloutTargetLineIndex(lines, index + 1)
      : -1;
    if (marker && targetIndex >= 0) {
      lines[targetIndex] =
        `${lines[targetIndex].replace(/[ \t]+$/, "")} <${marker}>`;
      continue;
    }
    output.push(line);
  }
  return output.join("\n");
}

function standaloneCalloutLanguage(language: any): any {
  return new Set(["conf", "hocon", "properties", "props"]).has(
    normalizeCodeLanguage(language),
  );
}

function nextCalloutTargetLineIndex(lines: any, startIndex: any): any {
  for (let index = startIndex; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      continue;
    }
    if (/^[#;]/.test(trimmed) || /^<(\.|\d+)>$/.test(trimmed)) {
      return -1;
    }
    return index;
  }
  return -1;
}

function removeHtmlAttribute(attributes: any, name: any): any {
  return attributes.replace(
    new RegExp(`\\s+${escapeRegExp(name)}="[^"]*"`, "gi"),
    "",
  );
}

function codeLanguage(codeAttributes: any): any {
  return normalizeCodeLanguage(
    /data-lang="([^"]+)"/.exec(codeAttributes)?.[1] ||
      /class="[^"]*\blanguage-([A-Za-z0-9_+-]+)/.exec(codeAttributes)?.[1] ||
      "text",
  );
}

function normalizeCodeLanguage(language: any): any {
  return String(language || "text")
    .trim()
    .toLowerCase();
}

export function shikiLanguage(language: any): any {
  const normalized = normalizeCodeLanguage(language);
  const languages: Record<string, string> = {
    conf: "properties",
    "groovy-config": "groovy",
    gradle: "kotlin",
    graphqls: "graphql",
    hocon: "properties",
    "json-config": "json",
    maven: "xml",
    mysql: "sql",
    pom: "xml",
    properties: "properties",
    props: "properties",
    shell: "shellscript",
    sh: "shellscript",
    bash: "shellscript",
    cmd: "shellscript",
    commandline: "shellscript",
    console: "shellscript",
    zsh: "shellscript",
    text: "text",
    txt: "text",
    plaintext: "text",
  };
  return languages[normalized] || normalized || "text";
}
