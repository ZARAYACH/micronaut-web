import type {
  CodeSnippetLanguage,
  CodeSnippetVariant
} from "@/components/web/docs-code-snippet";
import {
  codeLanguageFromFenceInfo,
  formatCodeLanguage,
  highlighterLanguageFor
} from "@/lib/code-snippet-languages";

const codeFencePattern = /^( {0,3})(`{3,}|~{3,})([^\r\n]*)\r?\n([\s\S]*?)^\1\2[ \t]*$/gm;
const supportedCodeSnippetLanguages = new Set<CodeSnippetLanguage>([
  "bash",
  "gradle",
  "groovy",
  "java",
  "kotlin",
  "maven",
  "text"
]);
const codeSnippetLanguageAliases: Record<string, CodeSnippetLanguage> = {
  bash: "bash",
  xml: "maven"
};

export function parseMarkdownCodeSnippetVariants(markdown: string, context = "Markdown code example"): CodeSnippetVariant[] {
  const variants = Array.from(markdown.matchAll(codeFencePattern), (match) => {
    const info = match[3]?.trim() ?? "";
    const code = trimTrailingNewline(match[4] ?? "");
    const detectedLanguage = codeLanguageFromFenceInfo(info, code, context);
    const language = supportedCodeSnippetLanguages.has(detectedLanguage as CodeSnippetLanguage)
      ? detectedLanguage as CodeSnippetLanguage
      : codeSnippetLanguageAliases[detectedLanguage] ?? "text";
    const label = formatCodeLanguage(language);
    const highlighterLanguage = highlighterLanguageFor(detectedLanguage);

    return {
      code,
      fileName: label,
      ...(highlighterLanguage !== language ? { highlighterLanguage } : {}),
      label,
      language
    };
  });

  if (variants.length === 0) {
    throw new Error(`${context} must define at least one fenced code block.`);
  }

  const languages = new Set<string>();
  for (const variant of variants) {
    if (languages.has(variant.language)) {
      throw new Error(`${context} defines duplicate "${variant.language}" code variants.`);
    }
    languages.add(variant.language);
  }

  return variants;
}

function trimTrailingNewline(value: string) {
  return value.replace(/\r?\n$/, "");
}
