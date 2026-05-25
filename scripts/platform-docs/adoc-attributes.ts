export function parseAttributeList(value: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const items = [];
  let current = "";
  let quote = "";
  for (const char of value || "") {
    if (quote) {
      if (char === quote) {
        quote = "";
      }
      current += char;
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ",") {
      items.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    items.push(current.trim());
  }
  for (const item of items) {
    const separator = item.indexOf("=");
    if (separator < 0) {
      continue;
    }
    const key = item.slice(0, separator).trim();
    const raw = item.slice(separator + 1).trim();
    attributes[key] = stripQuotes(raw);
  }
  return attributes;
}

function stripQuotes(value: string): string {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}
