import type { Registry } from "@asciidoctor/core";

import type { SnippetRenderState } from "../../asciidoc/component-renderer.ts";
import {
  GUIDE_DEPENDENCY_BLOCK,
  GUIDE_RAW_TEST_BLOCK,
  GUIDE_RESOURCE_BLOCK,
  GUIDE_SOURCE_BLOCK,
  GUIDE_TEST_BLOCK,
  GUIDE_TEST_RESOURCE_BLOCK,
  GUIDE_ZIP_INCLUDE_BLOCK,
} from "../guide-blocks.ts";
import {
  dependencyMacroPayload,
  resourceSnippetPayload,
  sourceSnippetPayload,
  zipIncludeSnippetPayload,
} from "../preprocessor.ts";
import type { GuideRenderContext } from "../preprocessor.ts";
import { registerGuideSnippetBlock } from "./register-guide-snippet-block.ts";

export function registerGuideSnippetBlocks(
  registry: Registry,
  context: GuideRenderContext,
  renderState: SnippetRenderState,
): void {
  registerGuideSnippetBlock(
    registry,
    GUIDE_SOURCE_BLOCK,
    (payload) =>
      sourceSnippetPayload(payload.target, payload.attributes, context, "main"),
    renderState,
  );
  registerGuideSnippetBlock(
    registry,
    GUIDE_TEST_BLOCK,
    (payload) =>
      sourceSnippetPayload(payload.target, payload.attributes, context, "test"),
    renderState,
  );
  registerGuideSnippetBlock(
    registry,
    GUIDE_RAW_TEST_BLOCK,
    (payload) =>
      sourceSnippetPayload(
        payload.target,
        payload.attributes,
        context,
        "raw-test",
      ),
    renderState,
  );
  registerGuideSnippetBlock(
    registry,
    GUIDE_RESOURCE_BLOCK,
    (payload) =>
      resourceSnippetPayload(
        payload.target,
        payload.attributes,
        context,
        "main",
      ),
    renderState,
  );
  registerGuideSnippetBlock(
    registry,
    GUIDE_TEST_RESOURCE_BLOCK,
    (payload) =>
      resourceSnippetPayload(
        payload.target,
        payload.attributes,
        context,
        "test",
      ),
    renderState,
  );
  registerGuideSnippetBlock(
    registry,
    GUIDE_ZIP_INCLUDE_BLOCK,
    (payload) =>
      zipIncludeSnippetPayload(payload.target, payload.attributes, context),
    renderState,
  );
  registerGuideSnippetBlock(
    registry,
    GUIDE_DEPENDENCY_BLOCK,
    (payload) =>
      Promise.resolve(
        dependencyMacroPayload(payload.target, payload.attributes, context),
      ),
    renderState,
  );
}
