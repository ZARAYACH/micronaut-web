import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sharedStylesPath = "src/components/web/docs-snippet-styles.ts";
const removedRuntimeCssPaths = [
  "scripts/generate-docs-snippet-css.mjs",
  "src/styles/docs-snippet-runtime.source.css",
  "src/styles/generated/docs-snippet-runtime.css"
];

const requiredSharedKeys = [
  "card",
  "cardWithFooter",
  "standaloneCard",
  "propertiesCard",
  "codeSnippetTemplate",
  "dependencySnippetTemplate",
  "toolbarHeader",
  "textHeader",
  "content",
  "panel",
  "codePre",
  "codeElement",
  "footer",
  "heading",
  "propertiesHeading",
  "externalHeader",
  "externalTitle",
  "externalHeaderTitle",
  "externalHeaderDescription",
  "copyButtonMarker",
  "copyButton",
  "buttonGhostXs",
  "buttonGhostIconXs",
  "languageButton",
  "languageButtonActive",
  "languageButtonInactive",
  "staticLanguage",
  "languageText",
  "languageTextSelector",
  "languageIcon",
  "languageImageIcon",
  "languageIconFill",
  "kindIcon"
];

const consumers = [
  {
    file: "src/components/web/docs-snippet-card.tsx",
    requiredUses: [
      "docsSnippetStyles.card",
      "docsSnippetStyles.cardWithFooter",
      "docsSnippetStyles.codeSnippetTemplate",
      "docsSnippetStyles.dependencySnippetTemplate",
      "docsSnippetStyles.copyButtonMarker",
      "docsSnippetStyles.externalHeader",
      "docsSnippetStyles.externalHeaderTitle",
      "docsSnippetStyles.externalHeaderDescription",
      "docsSnippetStyles.languageIcon",
      "docsSnippetStyles.kindIcon"
    ]
  },
  {
    file: "src/components/web/docs-code-snippet.tsx",
    requiredUses: [
      "docsSnippetStyles.tabs",
      "docsSnippetStyles.panel",
      "docsSnippetStyles.codePre",
      "docsSnippetStyles.codeElement",
      "docsSnippetStyles.languageImageIcon",
      "docsSnippetStyles.languageText",
      "ShikiCodeBlock"
    ]
  },
  {
    file: "src/components/web/docs-snippet-templates.tsx",
    requiredUses: [
      "DocsSnippetCard",
      "DocsPropertiesSnippetCard",
      "docsSnippetStyles.tabs"
    ]
  },
  {
    file: "src/components/web/main-code-showcase.tsx",
    requiredUses: [
      "DocsCodeSnippet",
      "docsSnippetStyles.externalTitle"
    ]
  },
  {
    file: "src/components/web/snippet-test-gallery.tsx",
    requiredUses: [
      "DocsCodeSnippet",
      "DocsSnippetCard",
      "DocsPropertiesSnippetCard",
      "ShikiCodeBlock",
      "docsSnippetStyles.tabs",
      "docsSnippetStyles.panel",
      "docsSnippetStyles.languageIcon",
      "docsSnippetStyles.languageIconFill",
      "docsSnippetStyles.languageText"
    ]
  },
  {
    file: "src/components/web/generated-docs-enhancer.astro",
    requiredUses: [
      "renderDocsSnippetTemplates",
      "define:vars={{ docsSnippetStyles, docsSnippetTemplates }}",
      "renderSharedSnippetCard",
      "renderSharedPropertiesCard",
      "docsSnippetStyles.standaloneCard",
      "docsSnippetStyles.copyButton",
      "docsSnippetStyles.codePre",
      "docsSnippetStyles.codeElement",
      "docsSnippetStyles.externalHeader",
      "docsSnippetStyles.externalHeaderTitle",
      "docsSnippetStyles.externalHeaderDescription",
      "docsSnippetStyles.externalTitle",
      "docsSnippetStyles.cardWithFooter",
      "docsSnippetStyles.languageText",
      "docsSnippetStyles.kindIcon"
    ]
  }
];

const guardedClassFragments = [
  "docs-snippet-template docs-code-block",
  "docs-properties-template my-5 flex",
  "docs-code-toolbar docs-snippet-card-header",
  "docs-snippet-panels overflow-hidden bg-code",
  "docs-code-content docs-snippet-card-content",
  "docs-snippet-card-footer docs-code-callouts",
  "docs-snippet-tabs docs-code-tabs docs-code-tabs-multi flex",
  "title docs-snippet-external-title",
  "docs-snippet-copy docs-code-copy",
  "docs-properties-template docs-dependency-template",
  "docs-code-snippet-template",
  "docs-code-language docs-code-language-static",
  "docs-code-language-text",
  "docs-code-language-icon block size-3.5",
  "docs-code-language-icon-fill",
  "docs-snippet-kind-icon size-3.5",
  "overflow-x-auto bg-code px-6 py-4 text-sm leading-6 text-code-foreground",
  "shiki-code grid min-w-max font-mono text-[0.85rem] leading-6",
  "my-5 flex flex-col gap-0 overflow-hidden rounded-xl",
  "border border-border bg-card py-0 text-card-foreground",
  "shadow-sm shadow-black/[0.03] dark:shadow-black/20",
  "border-b border-code-border bg-code-tab",
  "text-[0.95rem] leading-[1.45] font-bold"
];

const requiredRuntimeClassFragments = [
  "dark:[&_span[style]]:![color:var(--shiki-dark,var(--shiki-light,currentColor))]",
  "[&_.conum::before]:content-[attr(data-value)]",
  "[&_ol]:[counter-reset:docs-code-callout]",
  "[&_li::before]:content-[counter(docs-code-callout)]",
  "[&_table.tableblock]:border-collapse",
  "[&_table.tableblock_:where(th,td)]:border"
];

const failures = [];
const sharedStyles = await readProjectFile(sharedStylesPath);
const globalsCss = await readProjectFile("src/styles/globals.css");
const webLayout = await readProjectFile("src/layouts/WebLayout.astro");

for (const key of requiredSharedKeys) {
  if (!new RegExp(`\\b${escapeRegExp(key)}\\s*(?::|,)`).test(sharedStyles)) {
    failures.push(`${sharedStylesPath}: expected docsSnippetStyles.${key} to be defined.`);
  }
}

for (const consumer of consumers) {
  const source = await readProjectFile(consumer.file);
  if (!source.includes("docsSnippetStyles")) {
    failures.push(`${consumer.file}: expected this snippet surface to use docsSnippetStyles.`);
  }
  for (const requiredUse of consumer.requiredUses) {
    if (!source.includes(requiredUse)) {
      failures.push(`${consumer.file}: expected ${requiredUse} to keep snippet styling shared.`);
    }
  }
  for (const fragment of guardedClassFragments) {
    for (const lineNumber of matchingLineNumbers(source, fragment)) {
      failures.push(
        `${consumer.file}:${lineNumber}: move "${fragment}" to docsSnippetStyles instead of duplicating snippet classes.`
      );
    }
  }
}

for (const fragment of requiredRuntimeClassFragments) {
  if (!sharedStyles.includes(fragment)) {
    failures.push(`${sharedStylesPath}: expected Tailwind runtime snippet styling fragment "${fragment}".`);
  }
}

for (const removedPath of removedRuntimeCssPaths) {
  if (await projectFileExists(removedPath)) {
    failures.push(`${removedPath}: snippet runtime styling should be owned by Tailwind classes in ${sharedStylesPath}.`);
  }
}

if (webLayout.includes("@/styles/generated/docs-snippet-runtime.css")) {
  failures.push("src/layouts/WebLayout.astro: remove the copied snippet runtime CSS import.");
}

for (const fragment of [
  ".docs-code-block .shiki",
  ".docs-code-callouts",
  ".docs-properties-template table.tableblock"
]) {
  if (globalsCss.includes(fragment)) {
    failures.push(`src/styles/globals.css: move "${fragment}" rules to Tailwind classes in ${sharedStylesPath}.`);
  }
}

if (failures.length) {
  throw new Error(`Docs snippet style sharing check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(`Validated docs snippet style sharing across ${consumers.length} consumers.`);

async function readProjectFile(relativePath) {
  return fs.readFile(path.join(projectDirectory, relativePath), "utf8");
}

async function projectFileExists(relativePath) {
  try {
    await fs.access(path.join(projectDirectory, relativePath));
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function matchingLineNumbers(source, fragment) {
  return source
    .split(/\r?\n/)
    .map((line, index) => (line.includes(fragment) ? index + 1 : undefined))
    .filter(Boolean);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
