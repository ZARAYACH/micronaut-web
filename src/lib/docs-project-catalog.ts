import { readFile } from "node:fs/promises";
import { join } from "node:path";

import fallbackDocsProjectCatalog from "@/data/docs-projects.fixture.json";
import type {
  DocsProjectCatalog,
  ProtocolCategory,
  ProtocolProject,
} from "@/lib/protocol";
import { projectBySlug } from "@/lib/protocol";

const generatedDocsProjectCatalogFile = join(
  process.cwd(),
  "src",
  "content",
  "generated-docs",
  "project-catalog.json",
);

export async function loadDocsProjectCatalog(): Promise<DocsProjectCatalog> {
  try {
    return JSON.parse(
      await readFile(generatedDocsProjectCatalogFile, "utf8"),
    ) as DocsProjectCatalog;
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }
    return fallbackDocsProjectCatalog as DocsProjectCatalog;
  }
}

export function docsCatalogProjectsByCategory(
  catalog: DocsProjectCatalog,
  category: ProtocolCategory,
): ProtocolProject[] {
  const selected = new Set(category.projectSlugs || []);
  return catalog.projects
    .filter((project) => selected.has(project.slug))
    .map((project) => docsCatalogProject(catalog, project.slug))
    .filter(Boolean) as ProtocolProject[];
}

export function docsCatalogProject(
  catalog: DocsProjectCatalog,
  slug: string,
): ProtocolProject | undefined {
  const catalogProject = catalog.projects.find(
    (project) => project.slug === slug,
  );
  if (!catalogProject) {
    return undefined;
  }
  const protocolProject = projectBySlug(slug);
  return {
    ...protocolProject,
    ...catalogProject,
    href: protocolProject?.href || `/docs/${catalogProject.slug}/`,
    sections: protocolProject?.sections || [],
    references: protocolProject?.references || [
      { label: "Guide", href: catalogProject.publishedGuideUrl },
      { label: "Repository", href: catalogProject.repositoryUrl },
    ],
    searchTerms: protocolProject?.searchTerms || [],
  } as ProtocolProject;
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
