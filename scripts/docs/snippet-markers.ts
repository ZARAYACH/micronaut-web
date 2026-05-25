import { attribute } from "../shared/html.ts";

export function snippetMarkerHtml(kind: any, payload: any): any {
  return `<micronaut-snippet data-kind="${attribute(kind)}" data-payload="${attribute(
    encodePayload({
      ...payload,
      kind,
    }),
  )}"></micronaut-snippet>`;
}

export function decodeSnippetMarkerPayload(value: any): any {
  return JSON.parse(
    Buffer.from(String(value || ""), "base64url").toString("utf8"),
  );
}

function encodePayload(payload: any): any {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}
