import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { parse, type DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];

export type ExtractInlineAssetsOptions = {
  directory: string;
  assetDirectory?: string;
};

export type ExtractInlineAssetsResult = {
  files: number;
  scripts: number;
  styles: number;
  assets: number;
  writtenAssets: number;
};

type InlineAssetKind = "script" | "style";

type InlineAsset = {
  kind: InlineAssetKind;
  replacement: string;
  startOffset: number;
  endOffset: number;
};

type ExtractedAsset = {
  content: string;
  path: string;
};

const defaultAssetDirectory = "_astro/inline";
const htmlNamespace = "http://www.w3.org/1999/xhtml";
const executableScriptTypes = new Set([
  "",
  "application/ecmascript",
  "application/javascript",
  "application/x-ecmascript",
  "application/x-javascript",
  "module",
  "text/ecmascript",
  "text/javascript",
  "text/javascript1.0",
  "text/javascript1.1",
  "text/javascript1.2",
  "text/javascript1.3",
  "text/javascript1.4",
  "text/javascript1.5",
  "text/jscript",
  "text/livescript",
  "text/x-ecmascript",
  "text/x-javascript",
]);
const booleanAttributes = new Set(["async", "defer", "disabled", "nomodule"]);

export async function extractInlineAssets({
  directory,
  assetDirectory = defaultAssetDirectory,
}: ExtractInlineAssetsOptions): Promise<ExtractInlineAssetsResult> {
  const root = path.resolve(directory);
  const normalizedAssetDirectory = normalizedRelativePath(assetDirectory);
  const htmlFiles = (await listRegularFiles(root)).filter((file) =>
    file.endsWith(".html"),
  );
  const extractedAssets = new Map<string, ExtractedAsset>();
  const rewrites: Array<{ absoluteFile: string; html: string }> = [];
  let changedFiles = 0;
  let scripts = 0;
  let styles = 0;

  for (const htmlFile of htmlFiles) {
    const absoluteFile = filesystemPath(root, htmlFile);
    const html = await fs.readFile(absoluteFile, "utf8");
    const htmlDirectory = directoryName(htmlFile);
    const inlineAssets = collectInlineAssets(
      html,
      htmlDirectory,
      normalizedAssetDirectory,
      extractedAssets,
    );
    if (!inlineAssets.length) {
      continue;
    }

    const rewritten = rewriteHtml(html, inlineAssets);
    if (rewritten !== html) {
      changedFiles += 1;
      scripts += inlineAssets.filter((asset) => asset.kind === "script").length;
      styles += inlineAssets.filter((asset) => asset.kind === "style").length;
      rewrites.push({ absoluteFile, html: rewritten });
    }
  }

  let writtenAssets = 0;
  for (const asset of extractedAssets.values()) {
    const absoluteAsset = filesystemPath(root, asset.path);
    if (await exists(absoluteAsset)) {
      continue;
    }
    await fs.mkdir(path.dirname(absoluteAsset), { recursive: true });
    await fs.writeFile(absoluteAsset, asset.content, "utf8");
    writtenAssets += 1;
  }

  await Promise.all(
    rewrites.map((rewrite) =>
      fs.writeFile(rewrite.absoluteFile, rewrite.html, "utf8"),
    ),
  );
  await pruneUnusedInlineAssets(root, normalizedAssetDirectory);

  return {
    files: changedFiles,
    scripts,
    styles,
    assets: extractedAssets.size,
    writtenAssets,
  };
}

function collectInlineAssets(
  html: string,
  htmlDirectory: string,
  assetDirectory: string,
  extractedAssets: Map<string, ExtractedAsset>,
): InlineAsset[] {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const inlineAssets: InlineAsset[] = [];
  visitElements(document, (element) => {
    if (element.namespaceURI !== htmlNamespace) {
      return;
    }

    if (element.tagName === "script") {
      const script = inlineScriptAsset(
        html,
        htmlDirectory,
        assetDirectory,
        extractedAssets,
        element,
      );
      if (script) {
        inlineAssets.push(script);
      }
      return;
    }

    if (element.tagName === "style") {
      const style = inlineStyleAsset(
        html,
        htmlDirectory,
        assetDirectory,
        extractedAssets,
        element,
      );
      if (style) {
        inlineAssets.push(style);
      }
    }
  });
  return inlineAssets;
}

function inlineScriptAsset(
  html: string,
  htmlDirectory: string,
  assetDirectory: string,
  extractedAssets: Map<string, ExtractedAsset>,
  element: Element,
): InlineAsset | undefined {
  if (hasAttribute(element, "src") || !isExecutableScript(element)) {
    return undefined;
  }
  const content = elementContent(html, element);
  if (content === undefined || !content.trim()) {
    return undefined;
  }
  const assetPath = assetPathFor("script", "js", content, assetDirectory);
  extractedAssets.set(assetPath, {
    content,
    path: assetPath,
  });
  return {
    kind: "script",
    replacement: scriptTag(
      element,
      relativeReference(htmlDirectory, assetPath),
    ),
    startOffset: element.sourceCodeLocation?.startOffset ?? 0,
    endOffset: element.sourceCodeLocation?.endOffset ?? 0,
  };
}

function inlineStyleAsset(
  html: string,
  htmlDirectory: string,
  assetDirectory: string,
  extractedAssets: Map<string, ExtractedAsset>,
  element: Element,
): InlineAsset | undefined {
  const content = elementContent(html, element);
  if (content === undefined || !content.trim()) {
    return undefined;
  }
  const assetPath = assetPathFor("style", "css", content, assetDirectory);
  extractedAssets.set(assetPath, {
    content,
    path: assetPath,
  });
  return {
    kind: "style",
    replacement: styleLinkTag(
      element,
      relativeReference(htmlDirectory, assetPath),
    ),
    startOffset: element.sourceCodeLocation?.startOffset ?? 0,
    endOffset: element.sourceCodeLocation?.endOffset ?? 0,
  };
}

function elementContent(html: string, element: Element) {
  const location = element.sourceCodeLocation;
  if (!location?.startTag || !location.endTag) {
    return undefined;
  }
  return html.slice(location.startTag.endOffset, location.endTag.startOffset);
}

function isExecutableScript(element: Element) {
  const type = normalizedScriptType(attributeValue(element, "type"));
  return executableScriptTypes.has(type);
}

function normalizedScriptType(value: string | undefined) {
  if (!value) {
    return "";
  }
  return value.split(";")[0].trim().toLowerCase();
}

function scriptTag(element: Element, src: string) {
  const attributes = serializedAttributes(element, ["src"]);
  return `<script${attributes} src="${htmlAttribute(src)}"></script>`;
}

function styleLinkTag(element: Element, href: string) {
  const attributes = serializedAttributes(element, ["href", "rel"]);
  return `<link rel="stylesheet"${attributes} href="${htmlAttribute(href)}">`;
}

function serializedAttributes(element: Element, omittedNames: string[]) {
  const omitted = new Set(omittedNames.map((name) => name.toLowerCase()));
  return element.attrs
    .filter((attribute) => !omitted.has(attribute.name.toLowerCase()))
    .map((attribute) => {
      const name = attribute.prefix
        ? `${attribute.prefix}:${attribute.name}`
        : attribute.name;
      if (
        booleanAttributes.has(attribute.name.toLowerCase()) &&
        attribute.value === ""
      ) {
        return ` ${name}`;
      }
      return ` ${name}="${htmlAttribute(attribute.value)}"`;
    })
    .join("");
}

function assetPathFor(
  prefix: InlineAssetKind,
  extension: "css" | "js",
  content: string,
  assetDirectory: string,
) {
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 16);
  return path.posix.join(assetDirectory, `${prefix}.${hash}.${extension}`);
}

function rewriteHtml(html: string, inlineAssets: InlineAsset[]) {
  return inlineAssets
    .slice()
    .sort((left, right) => right.startOffset - left.startOffset)
    .reduce(
      (rewritten, asset) =>
        `${rewritten.slice(0, asset.startOffset)}${asset.replacement}${rewritten.slice(asset.endOffset)}`,
      html,
    );
}

function visitElements(node: Node, visitor: (element: Element) => void) {
  if (isElement(node)) {
    visitor(node);
  }
  if (!hasChildNodes(node)) {
    return;
  }
  for (const child of node.childNodes) {
    visitElements(child, visitor);
  }
}

function isElement(node: Node): node is Element {
  return "tagName" in node;
}

function hasChildNodes(
  node: Node,
): node is Node & { childNodes: DefaultTreeAdapterMap["childNode"][] } {
  return "childNodes" in node;
}

function hasAttribute(element: Element, name: string) {
  return attributeValue(element, name) !== undefined;
}

function attributeValue(element: Element, name: string) {
  const lowerName = name.toLowerCase();
  return element.attrs.find(
    (attribute) => attribute.name.toLowerCase() === lowerName,
  )?.value;
}

async function listRegularFiles(
  directory: string,
  prefix = "",
): Promise<string[]> {
  let entries: Array<import("node:fs").Dirent>;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isNotFound(error)) {
      return [];
    }
    throw error;
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listRegularFiles(fullPath, relativePath);
      }
      if (entry.isFile()) {
        return [relativePath];
      }
      return [];
    }),
  );
  return files.flat();
}

async function pruneUnusedInlineAssets(
  root: string,
  assetDirectory: string,
): Promise<void> {
  const assetRoot = filesystemPath(root, assetDirectory);
  const existingAssets = await listRegularFiles(assetRoot);
  if (!existingAssets.length) {
    return;
  }

  const htmlFiles = (await listRegularFiles(root)).filter((file) =>
    file.endsWith(".html"),
  );
  const referencedAssets = new Set<string>();
  await Promise.all(
    htmlFiles.map(async (htmlFile) => {
      const html = await fs.readFile(filesystemPath(root, htmlFile), "utf8");
      const htmlDirectory = directoryName(htmlFile);
      for (const match of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
        const assetReference = inlineAssetReference(
          htmlDirectory,
          match[1],
          assetDirectory,
        );
        if (assetReference) {
          referencedAssets.add(assetReference);
        }
      }
    }),
  );

  await Promise.all(
    existingAssets.map(async (asset) => {
      const assetPath = path.posix.join(assetDirectory, asset);
      if (referencedAssets.has(assetPath)) {
        return;
      }
      await fs.rm(filesystemPath(root, assetPath), { force: true });
    }),
  );
  await removeEmptyDirectories(assetRoot, assetRoot);
}

function inlineAssetReference(
  htmlDirectory: string,
  value: string,
  assetDirectory: string,
) {
  const pathOnly = value.split(/[?#]/, 1)[0];
  if (!pathOnly || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(pathOnly)) {
    return undefined;
  }

  const absoluteMarker = `/${assetDirectory}/`;
  if (pathOnly.startsWith("/") && pathOnly.includes(absoluteMarker)) {
    return pathOnly.slice(pathOnly.indexOf(absoluteMarker) + 1);
  }
  if (pathOnly.startsWith("/")) {
    const relative = normalizedRelativePath(pathOnly);
    return relative.startsWith(`${assetDirectory}/`) ? relative : undefined;
  }

  const relative = path.posix.normalize(
    path.posix.join(htmlDirectory || ".", pathOnly),
  );
  return relative.startsWith(`${assetDirectory}/`) ? relative : undefined;
}

async function removeEmptyDirectories(
  directory: string,
  stopDirectory: string,
): Promise<void> {
  let entries: Array<import("node:fs").Dirent>;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isNotFound(error)) {
      return;
    }
    throw error;
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) =>
        removeEmptyDirectories(path.join(directory, entry.name), stopDirectory),
      ),
  );

  if (directory === stopDirectory) {
    return;
  }
  const remainingEntries = await fs.readdir(directory);
  if (!remainingEntries.length) {
    await fs.rmdir(directory);
  }
}

function relativeReference(fromDirectory: string, target: string) {
  const relative = path.posix.relative(fromDirectory || ".", target);
  if (!relative || relative.startsWith(".")) {
    return relative || ".";
  }
  return relative.includes("/") ? relative : `./${relative}`;
}

function normalizedRelativePath(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function filesystemPath(root: string, relativePath: string) {
  const parts = relativePath ? relativePath.split("/") : [];
  return path.join(root, ...parts);
}

function directoryName(file: string) {
  const directory = path.posix.dirname(file);
  return directory === "." ? "" : directory;
}

async function exists(file: string) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function isNotFound(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function htmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
