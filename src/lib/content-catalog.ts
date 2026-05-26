import docsProjectCatalogFixture from "@/data/docs-projects.fixture.json";
import generatedGuidesManifest from "@/data/generated-guides.fixture.json";
export type CatalogCategory = {
  slug: string;
  name: string;
  icon: string;
  description: string;
  projectSlugs?: string[];
};

export type DocsSection = {
  id: string;
  number: string;
  title: string;
  summary: string;
};

export type CatalogLink = {
  label: string;
  href: string;
};

export type DocsCatalogProject = {
  slug: string;
  displayName: string;
  shortName: string;
  projectKey: string;
  module: string;
  repositoryName: string;
  repositoryUrl: string;
  publishedGuideUrl: string;
  branch: string;
  submodulePath: string;
  platformVersionKey: string;
  version: string;
  icon: string;
  primaryCategory: string;
  categorySlugs: string[];
  shortDescription: string;
  longDescription: string;
};

export type DocsProject = DocsCatalogProject & {
  href: string;
  sections: DocsSection[];
  references: CatalogLink[];
  searchTerms: string[];
};

export type DocsProjectCatalog = {
  source: string;
  publishedSource: string;
  projectCount: number;
  categories: CatalogCategory[];
  projects: DocsCatalogProject[];
};

export type GeneratedGuideOption = {
  id: string;
  label: string;
  language: string;
  languageLabel: string;
  buildTool: string;
  buildToolLabel: string;
  file: string;
  fragment: string;
  zipUrl: string;
};

export type GeneratedGuide = {
  slug: string;
  title: string;
  intro: string;
  authors: string[];
  tags: string[];
  categories: string[];
  publicationDate: string;
  estimatedMinutes: number;
  overviewFile: string;
  defaultOptionFile: string;
  options: GeneratedGuideOption[];
};

export type GeneratedGuidesManifest = {
  generatedAt: string;
  guideCount: number;
  guides: GeneratedGuide[];
};

export type SearchItem = {
  kind:
    | "Project"
    | "Guide"
    | "Section"
    | "Tag"
    | "Docs"
    | "Property"
    | "Class"
    | "Repo";
  title: string;
  description: string;
  href: string;
  terms: string;
  scope?: "Projects" | "Docs" | "Properties" | "Classes" | "Repos";
};

export const staticDocsProjectCatalog =
  docsProjectCatalogFixture as DocsProjectCatalog;

export const staticGeneratedGuidesManifest =
  generatedGuidesManifest as GeneratedGuidesManifest;

export function docsProjectFromCatalog(project: DocsCatalogProject): DocsProject {
  return {
    ...project,
    href: `/docs/${project.slug}/`,
    sections: docsProjectSections(project),
    references: docsProjectReferences(project),
    searchTerms: docsProjectSearchTerms(project),
  };
}

export function docsProjectBySlug(slug: string): DocsProject | undefined {
  const project = staticDocsProjectCatalog.projects.find(
    (candidate) => candidate.slug === slug,
  );
  return project ? docsProjectFromCatalog(project) : undefined;
}

export function featuredProjects() {
  const preferred = [
    "core",
    "serde",
    "data",
    "security",
    "mcp",
    "oracle-cloud",
    "sourcegen",
    "openapi",
  ];
  return preferred
    .map((slug) => docsProjectBySlug(slug))
    .filter(Boolean) as DocsProject[];
}

export function featuredGuides() {
  const preferred = [
    "creating-your-first-micronaut-app",
    "micronaut-http-client",
    "micronaut-data-jdbc-repository",
    "micronaut-security-jwt",
    "micronaut-mcp-server",
    "micronaut-graalvm-native-image",
  ];
  const selected = preferred
    .map((slug) =>
      staticGeneratedGuidesManifest.guides.find((guide) => guide.slug === slug),
    )
    .filter(Boolean) as GeneratedGuide[];
  return selected.length ? selected : staticGeneratedGuidesManifest.guides;
}

export function latestGuideSummaries(limit = 8) {
  return latestGuides(staticGeneratedGuidesManifest.guides, limit);
}

export function guideCategories() {
  return Array.from(
    new Set(staticGeneratedGuidesManifest.guides.flatMap((guide) => guide.categories)),
  )
    .sort()
    .map((category) => ({
      slug: tagSlug(category),
      name: category,
      icon: "book-open",
    }));
}

export function guideOverviewPath(
  guide: Pick<GeneratedGuide, "overviewFile">,
  root = "/latest",
) {
  return `${normalizedRoot(root)}/${guide.overviewFile}`;
}

export function guideTagPath(tag: string, root = "/latest") {
  return `${normalizedRoot(root)}/tag-${tagSlug(tag)}.html`;
}

export function tagSlug(tag: string) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function searchItems(): SearchItem[] {
  const projects = staticDocsProjectCatalog.projects.map(docsProjectFromCatalog);
  const projectItems: SearchItem[] = projects.map((project) => ({
    kind: "Project",
    title: project.displayName,
    description: project.shortDescription,
    href: project.href,
    terms: [
      project.displayName,
      project.shortDescription,
      project.longDescription,
      ...project.searchTerms,
    ].join(" "),
  }));
  const sectionItems: SearchItem[] = projects.flatMap((project) =>
    project.sections.map((section) => ({
      kind: "Section",
      title: `${project.displayName}: ${section.title}`,
      description: section.summary,
      href: `${project.href}#${section.id}`,
      terms: [project.displayName, section.title, section.summary].join(" "),
    })),
  );
  const guideItems: SearchItem[] = staticGeneratedGuidesManifest.guides.map(
    (guide) => ({
      kind: "Guide",
      title: guide.title,
      description: guide.intro,
      href: guideOverviewPath(guide, "/guides"),
      terms: [
        guide.title,
        guide.intro,
        ...guide.tags,
        ...guide.categories,
        ...guide.authors,
      ].join(" "),
    }),
  );
  const tagItems: SearchItem[] = Array.from(
    new Set(staticGeneratedGuidesManifest.guides.flatMap((guide) => guide.tags)),
  )
    .sort()
    .slice(0, 80)
    .map((tag) => ({
      kind: "Tag",
      title: tag,
      description: "Guides tagged with this topic",
      href: guideTagPath(tag, "/guides"),
      terms: tag,
    }));
  return [...projectItems, ...sectionItems, ...guideItems, ...tagItems];
}

export function docsSearchItems(): SearchItem[] {
  return staticDocsProjectCatalog.projects.flatMap((project) => {
    const docsProject = docsProjectFromCatalog(project);
    const projectTerms = [
      project.displayName,
      project.shortName,
      project.projectKey,
      project.module,
      project.repositoryName,
      project.shortDescription,
      project.longDescription,
      ...docsProject.searchTerms,
    ]
      .filter(Boolean)
      .join(" ");
    return [
      {
        kind: "Project" as const,
        title: project.displayName,
        description: project.shortDescription || project.module,
        href: docsProject.href,
        terms: projectTerms,
        scope: "Projects" as const,
      },
      ...docsProject.sections.map((section) => ({
        kind: "Docs" as const,
        title: `${project.displayName}: ${section.title}`,
        description: section.summary,
        href: `${docsProject.href}#${section.id}`,
        terms: [
          project.displayName,
          section.number,
          section.title,
          section.summary,
        ].join(" "),
        scope: "Docs" as const,
      })),
      {
        kind: "Repo" as const,
        title: project.repositoryName,
        description: `Source repository for ${project.displayName}.`,
        href: project.repositoryUrl,
        terms: [
          project.displayName,
          project.repositoryName,
          project.repositoryUrl,
          project.module,
        ].join(" "),
        scope: "Repos" as const,
      },
    ];
  });
}

function docsProjectSections(project: DocsCatalogProject): DocsSection[] {
  return [
    {
      id: `${project.slug}-overview`,
      number: "1",
      title: "Overview",
      summary: `${project.displayName} overview, module coordinates, supported use cases, and published documentation entry points.`,
    },
    {
      id: `${project.slug}-configuration`,
      number: "2",
      title: "Configuration",
      summary: `Configuration options, dependency coordinates, and version-managed setup details for ${project.displayName}.`,
    },
    {
      id: `${project.slug}-api`,
      number: "3",
      title: "API Reference",
      summary: `API references, annotations, classes, and module-specific integration points for ${project.displayName}.`,
    },
    {
      id: `${project.slug}-source`,
      number: "4",
      title: "Source",
      summary: `Repository, branch, module, and platform metadata for ${project.displayName}.`,
    },
  ];
}

function docsProjectReferences(project: DocsCatalogProject): CatalogLink[] {
  return [
    { label: "Guide", href: project.publishedGuideUrl },
    { label: "Repository", href: project.repositoryUrl },
  ].filter((reference) => reference.href);
}

function docsProjectSearchTerms(project: DocsCatalogProject): string[] {
  return [
    project.slug,
    project.displayName,
    project.shortName,
    project.projectKey,
    project.module,
    project.repositoryName,
    project.primaryCategory,
    ...project.categorySlugs,
  ].filter(Boolean);
}

function latestGuides(guides: GeneratedGuide[], limit = 8) {
  return [...guides]
    .sort(
      (left, right) =>
        right.publicationDate.localeCompare(left.publicationDate) ||
        left.title.localeCompare(right.title),
    )
    .slice(0, limit);
}

function normalizedRoot(root: string) {
  const value = root.endsWith("/") ? root.slice(0, -1) : root;
  return value || "";
}
