import { promises as fs } from "node:fs";
import path from "node:path";

import { isDirectory } from "../shared/files.ts";

export async function copyProjectImageAssets(
  project: any,
  docsDirectory: any,
  generatedDocsDirectory: any,
): Promise<any> {
  const sourceDirectory = path.join(
    docsDirectory,
    project.submodulePath,
    "src",
    "main",
    "docs",
    "resources",
    "img",
  );
  if (!(await isDirectory(sourceDirectory))) {
    return;
  }
  const targetDirectory = path.join(
    generatedDocsDirectory,
    "assets",
    project.slug,
    "docs",
    "img",
  );
  await fs.mkdir(path.dirname(targetDirectory), { recursive: true });
  await fs.cp(sourceDirectory, targetDirectory, { recursive: true });
}
