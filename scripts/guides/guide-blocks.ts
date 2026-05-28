export const GUIDE_CALLOUT_BLOCK = "guide-callout";
export const GUIDE_COMMON_BLOCK = "guide-common";
export const GUIDE_COMMON_TEMPLATE_BLOCK = "guide-common-template";
export const GUIDE_DEPENDENCIES_BLOCK = "guide-dependencies";
export const GUIDE_DEPENDENCY_BLOCK = "guide-dependency";
export const GUIDE_DIFF_LINK_BLOCK = "guide-diff-link";
export const GUIDE_EXTERNAL_BLOCK = "guide-external";
export const GUIDE_EXTERNAL_TEMPLATE_BLOCK = "guide-external-template";
export const GUIDE_RAW_TEST_BLOCK = "guide-raw-test";
export const GUIDE_RESOURCE_BLOCK = "guide-resource";
export const GUIDE_ROCKER_BLOCK = "guide-rocker";
export const GUIDE_SOURCE_BLOCK = "guide-source";
export const GUIDE_TEST_BLOCK = "guide-test";
export const GUIDE_TEST_RESOURCE_BLOCK = "guide-test-resource";
export const GUIDE_ZIP_INCLUDE_BLOCK = "guide-zip-include";

export type GuideMacroPayload = {
  attributes: Record<string, string>;
  target: string;
};

export type GuideDependencyPayload = {
  dependencies: GuideMacroPayload[];
};

export function guideBlockLines(
  blockName: string,
  payload: unknown,
  bodyLines: string[] = [],
): string[] {
  return [
    "",
    `[${blockName},payload=${encodePayload(payload)}]`,
    "--",
    ...bodyLines,
    "--",
    "",
  ];
}

export function guideMacroLines(blockName: string, payload: unknown): string[] {
  return ["", `${blockName}::${encodePayload(payload)}[]`, ""];
}

export function guideMacroPayloadFromValue(value: unknown): GuideMacroPayload {
  return decodePayload(value) as GuideMacroPayload;
}

export function guideDependencyPayloadFromValue(
  value: unknown,
): GuideDependencyPayload {
  return decodePayload(value) as GuideDependencyPayload;
}

function encodePayload(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: unknown): unknown {
  return JSON.parse(
    Buffer.from(String(value || ""), "base64url").toString("utf8"),
  );
}
