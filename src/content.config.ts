import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const linkSchema = z.object({
  label: z.string(),
  href: z.string(),
  external: z.boolean().optional()
});

const mainSitePages = defineCollection({
  loader: glob({
    base: "./src/content/main-site/pages",
    pattern: "**/*.md"
  }),
  schema: z.object({
    order: z.number(),
    title: z.string(),
    eyebrow: z.string(),
    description: z.string(),
    sourceUrl: z.string(),
    date: z.coerce.date().optional(),
    modified: z.coerce.date().optional(),
    wordpressId: z.number().optional(),
    contentSource: z.string().optional(),
    intro: z.string().optional(),
    sections: z.array(z.object({
      title: z.string(),
      body: z.string(),
      icon: z.string()
    })).default([])
  })
});

const mainSiteFooterGroups = defineCollection({
  loader: glob({
    base: "./src/content/main-site/footer",
    pattern: "*.md"
  }),
  schema: z.object({
    order: z.number(),
    title: z.string(),
    links: z.array(linkSchema)
  })
});

const codeExamples = defineCollection({
  loader: glob({
    base: "./src/content/code-examples",
    pattern: "*.md"
  }),
  schema: z.object({
    id: z.string(),
    order: z.number(),
    label: z.string(),
    title: z.string(),
    description: z.string()
  })
});

const blogPosts = defineCollection({
  loader: glob({
    base: "./src/content/main-site/blog",
    pattern: "**/*.md"
  }),
  schema: z.object({
    order: z.number().optional(),
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    date: z.coerce.date().optional(),
    modified: z.coerce.date().optional(),
    sourceUrl: z.string().optional(),
    wordpressId: z.number().optional(),
    contentSource: z.string().optional(),
    category: z.string().optional(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    organization: z.string().optional(),
    label: z.string().optional(),
    summary: z.string().optional(),
    detail: z.string().optional(),
    proofs: z.array(z.string()).default([]),
    scenario: z.string().optional(),
    challenge: z.string().optional(),
    micronautUse: z.string().optional(),
    outcome: z.string().optional(),
    technologies: z.array(z.string()).default([]),
    href: z.string().optional(),
    logo: z.string().optional(),
    logoClass: z.string().optional()
  })
});

export const collections = {
  codeExamples,
  mainSitePages,
  mainSiteFooterGroups,
  blogPosts
};
