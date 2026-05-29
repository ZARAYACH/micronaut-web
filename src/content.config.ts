import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const mainSitePages = defineCollection({
  loader: glob({
    base: "./src/content/main-site/pages",
    pattern: ["**/*.md", "!code-examples/*.md"]
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
    intro: z.string().optional(),
    layoutVariant: z.enum(["public-markdown"]).optional(),
    storyOrder: z.number().optional(),
    redirectFrom: z.array(z.string()).default([]),
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
    logo: z.string().optional(),
    logoDark: z.string().optional(),
    logoClass: z.string().optional(),
    logoInvertOnDark: z.boolean().default(false)
  })
});

const codeExamples = defineCollection({
  loader: glob({
    base: "./src/content/main-site/pages/code-examples",
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
    logoDark: z.string().optional(),
    logoClass: z.string().optional(),
    logoInvertOnDark: z.boolean().default(false)
  })
});

export const collections = {
  codeExamples,
  mainSitePages,
  blogPosts
};
