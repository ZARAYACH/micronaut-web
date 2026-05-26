"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { cn } from "@/lib/utils";
import type { ClientShikiLanguage, ClientShikiTheme } from "@/lib/client-shiki";

type ShikiToken = {
  content: string;
  color?: string;
  fontStyle?: number;
  htmlStyle?: Record<string, string>;
};

type ShikiTokensResult = {
  tokens: ShikiToken[][];
  fg?: string;
  bg?: string;
};

type CodeBlockProps = {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
};

function shikiLanguage(language: string): ClientShikiLanguage {
  if (
    [
      "bash",
      "groovy",
      "java",
      "json",
      "kotlin",
      "markdown",
      "properties",
      "toml",
      "xml",
      "yaml",
    ].includes(language)
  ) {
    return language as ClientShikiLanguage;
  }
  return "text";
}

function currentShikiTheme(): ClientShikiTheme {
  if (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
  ) {
    return "github-dark-default";
  }
  return "github-light-default";
}

function tokenStyle(token: ShikiToken): CSSProperties {
  const style: CSSProperties = {
    ...token.htmlStyle,
    color: token.color,
  };
  if (token.fontStyle) {
    if (token.fontStyle & 1) {
      style.fontStyle = "italic";
    }
    if (token.fontStyle & 2) {
      style.fontWeight = 700;
    }
    if (token.fontStyle & 4) {
      style.textDecoration = "underline";
    }
  }
  return style;
}

export function CodeBlock({
  code,
  language = "text",
  filename,
  showLineNumbers = true,
  className,
}: CodeBlockProps) {
  const plainLines = useMemo(() => code.split("\n"), [code]);
  const [theme, setTheme] = useState<ClientShikiTheme>(currentShikiTheme);
  const [highlighted, setHighlighted] = useState<ShikiTokensResult | null>(
    null,
  );

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(currentShikiTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    setHighlighted(null);

    import("@/lib/client-shiki")
      .then(({ codeToTokens }) =>
        codeToTokens(code, {
          lang: shikiLanguage(language),
          theme,
        }),
      )
      .then((result) => {
        if (active) {
          setHighlighted(result);
        }
      })
      .catch(() => {
        if (active) {
          setHighlighted({
            tokens: plainLines.map((line) => [{ content: line || " " }]),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [code, language, plainLines, theme]);

  const tokenLines =
    highlighted?.tokens ?? plainLines.map((line) => [{ content: line || " " }]);

  return (
    <div
      className={cn(
        "h-full overflow-auto bg-code font-mono text-[13px] leading-6 text-code-foreground",
        className,
      )}
    >
      {filename && <div className="sr-only">Previewing {filename}</div>}
      <pre
        className="min-w-max py-2"
        style={{
          backgroundColor: highlighted?.bg,
          color: highlighted?.fg,
        }}
        tabIndex={0}
      >
        <code className={`language-${language}`} data-lang={language}>
          {tokenLines.map((line, index) => (
            <span
              key={`${filename ?? language}-${index}`}
              className={cn(
                "grid min-h-6 hover:bg-muted/40",
                showLineNumbers
                  ? "grid-cols-[3.5rem_max-content]"
                  : "grid-cols-[max-content]",
              )}
            >
              {showLineNumbers && (
                <span className="sticky left-0 z-10 select-none border-r bg-background/95 pr-3 text-right text-muted-foreground">
                  {index + 1}
                </span>
              )}
              <span className="whitespace-pre px-4">
                {line.length > 0
                  ? line.map((token, tokenIndex) => (
                      <span
                        key={`${filename ?? language}-${index}-${tokenIndex}`}
                        style={tokenStyle(token)}
                      >
                        {token.content || " "}
                      </span>
                    ))
                  : " "}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
