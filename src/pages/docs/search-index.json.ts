import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";

import { buildDocsSearchIndex } from "../../../scripts/docs/search-index.ts";
import { docsProjectCatalog, projectBySlug } from "@/lib/protocol";

const generatedDocsDirectory = join(
  process.cwd(),
  "src",
  "content",
  "generated-docs",
);

export const prerender = true;

export async function GET() {
  const generatedHtmlBySlug = await readGeneratedDocsHtml();
  const projects = docsProjectCatalog.projects.map((project) => {
    const protocolProject = projectBySlug(project.slug);
    return {
      ...protocolProject,
      ...project,
      href: protocolProject?.href || `/docs/${project.slug}/`,
      sections: protocolProject?.sections || [],
      references: protocolProject?.references || [
        { label: "Guide", href: project.publishedGuideUrl },
        { label: "Repository", href: project.repositoryUrl },
      ],
      searchTerms: protocolProject?.searchTerms || [],
    };
  });

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
