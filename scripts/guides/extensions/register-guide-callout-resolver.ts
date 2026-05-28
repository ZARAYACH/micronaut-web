import path from "node:path";

import type { CalloutLineResolver } from "../../asciidoc/extensions/snippet-block-renderer.ts";
import type { GuideRenderContext } from "../model.ts";
import {
  includeGuideAdoc,
  replaceGuideTemplateArguments,
} from "./register-guide-content-blocks.ts";

const GUIDE_CALLOUT_BLOCK = "guide-callout";

export function guideCalloutLineResolver(
  context: GuideRenderContext,
): CalloutLineResolver {
  return (line: string): Promise<string[] | undefined> =>
    resolveGuideCalloutLines(line, context);
}

async function resolveGuideCalloutLines(
  line: string,
  context: GuideRenderContext,
): Promise<string[] | undefined> {
  const match = new RegExp(
    `^${GUIDE_CALLOUT_BLOCK}::([^\\[]+)\\[\\]\\s*$`,
  ).exec(line.trim());
  if (!match) {
    return undefined;
  }
  const payload = guideMacroPayloadFromValue(match[1]);
  return includeGuideCallout(payload.target, payload.attributes, context);
}

export async function includeGuideCallout(
  target: string,
  attributes: Record<string, string>,
  context: GuideRenderContext,
  includeStack: Set<string> = new Set(),
): Promise<string[]> {
  const lines = await includeGuideAdoc(
    path.join(
      context.guidesDirectory,
      "src",
      "docs",
      "common",
      "callouts",
      `callout-${ensureSuffix(target.trim(), ".adoc")}`,
    ),
    context,
    includeStack,
  );
  const explicitNumber = calloutNumber(attributes);
  return lines.map((line) => {
    const replaced = replaceGuideTemplateArguments(line, attributes);
    return explicitNumber
      ? replaced.replace(/^<\.>/, `<${explicitNumber}>`)
      : replaced;
  });
}

function guideMacroPayloadFromValue(value: unknown): {
  attributes: Record<string, string>;
  target: string;
} {
  return JSON.parse(
    Buffer.from(String(value || ""), "base64url").toString("utf8"),
  );
}

function calloutNumber(attributes: Record<string, string>): string {
  const positional = attributes as Record<string, string> & {
    $positional?: string[];
    _positional?: string[];
  };
  const number =
    attributes.number ||
    attributes.callout ||
    positional._positional?.[0] ||
    positional.$positional?.[0] ||
    "";
  return /^\d+$/.test(number) ? number : "";
}

function ensureSuffix(value: string, suffix: string): string {
  return value.endsWith(suffix) ? value : `${value}${suffix}`;
}
