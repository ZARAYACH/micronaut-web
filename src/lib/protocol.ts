import protocol from "@/data/protocol.json";
import platformDocsProjectFixture from "@/data/platform-docs-projects.fixture.json";

export type Surface = {
  id: "main" | "docs" | "guides";
  name: string;
  path: string;
  description: string;
};

export type ProtocolCategory = {
  slug: string;
  name: string;
  icon: string;
  description: string;
  projectSlugs?: string[];
  guideSlugs?: string[];
};

export type ProtocolSection = {
  id: string;
  number: string;
  title: string;
  summary: string;
};

export type ProtocolLink = {
  label: string;
  href: string;
};

export type ProtocolProject = {
  slug: string;
  displayName: string;
  shortName?: string;
  projectKey: string;
  module: string;
  repositoryName: string;
  repositoryUrl: string;
  publishedGuideUrl: string;
  branch: string;
  submodulePath: string;
  platformVersionKey: string;
  version?: string;
  icon: string;
  primaryCategory: string;
  categorySlugs: string[];
  href: string;
  publishedPlatformHref?: string;
  shortDescription: string;
  longDescription: string;
  sections: ProtocolSection[];
  references: ProtocolLink[];
  searchTerms: string[];
};

export type ProtocolGuideVariant = {
  id: string;
  label: string;
  app: string;
  language: string;
  buildTool: string;
  features: string[];
  href: string;
};

export type ProtocolGuideApp = {
  name: string;
  applicationType?: string;
  features: string[];
  javaFeatures?: string[];
  kotlinFeatures?: string[];
  groovyFeatures?: string[];
};

export type ProtocolGuide = {
  slug: string;
  title: string;
  intro: string;
  authors: string[];
  tags: string[];
  categories: string[];
  publicationDate: string;
  href: string;
  sourcePath: string;
  estimatedMinutes: number;
  apps?: ProtocolGuideApp[];
  variants: ProtocolGuideVariant[];
  searchTerms: string[];
};

export type SearchItem = {
  kind: "Project" | "Guide" | "Section" | "Tag";
  title: string;
  description: string;
  href: string;
  terms: string;
};

export type PlatformDocsProjectFixture = {
  source: string;
  publishedSource: string;
  projectCount: number;
  categories: ProtocolCategory[];
  projects: Array<Omit<ProtocolProject, "href" | "sections" | "references" | "searchTerms"> & {
    shortName: string;
    publishedPlatformHref: string;
    version: string;
  }>;
};

export const micronautProtocol = protocol as {
  protocolVersion: string;
  generatedAt: string;
  surfaces: Surface[];
  docs: {
    categories: ProtocolCategory[];
    projects: ProtocolProject[];
  };
  guides: {
    categories: ProtocolCategory[];
    guides: ProtocolGuide[];
  };
};

export const platformDocsProjects = platformDocsProjectFixture as PlatformDocsProjectFixture;

export function surfaceById(id: Surface["id"]) {
  return micronautProtocol.surfaces.find((surface) => surface.id === id)!;
}

export function projectBySlug(slug: string) {
  return micronautProtocol.docs.projects.find((project) => project.slug === slug);
}

export function guideBySlug(slug: string) {
  return micronautProtocol.guides.guides.find((guide) => guide.slug === slug);
}

export function docsByCategory(category: ProtocolCategory) {
  const selected = new Set(category.projectSlugs || []);
  return micronautProtocol.docs.projects.filter((project) => selected.has(project.slug));
}

export function platformDocsByCategory(category: ProtocolCategory) {
  const selected = new Set(category.projectSlugs || []);
  return platformDocsProjects.projects
    .filter((project) => selected.has(project.slug))
    .map((project) => {
      const protocolProject = projectBySlug(project.slug);
      return {
        ...protocolProject,
        ...project,
        href: protocolProject?.href || `/docs/${project.slug}/`,
        sections: protocolProject?.sections || [],
        references: protocolProject?.references || [
          { label: "Guide", href: project.publishedGuideUrl },
          { label: "Repository", href: project.repositoryUrl }
        ],
        searchTerms: protocolProject?.searchTerms || []
      } as ProtocolProject;
    });
}

export function guidesByCategory(category: ProtocolCategory) {
  const selected = new Set(category.guideSlugs || []);
  return micronautProtocol.guides.guides.filter((guide) => selected.has(guide.slug));
}

export function featuredProjects() {
  const preferred = ["core", "serde", "data", "security", "mcp", "oracle-cloud", "sourcegen", "openapi"];
  return preferred
    .map((slug) => projectBySlug(slug))
    .filter(Boolean) as ProtocolProject[];
}

export function featuredGuides() {
  const preferred = [
    "creating-your-first-micronaut-app",
    "micronaut-http-client",
    "micronaut-data-jdbc-repository",
    "micronaut-security-jwt",
    "micronaut-mcp-server",
    "micronaut-graalvm-native-image"
  ];
  const selected = preferred
    .map((slug) => guideBySlug(slug))
    .filter(Boolean) as ProtocolGuide[];
  return selected.length ? selected : micronautProtocol.guides.guides.slice(0, 8);
}

export function latestGuides(limit = 8) {
  return micronautProtocol.guides.guides.slice(0, limit);
}

export function searchItems(): SearchItem[] {
  const projectItems: SearchItem[] = micronautProtocol.docs.projects.map((project) => ({
    kind: "Project",
    title: project.displayName,
    description: project.shortDescription,
    href: project.href,
    terms: [project.displayName, project.shortDescription, project.longDescription, ...project.searchTerms].join(" ")
  }));
  const sectionItems: SearchItem[] = micronautProtocol.docs.projects.flatMap((project) =>
    project.sections.map((section) => ({
      kind: "Section",
      title: `${project.displayName}: ${section.title}`,
      description: section.summary,
      href: `${project.href}#${section.id}`,
      terms: [project.displayName, section.title, section.summary].join(" ")
    }))
  );
  const guideItems: SearchItem[] = micronautProtocol.guides.guides.map((guide) => ({
    kind: "Guide",
    title: guide.title,
    description: guide.intro,
    href: guide.href,
    terms: [guide.title, guide.intro, ...guide.tags, ...guide.categories, ...guide.searchTerms].join(" ")
  }));
  const tagItems: SearchItem[] = Array.from(new Set(micronautProtocol.guides.guides.flatMap((guide) => guide.tags)))
    .sort()
    .slice(0, 80)
    .map((tag) => ({
      kind: "Tag",
      title: tag,
      description: "Guides tagged with this topic",
      href: `/guides/tag-${guideTagSlug(tag)}.html`,
      terms: tag
    }));
  return [...projectItems, ...sectionItems, ...guideItems, ...tagItems];
}

function guideTagSlug(tag: string) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
