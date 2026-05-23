import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as ts from "typescript";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const blogRedirects = importBlogRedirects();

test("generated dated blog posts produce legacy html redirects", async () => {
  const { getLegacyBlogRedirects, routeSlugsForPost } = await blogRedirects;
  const slug = "2020/03/09/introduction-to-micronaut-testing";
  const routeSlugs = routeSlugsForPost(slug);

  assert.ok(routeSlugs.includes("blog/2020-03-09-introduction-to-micronaut-testing.html"));
  assert.deepEqual(
    getLegacyBlogRedirects([{ href: `/${slug}/`, routeSlugs }]),
    [{
      legacySlug: "2020-03-09-introduction-to-micronaut-testing",
      destination: "/2020/03/09/introduction-to-micronaut-testing/"
    }]
  );
});

test("legacy redirect slugs work for both html and slash-style routes", async () => {
  const { getLegacyBlogRedirects, routeSlugsForPost } = await blogRedirects;
  const [redirect] = getLegacyBlogRedirects([{
    href: "/2020/10/08/micronaut-gradle-plugin/",
    routeSlugs: routeSlugsForPost("2020/10/08/micronaut-gradle-plugin")
  }]);

  assert.equal(redirect.legacySlug, "2020-10-08-micronaut-gradle-plugin");
  assert.equal(`/blog/${redirect.legacySlug}.html`, "/blog/2020-10-08-micronaut-gradle-plugin.html");
  assert.equal(`/blog/${redirect.legacySlug}/`, "/blog/2020-10-08-micronaut-gradle-plugin/");
});

test("explicit historical aliases redirect to canonical post hrefs", async () => {
  const { getLegacyBlogRedirects, routeSlugsForPost } = await blogRedirects;
  const slug = "2019/07/18/announcing-micronaut-data";
  const redirects = getLegacyBlogRedirects([{
    href: `/${slug}/`,
    routeSlugs: routeSlugsForPost(slug)
  }]);

  assert.ok(redirects.some((redirect) =>
    redirect.legacySlug === "2019-07-18-unleashing-predator-precomputed-data-repositories"
      && redirect.destination === "/2019/07/18/announcing-micronaut-data/"
  ));
});

test("legacy redirect destinations are base-path aware", async () => {
  const { getLegacyBlogRedirects, routeSlugsForPost } = await blogRedirects;
  const slug = "2020/04/30/introducing-micronaut-2-0-launch";

  assert.deepEqual(
    getLegacyBlogRedirects([{
      href: `/${slug}/`,
      routeSlugs: routeSlugsForPost(slug)
    }], (destination) => `/docs${destination}`),
    [
      {
        legacySlug: "2020-04-30-introducing-micronaut-2-0-launch",
        destination: "/docs/2020/04/30/introducing-micronaut-2-0-launch/"
      },
      {
        legacySlug: "2020-04-30-introducing-micronaut-launch",
        destination: "/docs/2020/04/30/introducing-micronaut-2-0-launch/"
      }
    ]
  );
});

test("non-dated posts only get legacy redirects when aliased", async () => {
  const { getLegacyBlogRedirects, routeSlugsForPost } = await blogRedirects;
  const slug = "micronaut-success-stories/agorapulse-micronaut-journey";

  assert.deepEqual(getLegacyBlogRedirects([{
    href: `/${slug}/`,
    routeSlugs: routeSlugsForPost(slug)
  }]), []);

  assert.deepEqual(getLegacyBlogRedirects([{
    href: `/${slug}/`,
    routeSlugs: routeSlugsForPost(slug, new Map([
      ["blog/agorapulse-micronaut-journey.html", slug]
    ]))
  }]), [{
    legacySlug: "agorapulse-micronaut-journey",
    destination: "/micronaut-success-stories/agorapulse-micronaut-journey/"
  }]);
});

test("both legacy blog route modules use shared base-path redirects", async () => {
  const routeFiles = [
    "src/pages/blog/[legacySlug].astro",
    "src/pages/blog/[legacySlug].html.ts"
  ];

  for (const routeFile of routeFiles) {
    const source = await fs.readFile(path.join(projectDirectory, routeFile), "utf8");
    assert.match(source, /import \{ withBasePath \} from "@\/lib\/base-path";/);
    assert.match(source, /import \{ getLegacyBlogRedirects \} from "@\/lib\/blog-redirects";/);
    assert.match(source, /getLegacyBlogRedirects\(posts, withBasePath\)/);
  }
});

async function importBlogRedirects() {
  const sourceFile = path.join(projectDirectory, "src", "lib", "blog-redirects.ts");
  const source = await fs.readFile(sourceFile, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    },
    fileName: sourceFile,
    reportDiagnostics: true
  });
  const errors = result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error) ?? [];
  assert.deepEqual(errors.map((diagnostic) => diagnostic.messageText), []);

  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "micronaut-web-blog-redirects-"));
  const moduleFile = path.join(temporaryDirectory, "blog-redirects.mjs");
  await fs.writeFile(moduleFile, result.outputText, "utf8");
  return import(pathToFileURL(moduleFile));
}
