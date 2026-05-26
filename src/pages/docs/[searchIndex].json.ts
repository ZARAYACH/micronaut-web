import type { GetStaticPaths } from "astro";
import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";

import { buildDocsSearchIndex } from "../../../scripts/docs/search-index.ts";
import {
  docsCatalogProject,
  loadDocsProjectCatalog,
} from "@/lib/docs-project-catalog";
import type { ProtocolProject } from "@/lib/protocol";
import { shouldBuildDocsRoutes } from "@/lib/surface-routes";

const generatedDocsDirectory = join(
  process.cwd(),
  "src",
  "content",
  "generated-docs",
);

export const prerender = true;

export const getStaticPaths: GetStaticPaths = () => {
  if (!shouldBuildDocsRoutes()) {
    return [];
  }
  return [{ params: { searchIndex: "search-index" } }];
};

export async function GET() {
  const docsProjectCatalog = await loadDocsProjectCatalog();
  const generatedHtmlBySlug = await readGeneratedDocsHtml();
  const projects = docsProjectCatalog.projects
    .map((project) => docsCatalogProject(docsProjectCatalog, project.slug))
    .filter((project): project is ProtocolProject => Boolean(project));

  return new Response(
    JSON.stringify({
      items: buildDocsSearchIndex(projects, generatedHtmlBySlug),
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    },
  );
}

async function readGeneratedDocsHtml() {
  try {
    const files = (await readdir(generatedDocsDirectory)).filter((file) =>
      file.endsWith(".html"),
    );
    const entries = await Promise.all(
      files.map(async (file) => [
        basename(file, ".html"),
        await readFile(join(generatedDocsDirectory, file), "utf8"),
      ]),
    );
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}
