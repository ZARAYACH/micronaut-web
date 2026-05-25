import { getCollection, type CollectionEntry } from "astro:content";

import type {
  CodeSnippetExample
} from "@/components/web/docs-code-snippet";
import { parseMarkdownCodeSnippetVariants } from "@/lib/code-snippet-markdown";

type CodeExampleEntry = CollectionEntry<"codeExamples">;

export async function getMainCodeShowcaseExamples(): Promise<CodeSnippetExample[]> {
  const entries = await getCollection("codeExamples");
  return entries
    .sort(byOrderThenTitle)
    .map((entry: CodeExampleEntry) => ({
      id: entry.data.id,
      label: entry.data.label,
      title: entry.data.title,
      description: entry.data.description,
      variants: parseMarkdownCodeSnippetVariants(entry.body ?? "", `Code example "${entry.id}"`)
    }));
}

function byOrderThenTitle(left: CodeExampleEntry, right: CodeExampleEntry) {
  return left.data.order - right.data.order || left.data.title.localeCompare(right.data.title);
}
