"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DocsCodeSnippet,
  type CodeSnippetExample,
  type CodeSnippetLanguage,
} from "@/components/web/docs-code-snippet";
import { docsSnippetStyles } from "@/components/web/docs-snippet-styles";

type MainCodeShowcaseProps = {
  examples: CodeSnippetExample[];
};

export function MainCodeShowcase({ examples }: MainCodeShowcaseProps) {
  const [activeLanguages, setActiveLanguages] = useState<
    Record<string, CodeSnippetLanguage>
  >({});

  if (!examples.length) {
    return null;
  }

  return (
    <Tabs defaultValue="server" className="main-code-showcase min-w-0 gap-4">
      <TabsList className="w-full justify-start overflow-x-auto sm:w-fit sm:justify-center sm:overflow-visible">
        {examples.map((example) => (
          <TabsTrigger
            key={example.id}
            value={example.id}
            className="min-h-10 px-3 text-[0.86rem] data-[state=active]:border data-[state=active]:border-brand/35 data-[state=active]:bg-card data-[state=active]:text-foreground sm:px-4 sm:text-sm"
          >
            {example.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {examples.map((example) => {
        const activeLanguage =
          activeLanguages[example.id] ||
          example.variants[0]?.language ||
          "text";

        return (
          <TabsContent key={example.id} value={example.id} className="mt-0">
            <div className="grid gap-2">
              <div className={docsSnippetStyles.externalTitle}>
                {example.title}
              </div>
              <DocsCodeSnippet
                example={example}
                activeLanguage={activeLanguage}
                className="m-0"
                onLanguageChange={(language) =>
                  setActiveLanguages((current) => ({
                    ...current,
                    [example.id]: language,
                  }))
                }
              />
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
