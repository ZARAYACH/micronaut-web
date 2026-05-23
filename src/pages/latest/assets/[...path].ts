import type { APIRoute, GetStaticPaths } from "astro";
import { promises as fs } from "node:fs";
import path from "node:path";

const generatedAssetsDirectory = path.join(process.cwd(), "src", "content", "generated-guides", "assets");

export const getStaticPaths = (async () => {
  const assets = await listAssets(generatedAssetsDirectory);
  return assets.map((assetPath) => ({
    params: { path: assetPath }
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const assetPath = params.path;
  if (!assetPath || isUnsafePath(assetPath)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(path.join(generatedAssetsDirectory, ...assetPath.split("/")));
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": contentTypeFor(assetPath)
      }
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
};

async function listAssets(directory: string, prefix = ""): Promise<string[]> {
  let entries: Array<import("node:fs").Dirent>;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const assets = await Promise.all(entries.map(async (entry) => {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listAssets(fullPath, relativePath);
    }
    if (entry.isFile()) {
      return [relativePath];
    }
    return [];
  }));

  return assets.flat();
}

function isUnsafePath(assetPath: string) {
  return assetPath.split("/").some((part) => part === ".." || part === "");
}

function contentTypeFor(assetPath: string) {
  switch (path.extname(assetPath).toLowerCase()) {
    case ".gif":
      return "image/gif";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
