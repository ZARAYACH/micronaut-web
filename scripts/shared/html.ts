export function html(value: any): any {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function attribute(value: any): any {
  return html(value).replaceAll('"', "&quot;");
}

export function decodeHtml(value: any): any {
  return String(value)
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#8217;", "'")
    .replaceAll("&#x3C;", "<")
    .replaceAll("&amp;", "&");
}

export function escapeRegExp(value: any): any {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
