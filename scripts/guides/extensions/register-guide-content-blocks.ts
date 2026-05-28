import path from "node:path";

import type { Registry } from "@asciidoctor/core";
import {
  GUIDE_COMMON_BLOCK,
  GUIDE_COMMON_TEMPLATE_BLOCK,
  GUIDE_DIFF_LINK_BLOCK,
  GUIDE_EXTERNAL_BLOCK,
  GUIDE_EXTERNAL_TEMPLATE_BLOCK,
  GUIDE_ROCKER_BLOCK,
} from "../guide-blocks.ts";
import {
  includeAdoc,
  includeRocker,
  includeTemplate,
} from "../preprocessor.ts";
import type { GuideRenderContext } from "../preprocessor.ts";
import { appFeatures } from "../model.ts";
import { registerGuideContentBlock } from "./register-guide-content-block.ts";

export function registerGuideContentBlocks(
  registry: Registry,
  context: GuideRenderContext,
): void {
  registerGuideContentBlock(registry, GUIDE_COMMON_BLOCK, (payload) =>
    payload.target.trim() === "header-top.adoc"
      ? Promise.resolve([])
      : includeAdoc(
          commonSnippetPath(context.guidesDirectory, payload.target),
          context,
        ),
  );
  registerGuideContentBlock(registry, GUIDE_COMMON_TEMPLATE_BLOCK, (payload) =>
    includeTemplate(
      commonSnippetPath(context.guidesDirectory, payload.target),
      payload.attributes,
      context,
    ),
  );
  registerGuideContentBlock(registry, GUIDE_EXTERNAL_BLOCK, (payload) =>
    includeAdoc(externalPath(context.guidesDirectory, payload.target), context),
  );
  registerGuideContentBlock(
    registry,
    GUIDE_EXTERNAL_TEMPLATE_BLOCK,
    (payload) =>
      includeTemplate(
        externalPath(context.guidesDirectory, payload.target),
        payload.attributes,
        context,
      ),
  );
  registerGuideContentBlock(registry, GUIDE_ROCKER_BLOCK, (payload) =>
    includeRocker(payload.target, context),
  );
  registerGuideContentBlock(registry, GUIDE_DIFF_LINK_BLOCK, (payload) =>
    Promise.resolve([diffLink(payload.target, payload.attributes, context)]),
  );
}

function commonSnippetPath(guidesDirectory: any, target: any): any {
  return path.join(
    guidesDirectory,
    "src",
    "docs",
    "common",
    "snippets",
    `common-${ensureSuffix(target.trim(), ".adoc")}`,
  );
}

function externalPath(guidesDirectory: any, target: any): any {
  return path.join(
    guidesDirectory,
    "guides",
    ensureSuffix(target.trim(), ".adoc"),
  );
}

function ensureSuffix(value: any, suffix: any): any {
  return value.endsWith(suffix) ? value : `${value}${suffix}`;
}

function diffLink(_target: any, attributes: any, context: any): any {
  const appName = attributes.app || "default";
  const app = findApp(context.guide, appName);
  const excluded = new Set(
    (attributes.featureExcludes || "").split("|").filter(Boolean),
  );
  const features = (
    attributes.features
      ? attributes.features.split("|")
      : appFeatures(context.guide, context.option, appName)
  ).filter((feature: any): any => feature && !excluded.has(feature));
  const params = new URLSearchParams();
  for (const feature of features) {
    params.append("features", feature);
  }
  params.set("lang", context.option.language.toUpperCase());
  params.set("build", context.option.buildTool.toUpperCase());
  params.set("test", context.option.testFramework.toUpperCase());
  params.set("name", appName === "default" ? "micronautguide" : appName);
  params.set("type", String(app?.applicationType || "DEFAULT").toUpperCase());
  params.set("package", "example.micronaut");
  params.set("activity", "diff");
  return `https://micronaut.io/launch?${params.toString()}[Diff, window="_blank"]`;
}

function findApp(guide: any, appName: any): any {
  return (
    guide.apps.find((app: any): any => app.name === appName) || guide.apps[0]
  );
}
