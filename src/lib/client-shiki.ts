import { createHighlighterCore, type TokensResult } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import bash from "@shikijs/langs/bash";
import groovy from "@shikijs/langs/groovy";
import java from "@shikijs/langs/java";
import json from "@shikijs/langs/json";
import kotlin from "@shikijs/langs/kotlin";
import markdown from "@shikijs/langs/markdown";
import properties from "@shikijs/langs/properties";
import toml from "@shikijs/langs/toml";
import xml from "@shikijs/langs/xml";
import yaml from "@shikijs/langs/yaml";
import githubDarkDefault from "@shikijs/themes/github-dark-default";
import githubLightDefault from "@shikijs/themes/github-light-default";

export type ClientShikiLanguage =
  | "bash"
  | "groovy"
  | "java"
  | "json"
  | "kotlin"
  | "markdown"
  | "properties"
  | "text"
  | "toml"
  | "xml"
  | "yaml";

export type ClientShikiTheme = "github-dark-default" | "github-light-default";

const highlighter = createHighlighterCore({
  engine: createJavaScriptRegexEngine(),
  langs: [
    bash,
    groovy,
    java,
    json,
    kotlin,
    markdown,
    properties,
    toml,
    xml,
    yaml,
  ],
  themes: [githubDarkDefault, githubLightDefault],
});

export async function codeToTokens(
  code: string,
  options: {
    lang: ClientShikiLanguage;
    theme: ClientShikiTheme;
  },
): Promise<TokensResult> {
  return (await highlighter).codeToTokens(code, options);
}
