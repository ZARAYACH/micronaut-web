"use client";

import { useState } from "react";

import {
  DocsCodeSnippet,
  ShikiCodeBlock,
  type CodeSnippetExample,
  type CodeSnippetVariant,
} from "@/components/web/docs-code-snippet";
import {
  CopyIcon,
  DocsSnippetCodeLanguageIcon,
  DocsPropertiesSnippetCard,
  DocsSnippetCard,
  DocsSnippetCopyButton,
  DocsSnippetLanguageButton,
} from "@/components/web/docs-snippet-card";
import { docsSnippetStyles } from "@/components/web/docs-snippet-styles";
import {
  componentCodeVariants,
  componentTerminalVariants,
  dependencyVariants,
} from "@/components/web/snippet-test-data";
import { snippetVariantHighlightKey } from "@/lib/snippet-highlight-key";

type SnippetTestGalleryProps = {
  highlightedHtmlByKey?: Record<string, string>;
};

const componentCodeExampleBase: CodeSnippetExample = {
  id: "snippet-test-controller",
  label: "Controller",
  title: "Controller with callout-ready annotations",
  description:
    "Component-rendered Java, Kotlin, and Groovy tabs using the shared snippet card.",
  callouts: [
    <>
      The <code>@Controller</code> annotation defines the class as a controller
      mapped to the path <code>/hello</code>
    </>,
    <>
      The <code>@Get</code> annotation maps the index method to all requests
      that use an HTTP GET
    </>,
    <>
      A String <code>"Hello World"</code> is returned as the response
    </>,
  ],
  variants: componentCodeVariants,
};

const componentTerminalExampleBase: CodeSnippetExample = {
  id: "snippet-test-terminal",
  label: "Terminal",
  title: "Launch command",
  description:
    "Single-language terminal snippets should use the same light shell.",
  variants: componentTerminalVariants,
};

function exampleWithHighlightedHtml(
  example: CodeSnippetExample,
  highlightedHtmlByKey: Record<string, string> | undefined,
) {
  return {
    ...example,
    variants: variantsWithHighlightedHtml(
      example.id,
      example.variants,
      highlightedHtmlByKey,
    ),
  };
}

function variantsWithHighlightedHtml(
  snippetId: string,
  variants: CodeSnippetVariant[],
  highlightedHtmlByKey: Record<string, string> | undefined,
) {
  return variants.map((variant) => ({
    ...variant,
    highlightedHtml:
      highlightedHtmlByKey?.[
        snippetVariantHighlightKey(snippetId, variant.language)
      ],
  }));
}

export function SnippetTestGallery({
  highlightedHtmlByKey,
}: SnippetTestGalleryProps) {
  const componentCodeExample = exampleWithHighlightedHtml(
    componentCodeExampleBase,
    highlightedHtmlByKey,
  );
  const componentTerminalExample = exampleWithHighlightedHtml(
    componentTerminalExampleBase,
    highlightedHtmlByKey,
  );

  return (
    <div className="grid gap-8">
      <section data-snippet-fixture="component-code" className="grid gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Component code snippet
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Rendered through DocsCodeSnippet and DocsSnippetCard.
          </p>
        </div>
        <DocsCodeSnippet example={componentCodeExample} className="m-0" />
      </section>

      <section data-snippet-fixture="component-terminal" className="grid gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Component terminal snippet
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Verifies that shell labels and icons stay readable on the light
            snippet surface.
          </p>
        </div>
        <DocsCodeSnippet example={componentTerminalExample} className="m-0" />
      </section>

      <section
        data-snippet-fixture="component-dependency"
        className="grid gap-3"
      >
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Component dependency snippet
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Uses the dependency variant of the shared snippet card.
          </p>
        </div>
        <ComponentDependencySnippet
          highlightedHtmlByKey={highlightedHtmlByKey}
        />
      </section>

      <section
        data-snippet-fixture="component-properties"
        className="grid gap-3"
      >
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Component properties snippet
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Verifies the table wrapper used for generated configuration-property
            snippets.
          </p>
        </div>
        <DocsPropertiesSnippetCard
          id="snippet-test-properties"
          anchorId="snippet-test-properties-anchor"
          title="Configuration Properties"
          eyebrow="Configuration properties"
          countLabel="2 properties"
        >
          <table className="tableblock">
            <caption className="sr-only">Configuration Properties</caption>
            <thead>
              <tr>
                <th>Property</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>micronaut.server.port</code>
                </td>
                <td>Server port used by the embedded application.</td>
              </tr>
              <tr>
                <td>
                  <code>micronaut.application.name</code>
                </td>
                <td>Application name exposed to framework integrations.</td>
              </tr>
            </tbody>
          </table>
        </DocsPropertiesSnippetCard>
      </section>
    </div>
  );
}

function ComponentDependencySnippet({
  highlightedHtmlByKey,
}: SnippetTestGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const highlightedDependencyVariants = variantsWithHighlightedHtml(
    "snippet-test-dependency",
    dependencyVariants,
    highlightedHtmlByKey,
  );
  const activeVariant =
    highlightedDependencyVariants[activeIndex] ||
    highlightedDependencyVariants[0];
  if (!activeVariant) {
    return null;
  }

  async function copyActiveSnippet() {
    try {
      await navigator.clipboard.writeText(activeVariant.code);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = activeVariant.code;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <DocsSnippetCard
      kind="dependency"
      title="HTTP client dependency"
      description="Gradle and Maven dependency variants rendered through the shared dependency snippet card."
      className="m-0"
      controls={
        <div
          className={docsSnippetStyles.tabs}
          role="tablist"
          aria-label="Dependency format"
        >
          {highlightedDependencyVariants.map((variant, index) => {
            const active = index === activeIndex;
            return (
              <DocsSnippetLanguageButton
                key={variant.language}
                active={active}
                id={`snippet-test-dependency-${variant.language}-tab`}
                type="button"
                role="tab"
                aria-controls={`snippet-test-dependency-${variant.language}-panel`}
                aria-selected={active}
                data-lang={variant.language}
                tabIndex={active ? 0 : -1}
                onClick={() => {
                  setActiveIndex(index);
                  setCopied(false);
                }}
              >
                <SnippetTestLanguageIcon language={variant.language} />
                <span className={docsSnippetStyles.languageText}>
                  {variant.label}
                </span>
              </DocsSnippetLanguageButton>
            );
          })}
        </div>
      }
      action={
        <DocsSnippetCopyButton
          aria-label={copied ? "Copied" : `Copy ${activeVariant.fileName}`}
          title={copied ? "Copied" : `Copy ${activeVariant.fileName}`}
          onClick={copyActiveSnippet}
        >
          <CopyIcon />
          <span className="sr-only" aria-live="polite">
            {copied ? "Copied" : "Copy code"}
          </span>
        </DocsSnippetCopyButton>
      }
    >
      {highlightedDependencyVariants.map((variant, index) => {
        const active = index === activeIndex;
        return (
          <div
            key={variant.language}
            id={`snippet-test-dependency-${variant.language}-panel`}
            role="tabpanel"
            aria-labelledby={`snippet-test-dependency-${variant.language}-tab`}
            aria-hidden={!active}
            hidden={!active}
            className={docsSnippetStyles.panel}
          >
            <ShikiCodeBlock
              code={variant.code}
              highlightedHtml={variant.highlightedHtml}
              language={variant.language}
            />
          </div>
        );
      })}
    </DocsSnippetCard>
  );
}

function SnippetTestLanguageIcon({ language }: { language: string }) {
  return <DocsSnippetCodeLanguageIcon language={language} />;
}
