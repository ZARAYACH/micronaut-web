import { getCollection, render, type CollectionEntry } from "astro:content";

import { withBasePath } from "@/lib/base-path";
import { routeSlugsForPost } from "@/lib/blog-redirects";
import { extractFaqItemsFromHtml, type MainSiteFaqItem } from "@/lib/main-site-faq";
import { renderMainSiteCodeSnippets } from "@/lib/main-site-code-snippets";

export type MainSitePageEntry = CollectionEntry<"mainSitePages">;
export type BlogPostEntry = CollectionEntry<"blogPosts">;

export type MainSitePageModel = {
  slug: string;
  entry: MainSitePageEntry;
};

export type MainSitePageSummary = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
};

export type GeneratedMainSitePage = MainSitePageSummary & {
  intro: string;
  contentSource: string;
};

export type MainSiteFooterGroup = {
  title: string;
  links: Array<{
    label: string;
    href: string;
  }>;
};

export type BlogPostModel = {
  slug: string;
  href: string;
  routeSlugs: string[];
  entry: BlogPostEntry;
};

export type BlogArchiveModel = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  page?: number;
  totalPages?: number;
};

export type SuccessStory = {
  title: string;
  organization: string;
  tag: string;
  summary: string;
  detail: string;
  proofs: string[];
  scenario: string;
  challenge: string;
  micronautUse: string;
  outcome: string;
  technologies: string[];
  href: string;
  sourceUrl?: string;
  logo?: string;
  logoClass?: string;
  logoInvertOnDark: boolean;
};

export type { MainSiteFaqItem };

export const generatedMainSitePages: GeneratedMainSitePage[] = [
  {
    slug: "micronaut-success-stories",
    title: "Micronaut Success Stories",
    eyebrow: "Resources",
    description: "Real teams use Micronaut for serverless APIs, Grails migrations, workflow orchestration, IoT microservices, event platforms, legacy tool upgrades, and SaaS backends.",
    intro: "The success stories index is generated from the metadata on each success-story page.",
    contentSource: "generated-success-stories"
  }
];

function slugFromEntry(entry: { id: string }) {
  return entry.id.replace(/\.md$/, "").replace(/\/index$/, "");
}

export function normalizeRouteSlug(slug: string) {
  return slug.replace(/^\/+|\/+$/g, "");
}

function localMainSiteResourcePath(pathname: string) {
  return `/micronaut-assets/main-site${pathname}`;
}

function rewriteMicronautPath(pathname: string) {
  if (pathname.startsWith("/wp-content/uploads/")) {
    return localMainSiteResourcePath(pathname);
  }
  return pathname;
}

function byOrderThenTitle<T extends { entry: { data: { order?: number; title: string } } }>(left: T, right: T) {
  return (left.entry.data.order ?? Number.MAX_SAFE_INTEGER) - (right.entry.data.order ?? Number.MAX_SAFE_INTEGER)
    || left.entry.data.title.localeCompare(right.entry.data.title);
}

function byPostDateThenOrder(left: BlogPostModel, right: BlogPostModel) {
  const leftDate = left.entry.data.date?.getTime() ?? 0;
  const rightDate = right.entry.data.date?.getTime() ?? 0;
  return rightDate - leftDate || byOrderThenTitle(left, right);
}

const footerPageGroups = [
  {
    title: "Start",
    slugs: ["learn", "download", "resources", "micronaut-success-stories"]
  },
  {
    title: "Learn",
    slugs: ["learn", "professional-training", "category/microcast", "category/webinar", "category/case-studies"]
  },
  {
    title: "Resources",
    slugs: [
      "resources",
      "upcoming-events",
      "blog",
      "category/release-announcements",
      "micronaut-roadmap",
      "category/security-announcements",
      "support",
      "resources/community-support",
      "faq",
      "contact"
    ]
  },
  {
    title: "Foundation",
    slugs: ["foundation", "foundation/corporate-sponsorship", "foundation/community-sponsorship", "foundation/sponsors", "meeting-minutes"]
  },
  {
    title: "Legal",
    slugs: ["brand-guidelines", "brand-guidelines/micronaut-logos", "brand-guidelines/micronaut-trademark-policy", "community-guidelines", "privacy-policy"]
  }
];

export async function getMainSitePages(): Promise<MainSitePageModel[]> {
  const entries = await getCollection("mainSitePages");
  return entries
    .map((entry: MainSitePageEntry) => ({
      slug: slugFromEntry(entry),
      entry
    }))
    .sort(byOrderThenTitle);
}

export async function getMainSitePageSummaries(): Promise<MainSitePageSummary[]> {
  const pages = await getMainSitePages();
  return [...generatedMainSitePages, ...pages.map(({ slug, entry }) => ({
    slug,
    title: entry.data.title,
    eyebrow: entry.data.eyebrow,
    description: cleanExcerptText(entry.data.description)
  }))];
}

export async function getMainSiteFooterGroups(): Promise<MainSiteFooterGroup[]> {
  const pagesBySlug = new Map((await getMainSitePageSummaries()).map((page) => [page.slug, page.title]));
  return footerPageGroups.map((group) => ({
    title: group.title,
    links: group.slugs.map((slug) => {
      const label = pagesBySlug.get(slug);
      if (!label) {
        throw new Error(`Footer page slug "${slug}" does not exist in main-site pages.`);
      }
      return {
        label,
        href: `/${slug}/`
      };
    })
  }));
}

export async function getBlogPosts(): Promise<BlogPostModel[]> {
  const entries = await getCollection("blogPosts");
  return entries
    .map((entry: BlogPostEntry) => ({
      slug: entry.data.slug,
      href: entry.data.href ?? `/${entry.data.slug}/`,
      routeSlugs: routeSlugsForPost(entry.data.slug),
      entry
    }))
    .sort(byPostDateThenOrder);
}

export async function getBlogPostByRouteSlug(slug: string): Promise<BlogPostModel | undefined> {
  const routeSlug = normalizeRouteSlug(slug);
  const posts = await getBlogPosts();
  return posts.find((post) => post.routeSlugs.includes(routeSlug));
}

export async function getBlogPostsForArchive(slug: string): Promise<BlogPostModel[]> {
  const posts = await getBlogPosts();
  const pageSize = 24;
  if (slug === "blog") {
    return posts.filter((post) => post.entry.data.category !== "success-story").slice(0, pageSize);
  }
  const blogPageMatch = slug.match(/^blog\/page\/(\d+)$/);
  if (blogPageMatch) {
    const page = Number(blogPageMatch[1]);
    if (!Number.isInteger(page) || page < 1) {
      return [];
    }
    const blogPosts = posts.filter((post) => post.entry.data.category !== "success-story");
    return blogPosts.slice((page - 1) * pageSize, page * pageSize);
  }
  if (slug.startsWith("tag/")) {
    const tagSlug = slug.slice("tag/".length);
    return posts.filter((post) => post.entry.data.tags.includes(tagSlug));
  }
  if (!slug.startsWith("category/")) {
    return [];
  }
  const categorySlug = slug.slice("category/".length);
  return posts.filter((post) => post.entry.data.category === categorySlug || post.entry.data.categories.includes(categorySlug));
}

export async function getBlogArchiveRoutes(): Promise<BlogArchiveModel[]> {
  const posts = await getBlogPosts();
  const blogPosts = posts.filter((post) => post.entry.data.category !== "success-story");
  const pageSize = 24;
  const totalPages = Math.ceil(blogPosts.length / pageSize);
  const blogPageRoutes = Array.from({ length: Math.max(0, totalPages - 1) }, (_item, index) => {
    const page = index + 2;
    return {
      slug: `blog/page/${page}`,
      title: `Micronaut Blog - Page ${page}`,
      eyebrow: "Blog",
      description: "Browse Micronaut project news, technical articles, release posts, and ecosystem updates.",
      page,
      totalPages
    };
  });
  const tags = Array.from(new Set(posts.flatMap((post) => post.entry.data.tags))).filter(Boolean).sort();
  const tagRoutes = tags.map((tag) => ({
    slug: `tag/${tag}`,
    title: `Micronaut posts tagged ${tag}`,
    eyebrow: "Tag",
    description: `Browse Micronaut blog posts tagged ${tag}.`
  }));
  return [...blogPageRoutes, ...tagRoutes];
}

export async function getSuccessStories(): Promise<SuccessStory[]> {
  const pages = await getMainSitePages();
  return pages
    .filter((page) => page.slug.startsWith("micronaut-success-stories/"))
    .sort((left, right) => {
      const leftOrder = left.entry.data.storyOrder ?? left.entry.data.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.entry.data.storyOrder ?? right.entry.data.order ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.entry.data.title.localeCompare(right.entry.data.title);
    })
    .map(({ slug, entry }) => ({
      title: entry.data.title,
      organization: entry.data.organization ?? entry.data.title,
      tag: entry.data.label ?? "Story",
      summary: entry.data.summary ?? entry.data.description,
      detail: entry.data.detail ?? entry.data.description,
      proofs: entry.data.proofs,
      scenario: entry.data.scenario ?? entry.data.title,
      challenge: entry.data.challenge ?? entry.data.description,
      micronautUse: entry.data.micronautUse ?? entry.data.description,
      outcome: entry.data.outcome ?? entry.data.description,
      technologies: entry.data.technologies,
      href: `/${slug}/`,
      sourceUrl: entry.data.sourceUrl,
      logo: entry.data.logo,
      logoClass: entry.data.logoClass,
      logoInvertOnDark: entry.data.logoInvertOnDark
    }));
}

export async function renderMarkdownHtml(entry: MainSitePageEntry | BlogPostEntry) {
  await render(entry);
  const html = stripGeneratedPermalinkParagraphs(rewriteRootRelativeHtml(entry.rendered?.html ?? ""));
  return renderMainSiteCodeSnippets(html);
}

export async function renderFaqItems(entry: MainSitePageEntry | BlogPostEntry): Promise<MainSiteFaqItem[]> {
  return extractFaqItemsFromHtml(await renderMarkdownHtml(entry));
}

function rewriteRootRelativeHtml(html: string) {
  return html.replace(/\b(href|src)="https?:\/\/micronaut\.io(\/[^"]*)"/g, (_match, attribute: string, value: string) => {
    return `${attribute}="${withBasePath(rewriteMicronautPath(value))}"`;
  }).replace(/\b(href|src)="(\/(?!\/)[^"]*)"/g, (_match, attribute: string, value: string) => {
    return `${attribute}="${withBasePath(rewriteMicronautPath(value))}"`;
  });
}

export function cleanExcerptText(value: string) {
  return decodeHtml(value)
    .replace(/\s*\[(?:&hellip;|…|\.\.\.)\]\s*$/gi, "...")
    .replace(/\s*\[&amp;hellip;\]\s*$/gi, "...")
    .replace(/\s+/g, " ")
    .trim();
}

function stripGeneratedPermalinkParagraphs(html: string) {
  return html.replace(/<p>\s*<a\s+([^>]*\bhref="([^"]+)"[^>]*)>([\s\S]*?)<\/a>\s*<\/p>/gi, (match, _attributes: string, href: string, labelHtml: string) => {
    const label = decodeHtml(stripHtml(labelHtml)).trim();
    const decodedHref = decodeHtml(href).trim();
    if (label === decodedHref && isGeneratedPermalink(decodedHref)) {
      return "";
    }
    return match;
  });
}

function isGeneratedPermalink(href: string) {
  try {
    const url = new URL(href);
    return Boolean(url.hash) && url.hostname === "github.com" && url.pathname.includes("/wiki/");
  } catch {
    return false;
  }
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "");
}

function decodeHtml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;|&apos;/g, "'");
}
