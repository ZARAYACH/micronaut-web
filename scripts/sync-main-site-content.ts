import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "js-yaml";
import * as parse5 from "parse5";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageDir = join(rootDir, "src", "content", "main-site", "pages");
const blogDir = join(rootDir, "src", "content", "main-site", "blog");
const micronautOrigin = "https://micronaut.io";

const now = new Date().toISOString();

type Frontmatter = Record<string, any>;

function decodeHtml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;|&apos;/g, "'");
}

function htmlToText(html) {
  return decodeHtml(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|h[1-6]|li|div|section|article|tr|pre|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value) {
  return htmlToText(value)
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const htmlTagPattern = /<\/?(?:a|abbr|address|article|aside|audio|b|blockquote|br|button|canvas|caption|cite|code|col|colgroup|data|dd|del|details|dfn|dialog|div|dl|dt|em|embed|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|i|iframe|img|input|ins|kbd|label|legend|li|main|mark|menu|meter|nav|object|ol|option|p|picture|pre|progress|q|rp|rt|ruby|s|samp|script|section|select|small|source|span|strong|style|sub|summary|sup|svg|table|tbody|td|template|textarea|tfoot|th|thead|time|tr|u|ul|var|video|wbr)(?:\s[^>]*)?>/gi;

function rawHtmlTags(markdown) {
  const bodyWithoutCode = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "");
  return Array.from(bodyWithoutCode.matchAll(htmlTagPattern), (match) => match[0]);
}

function splitFrontmatter(markdown, file): { data: Frontmatter; body: string } {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`Missing frontmatter in ${file}`);
  }
  return {
    data: (YAML.load(match[1]) ?? {}) as Frontmatter,
    body: match[2]
  };
}

function stringifyMarkdown(data, body) {
  return `---\n${YAML.dump(data, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false
  }).trim()}\n---\n\n${body.trim()}\n`;
}

function attr(node, name) {
  return node.attrs?.find((item) => item.name === name)?.value;
}

function textContent(node) {
  if (node.nodeName === "#text") {
    return node.value;
  }
  return (node.childNodes ?? []).map(textContent).join("");
}

function escapeInlineText(value) {
  return decodeHtml(value)
    .replace(/\\/g, "\\\\")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function markdownUrl(value) {
  return value.replace(/\s/g, "%20").replace(/\)/g, "%29");
}

function escapeCodeSpan(value) {
  const backticks = value.match(/`+/g)?.reduce((max, item) => Math.max(max, item.length), 0) ?? 0;
  const fence = "`".repeat(backticks + 1);
  const padding = value.startsWith(" ") || value.endsWith(" ") ? " " : "";
  return `${fence}${padding}${value}${padding}${fence}`;
}

const blockTags = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "div",
  "dl",
  "dt",
  "dd",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "iframe",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "ul"
]);

function isBlockNode(node) {
  return node.tagName && blockTags.has(node.tagName);
}

function isBlank(value) {
  return !value || !value.replace(/\s+/g, "");
}

function normalizeMarkdown(value) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function inlineChildren(nodes) {
  return normalizeInline(nodes.map(inlineMarkdown).join(""));
}

function iframeMarkdown(node) {
  const src = attr(node, "src");
  return src ? `[Embedded content](${markdownUrl(src)})` : "";
}

function normalizeInline(value) {
  return value
    .replace(/[ \t\n]+/g, " ")
    .replace(/([\p{L}\p{N})])(\[)/gu, "$1 $2")
    .replace(/(\))([\p{L}\p{N}])/gu, "$1 $2")
    .replace(/([\p{L}\p{N})])(\*\*`)/gu, "$1 $2")
    .replace(/(`\*\*)([\p{L}\p{N}])/gu, "$1 $2")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .trim();
}

function inlineMarkdown(node) {
  if (node.nodeName === "#comment") {
    return "";
  }
  if (node.nodeName === "#text") {
    return escapeInlineText(node.value);
  }
  const tag = node.tagName;
  const children = node.childNodes ?? [];
  if (!tag) {
    return inlineChildren(children);
  }
  if (tag === "br") {
    return "  \n";
  }
  if (tag === "a") {
    const href = attr(node, "href");
    const label = inlineChildren(children) || href || "";
    return href ? `[${label}](${markdownUrl(href)})` : label;
  }
  if (tag === "strong" || tag === "b") {
    const value = inlineChildren(children);
    return value ? `**${value}**` : "";
  }
  if (tag === "em" || tag === "i") {
    const value = inlineChildren(children);
    return value ? `*${value}*` : "";
  }
  if (tag === "code") {
    return escapeCodeSpan(textContent(node));
  }
  if (tag === "img") {
    const src = attr(node, "src");
    if (!src) {
      return "";
    }
    return `![${escapeInlineText(attr(node, "alt") ?? "")}](${markdownUrl(src)})`;
  }
  if (tag === "iframe") {
    return iframeMarkdown(node);
  }
  if (tag === "sub" || tag === "sup" || tag === "span" || tag === "small") {
    return inlineChildren(children);
  }
  return inlineChildren(children);
}

function childrenToMarkdown(nodes) {
  const blocks = [];
  let inlineNodes = [];

  function flushInline() {
    const value = inlineChildren(inlineNodes);
    inlineNodes = [];
    if (!isBlank(value)) {
      blocks.push(value);
    }
  }

  for (const node of nodes) {
    if (node.nodeName === "#comment") {
      continue;
    }
    if (isBlockNode(node)) {
      flushInline();
      const value = blockMarkdown(node);
      if (!isBlank(value)) {
        blocks.push(value);
      }
    } else {
      inlineNodes.push(node);
    }
  }
  flushInline();
  return blocks.join("\n\n");
}

function listMarkdown(node, ordered) {
  let index = Number.parseInt(attr(node, "start") ?? "1", 10);
  if (!Number.isFinite(index)) {
    index = 1;
  }
  return (node.childNodes ?? [])
    .filter((child) => child.tagName === "li")
    .map((child) => {
      const marker = ordered ? `${index++}. ` : "- ";
      const item = normalizeMarkdown(childrenToMarkdown(child.childNodes ?? []));
      if (!item) {
        return "";
      }
      const [first, ...rest] = item.split("\n");
      return `${marker}${first}${rest.length ? `\n${rest.map((line) => `  ${line}`).join("\n")}` : ""}`;
    })
    .filter(Boolean)
    .join("\n");
}

function codeLanguage(node) {
  const codeNode = (node.childNodes ?? []).find((child) => child.tagName === "code");
  const className = attr(codeNode ?? node, "class") ?? "";
  const match = className.match(/language-([a-z0-9_+-]+)/i)
    ?? className.match(/brush:\s*([a-z0-9_+-]+)/i);
  return match?.[1] ?? "";
}

function tableMarkdown(node) {
  const rows = [];
  function visit(current) {
    if (current.tagName === "tr") {
      rows.push((current.childNodes ?? [])
        .filter((child) => child.tagName === "th" || child.tagName === "td")
        .map((cell) => inlineChildren(cell.childNodes ?? [])));
    }
    for (const child of current.childNodes ?? []) {
      visit(child);
    }
  }
  visit(node);
  if (!rows.length) {
    return "";
  }
  const width = Math.max(...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) => Array.from({ length: width }, (_item, index) => row[index] ?? ""));
  const header = normalizedRows[0];
  const divider = header.map(() => "---");
  const body = normalizedRows.slice(1);
  return [header, divider, ...body]
    .map((row) => `| ${row.map((cell) => cell.replace(/\|/g, "\\|")).join(" | ")} |`)
    .join("\n");
}

function blockquoteMarkdown(node) {
  const value = normalizeMarkdown(childrenToMarkdown(node.childNodes ?? []));
  return value
    .split("\n")
    .map((line) => line ? `> ${line}` : ">")
    .join("\n");
}

function blockMarkdown(node) {
  if (node.nodeName === "#comment") {
    return "";
  }
  if (node.nodeName === "#text") {
    return inlineMarkdown(node);
  }
  const tag = node.tagName;
  const children = node.childNodes ?? [];
  if (!tag) {
    return childrenToMarkdown(children);
  }
  if (/^h[1-6]$/.test(tag)) {
    return `${"#".repeat(Number(tag.slice(1)))} ${inlineChildren(children)}`;
  }
  if (tag === "p") {
    return inlineChildren(children);
  }
  if (tag === "ul" || tag === "ol") {
    return listMarkdown(node, tag === "ol");
  }
  if (tag === "pre") {
    const code = textContent(node).replace(/^\n+|\n+$/g, "");
    return `\`\`\`${codeLanguage(node)}\n${code}\n\`\`\``;
  }
  if (tag === "blockquote") {
    return blockquoteMarkdown(node);
  }
  if (tag === "table") {
    return tableMarkdown(node);
  }
  if (tag === "hr") {
    return "---";
  }
  if (tag === "iframe") {
    return iframeMarkdown(node);
  }
  if (tag === "img") {
    return inlineMarkdown(node);
  }
  if (tag === "script" || tag === "style") {
    return "";
  }
  return childrenToMarkdown(children);
}

function htmlToMarkdown(html) {
  const fragment = parse5.parseFragment(html);
  return normalizeMarkdown(childrenToMarkdown(fragment.childNodes ?? []));
}

async function listMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listMarkdownFiles(file);
    }
    return entry.isFile() && entry.name.endsWith(".md") ? [file] : [];
  }));
  return files.flat().sort();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "micronaut-web-content-sync/1.0"
    }
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "micronaut-web-content-sync/1.0"
    }
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response.json();
}

function extractMainHtml(html) {
  const match = html.match(/<main\b[^>]*id=["']main["'][^>]*>([\s\S]*?)<\/main>/i)
    ?? html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (!match) {
    throw new Error("Could not find <main> content");
  }
  return match[1]
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/\s+data-[a-z0-9_-]+="[^"]*"/gi, "")
    .trim();
}

function extractFirstHeading(html) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? htmlToText(match[1]) : undefined;
}

function extractMetaDescription(html) {
  const meta = html.match(/<meta\s+[^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    ?? html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*>/i);
  return meta ? decodeHtml(meta[1]).trim() : undefined;
}

function canonicalPath(url) {
  return new URL(url).pathname.replace(/^\/+|\/+$/g, "");
}

function fileForBlogRoute(route) {
  return join(blogDir, `${route}.md`);
}

async function fetchAllWordPressPosts() {
  const posts = [];
  for (let page = 1; ; page += 1) {
    const url = `${micronautOrigin}/wp-json/wp/v2/posts?per_page=100&page=${page}&_embed=wp:term`;
    const response = await fetch(url, {
      headers: {
        "user-agent": "micronaut-web-content-sync/1.0"
      }
    });
    if (response.status === 400 && page > 1) {
      break;
    }
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${url}`);
    }
    const batch = await response.json();
    posts.push(...batch);
    const totalPages = Number(response.headers.get("x-wp-totalpages") ?? page);
    if (page >= totalPages) {
      break;
    }
  }
  return posts;
}

function termsByTaxonomy(post, taxonomy) {
  return (post._embedded?.["wp:term"] ?? [])
    .flat()
    .filter((term) => term.taxonomy === taxonomy)
    .map((term) => term.slug)
    .filter(Boolean);
}

async function syncMainSitePages() {
  const files = await listMarkdownFiles(pageDir);
  const report = {
    synced: 0,
    validated: 0,
    failed: [] as string[]
  };
  for (const file of files) {
    const current = splitFrontmatter(await readFile(file, "utf8"), file);
    if (!current.data.sourceUrl) {
      continue;
    }
    try {
      const html = await fetchText(current.data.sourceUrl);
      const bodyHtml = extractMainHtml(html);
      const body = htmlToMarkdown(bodyHtml);
      const title = extractFirstHeading(bodyHtml) ?? current.data.title;
      const description = extractMetaDescription(html) ?? current.data.description;
      const data = {
        ...current.data,
        title,
        description,
        sourceUrl: current.data.sourceUrl,
        contentSource: "micronaut-public-markdown"
      };
      await writeFile(file, stringifyMarkdown(data, body));
      report.synced += 1;
      if (rawHtmlTags(body).length === 0) {
        report.validated += 1;
      } else {
        report.failed.push(relative(rootDir, file));
      }
    } catch (error) {
      report.failed.push(`${relative(rootDir, file)}: ${(error as Error).message}`);
    }
  }
  return report;
}

function postFrontmatter(post) {
  const route = canonicalPath(post.link);
  const categories = termsByTaxonomy(post, "category");
  return {
    slug: route,
    title: htmlToText(post.title.rendered),
    description: htmlToText(post.excerpt.rendered),
    date: post.date,
    modified: post.modified,
    sourceUrl: post.link,
    wordpressId: post.id,
    contentSource: "wordpress-post",
    category: categories[0] ?? "blog",
    categories,
    tags: termsByTaxonomy(post, "post_tag"),
    href: `/${route}/`
  };
}

async function syncWordPressPosts() {
  const posts = await fetchAllWordPressPosts();
  for (const post of posts) {
    const route = canonicalPath(post.link);
    const file = fileForBlogRoute(route);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, stringifyMarkdown(postFrontmatter(post), htmlToMarkdown(post.content.rendered)));
  }
  return posts.length;
}

async function syncSuccessStoryPostsFromPages() {
  const files = await listMarkdownFiles(blogDir);
  let synced = 0;
  for (const file of files) {
    const current = splitFrontmatter(await readFile(file, "utf8"), file);
    if (current.data.category !== "success-story" || !current.data.sourceUrl) {
      continue;
    }
    const html = await fetchText(current.data.sourceUrl);
    const bodyHtml = extractMainHtml(html);
    const body = htmlToMarkdown(bodyHtml);
    const title = extractFirstHeading(bodyHtml) ?? current.data.title;
    await writeFile(file, stringifyMarkdown({
      ...current.data,
      title,
      description: extractMetaDescription(html) ?? current.data.description,
      contentSource: "micronaut-public-markdown",
      categories: Array.from(new Set([...(current.data.categories ?? []), "case-studies"]))
    }, body));
    synced += 1;
  }
  return synced;
}

async function validateGeneratedMarkdown() {
  const files = [
    ...await listMarkdownFiles(pageDir),
    ...await listMarkdownFiles(blogDir)
  ];
  const failures: string[] = [];
  for (const file of files) {
    const { data, body } = splitFrontmatter(await readFile(file, "utf8"), file);
    if (!String(data.contentSource ?? "").startsWith("micronaut-public") && data.contentSource !== "wordpress-post") {
      continue;
    }
    const tags = rawHtmlTags(body);
    if (tags.length > 0) {
      failures.push(`${relative(rootDir, file)}: ${tags.slice(0, 3).join(", ")}`);
    }
  }
  return failures;
}

const syncPagesReport = await syncMainSitePages();
const postCount = await syncWordPressPosts();
const successStoryCount = await syncSuccessStoryPostsFromPages();
const markdownValidationFailures = await validateGeneratedMarkdown();

console.log(JSON.stringify({
  syncedAt: now,
  pages: syncPagesReport,
  wordpressPosts: postCount,
  successStoryPagesAsPosts: successStoryCount,
  markdownValidationFailures
}, null, 2));

if (syncPagesReport.failed.length > 0 || markdownValidationFailures.length > 0) {
  process.exitCode = 1;
}
