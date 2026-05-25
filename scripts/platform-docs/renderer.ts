import { promises as fs } from "node:fs";
import path from "node:path";

import { platformDocsExtensionRegistry } from "./extensions.ts";
import {
  highlightListingBlocks,
  shikiStyle,
  unwrapBlockParagraphs,
} from "./highlight.ts";
import { attribute, html } from "./html.ts";
import { renderAttributes, sourceDocsEditUrl } from "./project-meta.ts";
import { readProperties } from "./project-manifest.ts";
import { normalizeAsciiDocSource } from "./source-normalizer.ts";
import { renderStaticDocsSnippets } from "./static-snippets.ts";
import { readGuideToc } from "./toc.ts";
import { optimizeImages, prefixIds, rewriteUrls } from "./urls.ts";

export async function renderProject(
  asciidoctor: any,
  platformDocsDirectory: any,
  project: any,
  platformVersion: any,
): Promise<any> {
  const submoduleDirectory = path.join(
    platformDocsDirectory,
    project.submodulePath,
  );
  const sourceDocsDirectory = path.join(
    submoduleDirectory,
    "src",
    "main",
    "docs",
  );
  const guideSourceDirectory = path.join(sourceDocsDirectory, "guide");
  const toc = await readGuideToc(guideSourceDirectory);
  const projectProperties = await readProperties(
    path.join(submoduleDirectory, "gradle.properties"),
    false,
  );
  const attributes = renderAttributes(
    project,
    platformVersion,
    submoduleDirectory,
    sourceDocsDirectory,
    projectProperties,
  );
  const context = {
    project,
    platformVersion,
    submoduleDirectory,
    sourceDocsDirectory,
    guideSourceDirectory,
    attributes,
  };

  let content = `<span class="project-document-anchor" id="${attribute(project.slug)}-docs" aria-hidden="true"></span>\n`;
  content += `<div class="project">\n    <h1>${html(project.displayName)}</h1>\n</div>\n`;
  for (const node of toc.children) {
    content += await renderNode(asciidoctor, context, node);
  }

  content = unwrapBlockParagraphs(content);
  content = await renderStaticDocsSnippets(content);
  content = await highlightListingBlocks(content);
  content = prefixIds(content, project.slug);
  content = rewriteUrls(content, project);
  content = optimizeImages(content);
  return `${shikiStyle()}\n${content.trim()}`;
}

async function renderNode(
  asciidoctor: any,
  context: any,
  node: any,
): Promise<any> {
  const sourceFile = path.join(context.guideSourceDirectory, node.file);
  let source = await fs.readFile(sourceFile, "utf8");
  source = normalizeAsciiDocSource(source);

  const converted = String(
    asciidoctor.convert(source, {
      attributes: context.attributes,
      base_dir: context.submoduleDirectory,
      extension_registry: platformDocsExtensionRegistry(asciidoctor, context),
      header_footer: false,
      safe: "unsafe",
    }),
  );

  let htmlContent = `${sectionHeading(context.project, node)}\n${converted}\n`;
  for (const child of node.children) {
    htmlContent += await renderNode(asciidoctor, context, child);
  }
  return htmlContent;
}

function sectionHeading(project: any, node: any): any {
  const headingLevel = node.level === 0 ? 1 : 2;
  const id = attribute(node.id);
  const editUrl = `${sourceDocsEditUrl(project)}/guide/${node.file}`;
  return `<div class="guide-section-heading">
    <h${headingLevel} id="${id}"><a class="anchor" href="#${id}"></a>${html(node.number)} ${html(node.title)}</h${headingLevel}>
    <a class="contribute-btn" href="${attribute(editUrl)}" title="Improve this doc" aria-label="Improve this doc">
        <svg class="button-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
        </svg>
    </a>
</div>`;
}
