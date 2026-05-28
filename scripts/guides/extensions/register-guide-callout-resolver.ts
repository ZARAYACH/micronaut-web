import type { SnippetRenderState } from "../../asciidoc/component-renderer.ts";
import {
  GUIDE_CALLOUT_BLOCK,
  guideMacroPayloadFromValue,
} from "../guide-blocks.ts";
import { includeCallout } from "../preprocessor.ts";
import type { GuideRenderContext } from "../preprocessor.ts";

export function registerGuideCalloutResolver(
  renderState: SnippetRenderState,
  context: GuideRenderContext,
): void {
  renderState.resolveCalloutLines = (
    line: string,
  ): Promise<string[] | undefined> => resolveGuideCalloutLines(line, context);
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
  return includeCallout(payload.target, payload.attributes, context);
}
