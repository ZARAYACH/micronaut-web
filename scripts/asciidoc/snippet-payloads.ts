export const SNIPPET_BLOCK = "snippet";
export const DEPENDENCY_BLOCK = "dependency";

export function snippetBlockAttributeLine(kind: any, payload: any): any {
  return `[${snippetBlockNameForKind(kind)},payload=${encodePayload({
    ...payload,
    kind,
  })}]`;
}

export function snippetPayloadFromValue(value: any): any {
  return decodePayload(value);
}

function snippetBlockNameForKind(kind: any): string {
  return kind === DEPENDENCY_BLOCK ? DEPENDENCY_BLOCK : SNIPPET_BLOCK;
}

function encodePayload(payload: any): any {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: any): any {
  return JSON.parse(
    Buffer.from(String(value || ""), "base64url").toString("utf8"),
  );
}
