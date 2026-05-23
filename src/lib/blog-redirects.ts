export type BlogPostRedirectSource = {
  href: string;
  routeSlugs: string[];
};

export type LegacyBlogRedirect = {
  legacySlug: string;
  destination: string;
};

export const legacyBlogRouteAliases = new Map<string, string>([
  ["blog/2018-09-30-micronaut-1-rc1.html", "2018/09/30/micronaut-1-0-rc1-and-the-power-of-ahead-of-time-compilation"],
  ["blog/2018-10-08-micronaut-10-rc2.html", "2018/10/08/micronaut-1-0-rc2-and-the-power-of-ahead-of-time-compilation"],
  ["blog/2018-10-23-micronaut-10-ga-released.html", "2018/10/23/micronaut-1-0-ga-released"],
  ["blog/2019-07-18-unleashing-predator-precomputed-data-repositories.html", "2019/07/18/announcing-micronaut-data"],
  ["blog/2019-11-21-micronaut-13-milestone-1-released.html", "2019/11/21/micronaut-1-3-milestone-1-released"],
  ["blog/2020-03-03-back-future-micronaut-servlet.html", "2020/03/03/back-to-the-future-with-micronaut-servlet"],
  ["blog/2020-03-20-micronaut-20-milestone-1-released.html", "2020/03/20/micronaut-2-0-milestone-1-released"],
  ["blog/2020-04-02-micronaut-20-milestone-2-massive-maven-improvements.html", "2020/04/02/micronaut-2-0-milestone-2-massive-maven-improvements"],
  ["blog/2020-04-30-introducing-micronaut-launch.html", "2020/04/30/introducing-micronaut-2-0-launch"],
  ["blog/2020-04-30-micronaut-20-m3-big-boost-serverless-and-micronaut-launch.html", "2020/04/30/micronaut-2-0-m3-a-big-boost-for-serverless-plus-micronaut-launch"],
  ["blog/2020-10-08-micronaut-gradle-plugin.html", "2020/10/08/micronaut-gradle-plugin"]
]);

export function legacyBlogRouteFromPostSlug(slug: string) {
  const match = slug.match(/^(\d{4})\/(\d{2})\/(\d{2})\/(.+)$/);
  if (!match) {
    return undefined;
  }
  const [, year, month, day, postSlug] = match;
  return `blog/${year}-${month}-${day}-${postSlug}.html`;
}

export function routeSlugsForPost(slug: string, aliases = legacyBlogRouteAliases) {
  const routeSlugs = new Set([normalizeRouteSlug(slug)]);
  const generatedLegacyRoute = legacyBlogRouteFromPostSlug(slug);
  if (generatedLegacyRoute) {
    routeSlugs.add(generatedLegacyRoute);
  }
  for (const [legacyRoute, canonicalRoute] of aliases) {
    if (canonicalRoute === slug) {
      routeSlugs.add(legacyRoute);
    }
  }
  return Array.from(routeSlugs);
}

export function getLegacyBlogRedirects(
  posts: BlogPostRedirectSource[],
  destinationPath = (path: string) => path
): LegacyBlogRedirect[] {
  return posts.flatMap((post) => post.routeSlugs
    .map(legacySlugFromHtmlRoute)
    .filter((legacySlug): legacySlug is string => Boolean(legacySlug))
    .map((legacySlug) => ({
      legacySlug,
      destination: destinationPath(post.href)
    })));
}

function legacySlugFromHtmlRoute(routeSlug: string) {
  if (!routeSlug.startsWith("blog/") || !routeSlug.endsWith(".html")) {
    return undefined;
  }
  return routeSlug.slice("blog/".length, -".html".length);
}

function normalizeRouteSlug(slug: string) {
  return slug.replace(/^\/+|\/+$/g, "");
}
