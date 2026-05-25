import { promises as fs } from "node:fs";

export async function isRegularFile(file: any): Promise<any> {
  return (await fs.stat(file).catch((): any => undefined))?.isFile() || false;
}

export async function isDirectory(file: any): Promise<any> {
  return (
    (await fs.stat(file).catch((): any => undefined))?.isDirectory() || false
  );
}
