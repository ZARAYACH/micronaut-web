import yaml from "js-yaml";
import { promises as fs } from "node:fs";
import path from "node:path";

import { isRegularFile } from "../shared/files.ts";

type TocMap = Record<string, unknown>;

export async function readGuideToc(guideSourceDirectory: string): Promise<any> {
  const tocFile = path.join(guideSourceDirectory, "toc.yml");
  const parsed = yaml.load(await fs.readFile(tocFile, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`TOC YAML must be a map: ${tocFile}`);
  }
  const toc = parsed as TocMap;

  const children: TocNode[] = [];
  await appendTocNodes(children, guideSourceDirectory, [], toc, 0, "");
  return {
    title: typeof toc.title === "string" ? toc.title : "",
    children,
  };
}

type TocNode = {
  level: number;
  number: string;
  id: string;
  title: string;
  file: string;
  children: TocNode[];
};

async function appendTocNodes(
  target: TocNode[],
  guideSourceDirectory: string,
  parentIds: string[],
  toc: TocMap,
  level: number,
  numberPrefix: string,
): Promise<any> {
  let index = 1;
  for (const [rawId, value] of Object.entries(toc)) {
    const id = tocKey(rawId);
    if (id === "title") {
      continue;
    }

    const number = numberPrefix ? `${numberPrefix}.${index}` : String(index);
    const title = tocTitle(id, value);
    const file = await determineFilePath(guideSourceDirectory, parentIds, id);
    const pathIds = [...parentIds, id];
    const children: TocNode[] = [];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const childSections = { ...(value as TocMap) };
      delete childSections.title;
      await appendTocNodes(
        children,
        guideSourceDirectory,
        pathIds,
        childSections,
        level + 1,
        number,
      );
    }

    target.push({ level, number, id, title, file, children });
    index += 1;
  }
}

function tocKey(value: any): any {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  throw new Error("TOC section keys must be non-blank strings.");
}

function tocTitle(id: string, value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const map = value as TocMap;
    if (typeof map.title === "string" && map.title.trim()) {
      return map.title.trim();
    }
    throw new Error(`TOC section '${id}' must define a non-blank title.`);
  }
  throw new Error(`TOC section '${id}' must be a string or map.`);
}

async function determineFilePath(
  guideSourceDirectory: any,
  parentIds: any,
  id: any,
): Promise<any> {
  let filePath = `${id}.adoc`;
  if (await isRegularFile(path.join(guideSourceDirectory, filePath))) {
    return filePath;
  }
  for (let depth = 1; depth <= parentIds.length; depth += 1) {
    filePath = path.join(...parentIds.slice(0, depth), `${id}.adoc`);
    if (await isRegularFile(path.join(guideSourceDirectory, filePath))) {
      return filePath;
    }
  }
  throw new Error(
    `Missing guide source file for TOC section '${id}' under ${guideSourceDirectory}`,
  );
}
