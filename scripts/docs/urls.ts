import path from "node:path";

import { attribute } from "../shared/html.ts";

export function prefixIds(input: any, slug: any): any {
  const prefix = `${slug}-`;
  return input
    .replace(/\bid="([^"]+)"/g, (match: any, id: any): any =>
      id.startsWith(prefix) ? match : `id="${prefix}${id}"`,
    )
    .replace(/\bhref="#([^"]+)"/g, (match: any, id: any): any =>
      id.startsWith(prefix) ? match : `href="#${prefix}${id}"`,
    )
    .replace(
      /\b(aria-activedescendant|aria-controls|aria-describedby|aria-labelledby|aria-owns|for)="([^"]+)"/g,
      (match: any, name: any, value: any): any => {
        const refs = value.trim().split(/\s+/).filter(Boolean);
        if (!refs.length) {
          return match;
        }
        const prefixed = refs
          .map((id: any): any =>
            id.startsWith(prefix) ? id : `${prefix}${id}`,
          )
          .join(" ");
        return `${name}="${attribute(prefixed)}"`;
      },
    );
}

export function rewriteUrls(input: any, project: any): any {
  return input.replace(
    /\b(href|src)="([^"]*)"/g,
    (match: any, attributeName: any, value: any): any => {
      if (
        !value ||
        value.startsWith("#") ||
        value.startsWith("/") ||
        /^[a-z][a-z0-9+.-]*:/i.test(value) ||
        value.startsWith("//")
      ) {
        return match;
      }
      if (value.startsWith("assets/")) {
        return `${attributeName}="${attribute(pageRelativeAssetUrl(value))}"`;
      }
      const suffixIndex = firstSuffixIndex(value);
      const pathname = suffixIndex >= 0 ? value.slice(0, suffixIndex) : value;
      const suffix = suffixIndex >= 0 ? value.slice(suffixIndex) : "";
      const rewritten =
        path.posix.normalize(
          path.posix.join(
            "assets",
            project.slug,
            "docs",
            "guide",
            pathname.replaceAll("\\", "/"),
          ),
        ) + suffix;
      return `${attributeName}="${attribute(pageRelativeAssetUrl(rewritten))}"`;
    },
  );
}

function pageRelativeAssetUrl(value: any): any {
  return `../${value.replace(/^\/+/, "")}`;
}

function firstSuffixIndex(value: any): any {
  const queryIndex = value.indexOf("?");
  const hashIndex = value.indexOf("#");
  if (queryIndex < 0) return hashIndex;
  if (hashIndex < 0) return queryIndex;
  return Math.min(queryIndex, hashIndex);
}
