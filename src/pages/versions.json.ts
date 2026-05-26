import docsVersions from "@/data/docs-versions.json";

export const prerender = true;

export function GET() {
  return new Response(JSON.stringify(docsVersions, null, 2), {
    headers: {
      "cache-control": "public, max-age=300",
      "content-type": "application/json; charset=utf-8",
    },
  });
}
