import type { DocsProject, Properties } from "./project-manifest.ts";

export type DocsProjectCatalog = {
  source: string;
  publishedSource: string;
  projectCount: number;
  categories: Array<{
    slug: string;
    name?: string;
    icon?: string;
    description?: string;
    projectSlugs?: string[];
  }>;
  projects: Array<
    DocsProject &
      Properties & {
        shortName: string;
        version: string;
        icon: string;
        primaryCategory: string;
        categorySlugs: string[];
        shortDescription: string;
        longDescription: string;
      }
  >;
};

export function buildDocsProjectCatalog({
  projects,
  platformVersions,
  existingCatalog,
  protocol,
  source,
  publishedSource,
}: {
  projects: DocsProject[];
  platformVersions: Properties;
  existingCatalog: Record<string, any>;
  protocol: Record<string, any>;
  source: string;
  publishedSource: string;
}): DocsProjectCatalog {
  const existingProjectsBySlug = new Map<
    string,
    DocsProjectCatalog["projects"][number]
  >(
    ((existingCatalog.projects || []) as DocsProjectCatalog["projects"]).map(
      (project: any): any => [project.slug, project],
    ),
  );
  const protocolProjectOrder = new Map<string, number>(
    (
      (protocol.docs as { projects?: Array<{ slug: string }> } | undefined)
        ?.projects || []
    ).map((project: any, index: any): any => [project.slug, index]),
  );
  const categories = (existingCatalog.categories ||
    []) as DocsProjectCatalog["categories"];

  const catalogProjects = projects
    .map((project: any): any => {
      const existingProject =
        existingProjectsBySlug.get(project.slug) ||
        ({} as DocsProjectCatalog["projects"][number]);
      const categorySlugs =
        existingProject.categorySlugs ||
        categories
          .filter((category: any): any =>
            (category.projectSlugs || []).includes(project.slug),
          )
          .map((category: any): any => category.slug);
      const primaryCategory =
        existingProject.primaryCategory || categorySlugs[0] || "other";

      return {
        slug: project.slug,
        displayName: project.displayName,
        shortName:
          existingProject.shortName ||
          project.displayName.replace(/^Micronaut\s+/i, ""),
        projectKey: project.projectKey,
        module: project.module,
        repositoryName: project.repositoryName,
        repositoryUrl: project.repositoryUrl,
        publishedGuideUrl: project.publishedGuideUrl,
        branch: project.branch,
        submodulePath: project.submodulePath,
        platformVersionKey: project.platformVersionKey,
        version:
          platformVersions[project.platformVersionKey] ||
          existingProject.version ||
          "",
        icon: existingProject.icon || "lucide:book-open",
        primaryCategory,
        categorySlugs,
        shortDescription:
          existingProject.shortDescription ||
          project.displayName.replace(/^Micronaut\s+/i, ""),
        longDescription:
          existingProject.longDescription ||
          `${project.displayName} documentation and reference material.`,
      };
    })
    .sort(
      (left: DocsProject, right: DocsProject): any =>
        projectOrder(left, protocolProjectOrder) -
        projectOrder(right, protocolProjectOrder),
    );

  return {
    source,
    publishedSource,
    projectCount: catalogProjects.length,
    categories,
    projects: catalogProjects,
  };
}

function projectOrder(
  project: DocsProject,
  protocolProjectOrder: Map<string, number>,
): number {
  return protocolProjectOrder.get(project.slug) ?? Number.MAX_SAFE_INTEGER;
}
