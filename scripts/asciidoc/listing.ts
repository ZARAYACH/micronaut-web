import { escapeRegExp, html } from "../shared/html.ts";

export function macroAttribute(attrs: any, name: any): any {
  if (attrs?.[name] !== undefined) {
    return cleanMacroAttributeValue(String(attrs[name]), name);
  }
  const text = attrs?.text || attrs?.$positional?.join(",");
  if (typeof text === "string") {
    const match = new RegExp(
      `(?:^|,)\\s*${escapeRegExp(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^,]+))`,
    ).exec(text);
    if (match) {
      return cleanMacroAttributeValue(
        (match[1] ?? match[2] ?? match[3] ?? "").trim(),
        name,
      );
    }
  }
  return undefined;
}

export function macroText(attrs: any): any {
  return macroAttribute(attrs, "text") || attrs?.$positional?.[0] || "";
}

function cleanMacroAttributeValue(value: any, name: any): any {
  if (name !== "title") {
    return value;
  }
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && !trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && !trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1);
  }
  if (
    (!trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (!trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

export function inlineTitleHtml(value: any): any {
  let escaped = html(value);
  escaped = escaped.replace(
    /`([^`\r\n]+)`/g,
    (_: any, code: any): any => `<code>${code}</code>`,
  );
  return escaped;
}
