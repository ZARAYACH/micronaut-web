import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { pruneSurface } from "../../prune-surface.ts";
import { publishDocsSurface } from "../../publish-docs-surface.ts";
import { updateDocsVersionManifest } from "../../update-docs-version-manifest.ts";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const deploymentConfigFile = path.join(
  projectDirectory,
  "src",
  "lib",
  "deployment-config.ts",
);
const surfaceRoutesFile = path.join(
  projectDirectory,
  "src",
  "lib",
  "surface-routes.ts",
);
const pagesArtifactTokenPattern = new RegExp("PAGES_" + "TOKEN");

test("deployment routes keep all-in-one paths by default", async () => {
  const deployment = await importDeploymentConfig("all", {
    MICRONAUT_DEPLOY_SURFACE: undefined,
    MICRONAUT_DOCS_ROOT: undefined,
    MICRONAUT_DOCS_LATEST_ROOT: undefined,
    MICRONAUT_GUIDES_ROOT: undefined,
    MICRONAUT_GUIDES_LATEST_ROOT: undefined,
    DEFAULT_GITHUB_PAGES_ORIGIN: undefined,
    MICRONAUT_GITHUB_PAGES_ORIGIN: undefined,
    MICRONAUT_MAIN_SITE_URL: undefined,
    MICRONAUT_DOCS_SITE_URL: undefined,
    MICRONAUT_GUIDES_SITE_URL: undefined,
  });

  assert.equal(
    deployment.routeForCurrentDeployment("/docs/core/"),
    "/docs/core/",
  );
  assert.equal(
    deployment.routeForCurrentDeployment("/guides/example/"),
    "/guides/example/",
  );
  assert.equal(
    deployment.routeForCurrentDeployment("/latest/example/"),
    "/latest/example/",
  );
  assert.equal(deployment.routeForSurface("docs", "/latest/"), "/docs/");
});

test("deployment routes map docs project pages to the standalone docs root", async () => {
  const deployment = await importDeploymentConfig("docs", {
    MICRONAUT_DEPLOY_SURFACE: "docs",
    MICRONAUT_DOCS_ROOT: "/latest",
    MICRONAUT_DOCS_SITE_URL: "https://example.test/micronaut-docs/",
    MICRONAUT_GUIDES_SITE_URL: "https://example.test/micronaut-guides/",
  });

  assert.equal(
    deployment.routeForCurrentDeployment("/docs/core/"),
    "/latest/core/",
  );
  assert.equal(deployment.routeForCurrentDeployment("/docs/"), "/latest/");
  assert.equal(
    deployment.routeForCurrentDeployment("/docs/search-index.json"),
    "/latest/search-index.json",
  );
  assert.equal(
    deployment.externalSurfacePath("guides", "/guides/micronaut-http-client/"),
    "https://example.test/micronaut-guides/latest/micronaut-http-client/",
  );
  assert.equal(
    deployment.canonicalSurfaceUrl("docs", "/docs/core/"),
    "https://example.test/micronaut-docs/latest/core/",
  );
});

test("deployment routes map main links to external docs and guides sites", async () => {
  const deployment = await importDeploymentConfig("main", {
    MICRONAUT_DEPLOY_SURFACE: "main",
    MICRONAUT_DOCS_SITE_URL: "https://example.test/micronaut-docs/",
    MICRONAUT_GUIDES_SITE_URL: "https://example.test/micronaut-guides/",
  });

  assert.equal(
    deployment.routeForCurrentDeployment("/docs/core/"),
    "https://example.test/micronaut-docs/latest/core/",
  );
  assert.equal(
    deployment.routeForCurrentDeployment("/guides/micronaut-http-client/"),
    "https://example.test/micronaut-guides/latest/micronaut-http-client/",
  );
  assert.equal(
    deployment.routeForCurrentDeployment("/guides/"),
    "https://example.test/micronaut-guides/latest/",
  );
});

test("deployment routes derive external surface URLs from the GitHub Pages origin", async () => {
  const deployment = await importDeploymentConfig("github-pages-origin", {
    MICRONAUT_DEPLOY_SURFACE: "main",
    DEFAULT_GITHUB_PAGES_ORIGIN: undefined,
    MICRONAUT_GITHUB_PAGES_ORIGIN: "https://example-org.github.io/",
    MICRONAUT_MAIN_SITE_URL: undefined,
    MICRONAUT_DOCS_SITE_URL: undefined,
    MICRONAUT_GUIDES_SITE_URL: undefined,
  });

  assert.equal(
    deployment.routeForCurrentDeployment("/docs/core/"),
    "https://example-org.github.io/micronaut-docs/latest/core/",
  );
  assert.equal(
    deployment.routeForCurrentDeployment("/guides/micronaut-http-client/"),
    "https://example-org.github.io/micronaut-guides/latest/micronaut-http-client/",
  );
});

test("deployment routes use the default GitHub Pages origin fallback", async () => {
  const deployment = await importDeploymentConfig(
    "default-github-pages-origin",
    {
      MICRONAUT_DEPLOY_SURFACE: "main",
      DEFAULT_GITHUB_PAGES_ORIGIN: "https://fallback-org.github.io/",
      MICRONAUT_GITHUB_PAGES_ORIGIN: undefined,
      MICRONAUT_MAIN_SITE_URL: undefined,
      MICRONAUT_DOCS_SITE_URL: undefined,
      MICRONAUT_GUIDES_SITE_URL: undefined,
    },
  );

  assert.equal(
    deployment.routeForCurrentDeployment("/docs/core/"),
    "https://fallback-org.github.io/micronaut-docs/latest/core/",
  );
  assert.equal(
    deployment.routeForCurrentDeployment("/guides/micronaut-http-client/"),
    "https://fallback-org.github.io/micronaut-guides/latest/micronaut-http-client/",
  );
});

test("deployment routes keep standalone guides latest as a directory", async () => {
  const deployment = await importDeploymentConfig("guides", {
    MICRONAUT_DEPLOY_SURFACE: "guides",
    MICRONAUT_GUIDES_ROOT: "/latest",
    MICRONAUT_GUIDES_SITE_URL: "https://example.test/micronaut-guides/",
  });

  assert.equal(deployment.routeForCurrentDeployment("/"), "/latest/");
  assert.equal(deployment.routeForCurrentDeployment("/guides/"), "/latest/");
  assert.equal(
    deployment.routeForCurrentDeployment("/guides/micronaut-http-client/"),
    "/latest/micronaut-http-client/",
  );
});

test("surface route guards skip generated docs and guides routes in main builds", async () => {
  const routes = await importSurfaceRoutes("guards", {});
  assert.equal(routes.shouldBuildDocsRoutes("main"), false);
  assert.equal(routes.shouldBuildGuidesRoutes("main"), false);
  assert.equal(routes.shouldBuildDocsRoutes("docs"), true);
  assert.equal(routes.shouldBuildGuidesRoutes("docs"), false);
  assert.equal(routes.shouldBuildDocsRoutes("guides"), false);
  assert.equal(routes.shouldBuildGuidesRoutes("guides"), true);
  assert.equal(routes.shouldBuildDocsRoutes("all"), true);
  assert.equal(routes.shouldBuildGuidesRoutes("all"), true);
});

test("generated docs and guides dynamic route files use surface guards", async () => {
  const guardedRoutes = [
    ["src/pages/docs/[slug].astro", "shouldBuildDocsRoutes"],
    ["src/pages/docs/[searchIndex].json.ts", "shouldBuildDocsRoutes"],
    ["src/pages/docs/assets/[...path].ts", "shouldBuildDocsRoutes"],
    ["src/pages/guides/[slug].astro", "shouldBuildGuidesRoutes"],
    ["src/pages/guides/[slug].html.ts", "shouldBuildGuidesRoutes"],
    ["src/pages/guides/[download].zip.ts", "shouldBuildGuidesRoutes"],
    ["src/pages/guides/assets/[...path].ts", "shouldBuildGuidesRoutes"],
    ["src/pages/latest/[page].html.ts", "shouldBuildGuidesRoutes"],
    ["src/pages/latest/[download].zip.ts", "shouldBuildGuidesRoutes"],
    ["src/pages/latest/assets/[...path].ts", "shouldBuildGuidesRoutes"],
  ];

  for (const [routeFile, guard] of guardedRoutes) {
    const source = await fs.readFile(
      path.join(projectDirectory, routeFile),
      "utf8",
    );
    assert.match(source, new RegExp(`${guard}\\(\\)`), routeFile);
  }
  assert.equal(
    await exists(
      path.join(projectDirectory, "src/pages/docs/search-index.json.ts"),
    ),
    false,
  );
});

test("docs pruning publishes docs at the repository root", async (t) => {
  const dist = await fakeDist(t);

  await pruneSurface({
    surface: "docs",
    distDirectory: dist,
    base: "/micronaut-docs/",
    docsRoot: "/latest",
    budgetMb: 1,
  });

  assert.equal(await exists(path.join(dist, "index.html")), true);
  assert.equal(await exists(path.join(dist, ".nojekyll")), true);
  assert.equal(await exists(path.join(dist, "versions.json")), true);
  assert.equal(
    await exists(path.join(dist, "latest", "core", "index.html")),
    true,
  );
  assert.equal(
    await exists(path.join(dist, "latest", "search-index.json")),
    true,
  );
  assert.equal(await exists(path.join(dist, "latest.html")), true);
  assert.equal(
    await exists(path.join(dist, "latest", "guide", "index.html")),
    true,
  );
  assert.equal(await exists(path.join(dist, "docs")), false);
  assert.equal(await exists(path.join(dist, "guides")), false);
  assert.equal(await exists(path.join(dist, "micronaut-assets")), false);
  assert.equal(await exists(path.join(dist, "shell", "site-header.js")), false);
  assert.equal(
    await exists(path.join(dist, "shell", "site-header.css")),
    false,
  );
  assert.equal(await exists(path.join(dist, "latest", "assets")), false);
  const assetFile = await singleProjectHashedAssetFile(
    dist,
    "core",
    "diagram",
    "svg",
  );
  assert.equal(
    await exists(path.join(dist, "assets", "core", assetFile)),
    true,
  );
  assert.match(
    await fs.readFile(path.join(dist, "latest", "index.html"), "utf8"),
    /docs\/index\.html/,
  );
  const docsCoreHtml = await fs.readFile(
    path.join(dist, "latest", "core", "index.html"),
    "utf8",
  );
  assertNoDocsVersionSwitcherIsland(docsCoreHtml);
  assert.match(docsCoreHtml, /<style\b[^>]*data-docs-shiki/i);
  assert.match(docsCoreHtml, /window\.docsSnippetStyles/);
  assert.match(
    docsCoreHtml,
    new RegExp(
      `\\.\\./\\.\\./assets/core/${escapeRegExp(assetFile)}\\?cache=1#diagram`,
    ),
  );
  const docsGuideRedirectHtml = await fs.readFile(
    path.join(dist, "latest", "guide", "index.html"),
    "utf8",
  );
  assert.match(docsGuideRedirectHtml, /\/micronaut-docs\/latest\/core\//);
  assert.match(
    await fs.readFile(path.join(dist, "latest.html"), "utf8"),
    /window\.location\.replace/,
  );
});

test("guides pruning publishes only latest guides and a root redirect", async (t) => {
  const dist = await fakeDist(t);

  await pruneSurface({
    surface: "guides",
    distDirectory: dist,
    base: "/micronaut-guides/",
    budgetMb: 1,
  });

  assert.equal(await exists(path.join(dist, "index.html")), true);
  assert.equal(await exists(path.join(dist, ".nojekyll")), true);
  assert.equal(await exists(path.join(dist, "latest", "index.html")), true);
  assert.equal(
    await exists(
      path.join(dist, "latest", "micronaut-http-client", "index.html"),
    ),
    true,
  );
  assert.equal(await exists(path.join(dist, "latest", "guide")), false);
  assert.equal(await exists(path.join(dist, "docs")), false);
  assert.equal(await exists(path.join(dist, "guides")), false);
  assert.equal(await exists(path.join(dist, "micronaut-assets")), false);
  assert.equal(await exists(path.join(dist, "shell", "site-header.js")), false);
  assert.equal(
    await exists(path.join(dist, "shell", "site-header.css")),
    false,
  );
  assert.equal(await exists(path.join(dist, "latest", "assets")), false);
  const assetFile = await singleProjectHashedAssetFile(
    dist,
    "micronaut-http-client",
    "client",
    "png",
  );
  assert.equal(
    await exists(path.join(dist, "assets", "micronaut-http-client", assetFile)),
    true,
  );
  assert.match(
    await fs.readFile(path.join(dist, "index.html"), "utf8"),
    /\/micronaut-guides\/latest\//,
  );
  assert.match(
    await fs.readFile(path.join(dist, "index.html"), "utf8"),
    /window\.location\.replace/,
  );
  const guideHtml = await fs.readFile(
    path.join(dist, "latest", "micronaut-http-client", "index.html"),
    "utf8",
  );
  assert.match(guideHtml, /<style\b[^>]*data-docs-shiki/i);
  assert.match(guideHtml, /window\.docsSnippetStyles/);
  assert.match(
    guideHtml,
    new RegExp(
      `\\.\\./\\.\\./assets/micronaut-http-client/${escapeRegExp(assetFile)}`,
    ),
  );
});

test("main pruning drops docs, guides, latest, and template artifacts", async (t) => {
  const dist = await fakeDist(t);

  await pruneSurface({
    surface: "main",
    distDirectory: dist,
    base: "/micronaut-web/",
    budgetMb: 1,
  });

  assert.equal(await exists(path.join(dist, "index.html")), true);
  assert.equal(await exists(path.join(dist, ".nojekyll")), true);
  assert.equal(await exists(path.join(dist, "launch", "index.html")), true);
  assert.equal(
    await exists(path.join(dist, "micronaut-assets", "logo.svg")),
    true,
  );
  assert.equal(await exists(path.join(dist, "_astro", "app.js")), true);
  assert.equal(await exists(path.join(dist, "_astro", "app.css")), true);
  assert.equal(await exists(path.join(dist, "_astro", "chunk.js")), true);
  assert.equal(await exists(path.join(dist, "shell", "site-header.js")), true);
  assert.equal(await exists(path.join(dist, "shell", "site-header.css")), true);
  assert.equal(
    await exists(path.join(dist, "_astro", "fonts", "code.woff2")),
    true,
  );
  assert.equal(await exists(path.join(dist, "_astro", "unused.js")), false);
  assert.equal(await exists(path.join(dist, "_astro", "unused.css")), false);
  assert.equal(await exists(path.join(dist, "docs")), false);
  assert.equal(await exists(path.join(dist, "guides")), false);
  assert.equal(await exists(path.join(dist, "latest")), false);
  assert.equal(await exists(path.join(dist, "micronaut-web")), false);
  assert.equal(await exists(path.join(dist, "versions.json")), false);
});

test("docs and guides production layouts load the shared header shell from the main site", async () => {
  const layout = await fs.readFile(
    path.join(projectDirectory, "src", "layouts", "WebLayout.astro"),
    "utf8",
  );
  const shell = await fs.readFile(
    path.join(
      projectDirectory,
      "src",
      "components",
      "web",
      "site-header-shell.tsx",
    ),
    "utf8",
  );

  assert.match(layout, /data-micronaut-site-header/);
  assert.match(layout, /externalSurfaceUrls\.main/);
  assert.match(layout, /shell\/site-header\.js/);
  assert.match(layout, /shell\/site-header\.css/);
  assert.match(layout, /!import\.meta\.env\.DEV/);
  assert.match(shell, /createRoot/);
  assert.match(shell, /@\/styles\/globals\.css/);
  assert.match(shell, /SiteHeader/);
});

test("web workflow deploys the main surface through GitHub Pages Actions", async () => {
  const workflow = await fs.readFile(
    path.join(projectDirectory, ".github", "workflows", "deploy-web.yml"),
    "utf8",
  );

  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /environment:\s*\n\s*name:\s*github-pages/);
  assert.match(workflow, /MICRONAUT_DEPLOY_SURFACE:\s*main/);
  assert.match(workflow, /npx playwright install --with-deps chromium/);
  assert.match(workflow, /npm run build:main/);
  assert.match(workflow, /touch dist\/\.nojekyll/);
  assert.match(workflow, /actions\/configure-pages@/);
  assert.match(workflow, /actions\/upload-pages-artifact@/);
  assert.match(workflow, /path:\s*dist/);
  assert.match(workflow, /actions\/deploy-pages@/);
  assert.doesNotMatch(workflow, pagesArtifactTokenPattern);
  assert.doesNotMatch(workflow, /git worktree add published-web/);
  assert.doesNotMatch(workflow, /checkout --orphan/);
  assert.doesNotMatch(workflow, /git push origin HEAD:"\$TARGET_BRANCH"/);
});

test("docs and guides workflows branch-deploy to configured target repositories", async () => {
  const [webWorkflow, ...branchWorkflows] = await Promise.all(
    ["deploy-web.yml", "deploy-docs.yml", "deploy-guides.yml"].map(
      async (workflow) =>
        fs.readFile(
          path.join(projectDirectory, ".github", "workflows", workflow),
          "utf8",
        ),
    ),
  );

  const [docsWorkflow, guidesWorkflow] = branchWorkflows;
  assert.doesNotMatch(webWorkflow, pagesArtifactTokenPattern);
  for (const workflow of branchWorkflows) {
    assert.match(workflow, /target_repository:/);
    assert.match(
      workflow,
      /repository:\s*\$\{\{ inputs\.target_repository \}\}/,
    );
    assert.match(
      workflow,
      /token:\s*\$\{\{ secrets\.TARGET_REPOSITORY_TOKEN \|\| github\.token \}\}/,
    );
    assert.match(
      workflow,
      /git push origin HEAD:\$\{\{ inputs\.target_branch \}\}/,
    );
    assert.doesNotMatch(workflow, pagesArtifactTokenPattern);
    assert.doesNotMatch(workflow, /upload-pages-artifact/);
    assert.doesNotMatch(workflow, /deploy-pages/);
  }
  assert.match(docsWorkflow, /default:\s*dstepanov\/micronaut-docs/);
  assert.match(docsWorkflow, /path:\s*published-docs/);
  assert.match(docsWorkflow, /working-directory:\s*published-docs/);
  assert.match(docsWorkflow, /npx playwright install --with-deps chromium/);
  assert.match(guidesWorkflow, /default:\s*dstepanov\/micronaut-guides/);
  assert.match(guidesWorkflow, /path:\s*published-guides/);
  assert.match(guidesWorkflow, /working-directory:\s*published-guides/);
  assert.match(guidesWorkflow, /npx playwright install --with-deps chromium/);
  assert.match(docsWorkflow, /TARGET_REPOSITORY_TOKEN/);
  assert.match(guidesWorkflow, /TARGET_REPOSITORY_TOKEN/);
});

test("PostCSS disables Tailwind production optimization reparsing", async () => {
  const configModule = await import(
    `${pathToFileURL(path.join(projectDirectory, "postcss.config.mjs")).href}?test=postcss`
  );

  assert.equal(
    configModule.default.plugins["@tailwindcss/postcss"].optimize,
    false,
  );
});

test("npm dependencies do not rely on latest dist-tags", async () => {
  const manifest = JSON.parse(
    await fs.readFile(path.join(projectDirectory, "package.json"), "utf8"),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  for (const [section, dependencies] of Object.entries({
    dependencies: manifest.dependencies ?? {},
    devDependencies: manifest.devDependencies ?? {},
  })) {
    for (const [name, version] of Object.entries(dependencies)) {
      assert.notEqual(version, "latest", `${section}.${name}`);
    }
  }
});

test("external source checkouts stay inside the GitHub workspace", async () => {
  const docsWorkflow = await fs.readFile(
    path.join(projectDirectory, ".github", "workflows", "deploy-docs.yml"),
    "utf8",
  );
  const guidesWorkflow = await fs.readFile(
    path.join(projectDirectory, ".github", "workflows", "deploy-guides.yml"),
    "utf8",
  );

  assert.match(
    docsWorkflow,
    /target="external\/docs\/repos\/micronaut-platform"/,
  );
  assert.match(
    docsWorkflow,
    /DOCS_DIR:\s*\$\{\{ github\.workspace \}\}\/external\/docs/,
  );
  assert.match(guidesWorkflow, /path:\s*external\/micronaut-guides/);
  assert.match(
    guidesWorkflow,
    /MICRONAUT_GUIDES_DIR:\s*\$\{\{ github\.workspace \}\}\/external\/micronaut-guides/,
  );
  assert.doesNotMatch(docsWorkflow, /runner\.temp/);
  assert.doesNotMatch(guidesWorkflow, /runner\.temp/);
});

test("docs workflow resolves platform refs as branches or tags", async () => {
  const workflow = await fs.readFile(
    path.join(projectDirectory, ".github", "workflows", "deploy-docs.yml"),
    "utf8",
  );

  assert.match(workflow, /DOCS_VERSION:\s*\$\{\{ inputs\.docs_version \}\}/);
  assert.match(workflow, /PLATFORM_REF:\s*\$\{\{ inputs\.platform_ref \}\}/);
  assert.match(workflow, /effective_ref="\$\{PLATFORM_REF:-\$DOCS_VERSION\}"/);
  assert.match(
    workflow,
    /ls-remote --exit-code --heads origin "\$effective_ref"/,
  );
  assert.match(
    workflow,
    /refs\/heads\/\$\{effective_ref\}:refs\/remotes\/origin\/\$\{effective_ref\}/,
  );
  assert.match(
    workflow,
    /ls-remote --exit-code --tags origin "\$resolved_tag"/,
  );
  assert.match(workflow, /resolved_tag="v\$effective_ref"/);
  assert.match(
    workflow,
    /refs\/tags\/\$\{resolved_tag\}:refs\/tags\/\$\{resolved_tag\}/,
  );
  assert.match(
    workflow,
    /git -C "\$target" fetch --depth=1 origin "\$effective_ref"/,
  );
  assert.match(
    workflow,
    /Could not resolve \$PLATFORM_REPOSITORY ref '\$effective_ref'/,
  );
  assert.doesNotMatch(workflow, /default:\s*main/);
  assert.doesNotMatch(workflow, /ref:\s*\$\{\{ inputs\.platform_ref \}\}/);
});

test("docs version manifest is rebuilt from the published docs branch", async (t) => {
  const published = await temporaryDirectory(t);
  const manifest = path.join(await temporaryDirectory(t), "docs-versions.json");
  await writeFiles(published, [
    "4.10.1/index.html",
    "4.9.4.html",
    "assets/stylesheets/site.css",
    "docsassets/css/main.css",
  ]);

  const versions = await updateDocsVersionManifest({
    manifestFile: manifest,
    publishedDirectory: published,
    version: "4.10.14",
  });

  assert.deepEqual(versions.slice(0, 4), [
    { label: "Latest (4.10.14)", href: "/latest/", current: true },
    { label: "4.10.14", href: "/4.10.14/" },
    { label: "4.10.1", href: "/4.10.1/" },
    { label: "4.9.4", href: "/4.9.4.html" },
  ]);
  assert.match(await fs.readFile(manifest, "utf8"), /"4\.10\.14"/);
});

test("docs version manifest preserves latest label for non-latest publishes", async (t) => {
  const published = await temporaryDirectory(t);
  const manifest = path.join(await temporaryDirectory(t), "docs-versions.json");
  await writeFiles(published, [
    "4.10.14/index.html",
    "4.10.1/index.html",
    "4.9.4/index.html",
  ]);
  await writeTextFile(
    published,
    "versions.json",
    JSON.stringify({
      versions: [
        { label: "Latest (4.10.14)", href: "/latest/", current: true },
        { label: "4.10.14", href: "/4.10.14/" },
      ],
    }),
  );

  const versions = await updateDocsVersionManifest({
    manifestFile: manifest,
    publishedDirectory: published,
    version: "4.9.5",
    latest: false,
  });

  assert.deepEqual(versions, [
    { label: "Latest (4.10.14)", href: "/latest/" },
    { label: "4.10.14", href: "/4.10.14/" },
    { label: "4.10.1", href: "/4.10.1/" },
    { label: "4.9.5", href: "/4.9.5/" },
    { label: "4.9.4", href: "/4.9.4/" },
  ]);
});

test("docs version manifest sorts final releases before prereleases", async (t) => {
  const published = await temporaryDirectory(t);
  const manifest = path.join(await temporaryDirectory(t), "docs-versions.json");
  await writeFiles(published, [
    "5.0.0-rc1/index.html",
    "4.10.14/index.html",
    "5.0.0/index.html",
  ]);

  const versions = await updateDocsVersionManifest({
    manifestFile: manifest,
    publishedDirectory: published,
    latest: false,
  });

  assert.deepEqual(
    versions.map((version) => version.label),
    ["Latest (5.0.0)", "5.0.0", "5.0.0-rc1", "4.10.14"],
  );
});

test("docs publish merge preserves shared assets and updates version roots", async (t) => {
  const dist = await temporaryDirectory(t);
  const published = await temporaryDirectory(t);
  await writeFiles(dist, [
    "_astro/app.js",
    "assets/core/diagram.1111111111111111.svg",
    "index.html",
    "4.10.14/index.html",
    "4.10.14/core/index.html",
  ]);
  await writeFiles(published, [
    "assets/aaaaaaaaaaaaaaaa/unused.png",
    "assets/bbbbbbbbbbbbbbbb/old.png",
    "assets/core/unused.aaaaaaaaaaaaaaaa.png",
    "assets/core/old.bbbbbbbbbbbbbbbb.png",
    "assets/stylesheets/site.css",
    "docsassets/css/main.css",
    "4.10.1/core/index.html",
    "4.10.1/index.html",
  ]);
  await writeTextFile(
    dist,
    "4.10.14/core/index.html",
    '<img src="../../assets/core/diagram.1111111111111111.svg">',
  );
  await writeTextFile(
    published,
    "4.10.1/core/index.html",
    [
      '<img src="../../assets/bbbbbbbbbbbbbbbb/old.png">',
      '<img src="/assets/core/old.bbbbbbbbbbbbbbbb.png">',
    ].join("\n"),
  );

  await publishDocsSurface({
    distDirectory: dist,
    publishedDirectory: published,
    version: "4.10.14",
    base: "/micronaut-docs/",
  });

  assert.equal(
    await exists(path.join(published, "assets", "stylesheets", "site.css")),
    true,
  );
  assert.equal(
    await exists(path.join(published, "docsassets", "css", "main.css")),
    true,
  );
  assert.equal(await exists(path.join(published, ".nojekyll")), true);
  assert.equal(
    await exists(
      path.join(published, "assets", "core", "diagram.1111111111111111.svg"),
    ),
    true,
  );
  assert.equal(
    await exists(path.join(published, "assets", "bbbbbbbbbbbbbbbb", "old.png")),
    true,
  );
  assert.equal(
    await exists(
      path.join(published, "assets", "core", "old.bbbbbbbbbbbbbbbb.png"),
    ),
    true,
  );
  assert.equal(
    await exists(
      path.join(published, "assets", "aaaaaaaaaaaaaaaa", "unused.png"),
    ),
    false,
  );
  assert.equal(
    await exists(
      path.join(published, "assets", "core", "unused.aaaaaaaaaaaaaaaa.png"),
    ),
    false,
  );
  assert.equal(
    await exists(path.join(published, "4.10.14", "core", "index.html")),
    true,
  );
  assert.equal(
    await exists(path.join(published, "latest", "core", "index.html")),
    true,
  );
  assert.match(
    await fs.readFile(path.join(published, "4.10.14.html"), "utf8"),
    /\/micronaut-docs\/4\.10\.14\//,
  );
  assert.match(
    await fs.readFile(path.join(published, "4.10.14.html"), "utf8"),
    /window\.location\.replace/,
  );
  const versionsJson = JSON.parse(
    await fs.readFile(path.join(published, "versions.json"), "utf8"),
  );
  assert.deepEqual(versionsJson.versions.slice(0, 3), [
    { label: "Latest (4.10.14)", href: "/latest/", current: true },
    { label: "4.10.14", href: "/4.10.14/" },
    { label: "4.10.1", href: "/4.10.1/" },
  ]);
});

async function importDeploymentConfig(
  scenario: string,
  env: Record<string, string | undefined>,
): Promise<typeof import("../../../src/lib/deployment-config.ts")> {
  return importWithEnv(deploymentConfigFile, scenario, env);
}

async function importSurfaceRoutes(
  scenario: string,
  env: Record<string, string | undefined>,
): Promise<typeof import("../../../src/lib/surface-routes.ts")> {
  return importWithEnv(surfaceRoutesFile, scenario, env);
}

async function importWithEnv<T>(
  file: string,
  scenario: string,
  env: Record<string, string | undefined>,
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [name, value] of Object.entries(env)) {
    previous.set(name, process.env[name]);
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  try {
    return (await import(
      `${pathToFileURL(file).href}?scenario=${scenario}-${Date.now()}`
    )) as T;
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
}

async function fakeDist(t: TestContext) {
  const dist = await temporaryDirectory(t);
  const files = [
    "_astro/app.js",
    "_astro/app.css",
    "_astro/chunk.js",
    "_astro/fonts/code.woff2",
    "_astro/unused.css",
    "_astro/unused.js",
    "index.html",
    "versions.json",
    "launch/index.html",
    "docs/index.html",
    "docs/core/index.html",
    "docs/assets/core/docs/img/diagram.svg",
    "docs/search-index.json",
    "guides/index.html",
    "guides/micronaut-http-client/index.html",
    "guides/assets/micronaut-http-client/images/client.png",
    "latest/index.html",
    "latest/guide/index.html",
    "latest/micronaut-http-client/index.html",
    "latest/assets/micronaut-http-client/images/client.png",
    "micronaut-assets/logo.svg",
    "shell/site-header.js",
    "shell/site-header.css",
    "micronaut-web/templates/docs/docs-page.html",
  ];
  await writeFiles(dist, files);
  await writeTextFile(
    dist,
    "_astro/app.js",
    'import "./chunk.js";\nconsole.log("app");',
  );
  await writeTextFile(
    dist,
    "_astro/app.css",
    '@font-face { font-family: "Code"; src: url("./fonts/code.woff2"); }',
  );
  await writeTextFile(
    dist,
    "index.html",
    '<link rel="stylesheet" href="/_astro/app.css"><script type="module" src="/_astro/app.js"></script>',
  );
  await writeTextFile(
    dist,
    "docs/index.html",
    '<link rel="stylesheet" href="/micronaut-docs/_astro/app.css"><script type="module" src="/micronaut-docs/_astro/app.js"></script>docs/index.html',
  );
  await writeTextFile(
    dist,
    "guides/index.html",
    '<link rel="stylesheet" href="/micronaut-guides/_astro/app.css"><script type="module" src="/micronaut-guides/_astro/app.js"></script>',
  );
  await writeTextFile(
    dist,
    "docs/core/index.html",
    [
      "<style data-docs-shiki>.shiki { color: red; }</style>",
      "<script data-docs-runtime>window.docsSnippetStyles = true;</script>",
      '<img src="../assets/core/docs/img/diagram.svg?cache=1#diagram">',
    ].join("\n"),
  );
  await writeTextFile(
    dist,
    "guides/micronaut-http-client/index.html",
    [
      "<style data-docs-shiki>.shiki { color: blue; }</style>",
      "<script data-guides-runtime>window.docsSnippetStyles = true;</script>",
      '<img src="../assets/micronaut-http-client/images/client.png">',
    ].join("\n"),
  );
  return dist;
}

async function temporaryDirectory(t: TestContext) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-surface-test-"),
  );
  t.after(() => fs.rm(directory, { force: true, recursive: true }));
  return directory;
}

async function writeFiles(directory: string, files: string[]) {
  await Promise.all(
    files.map(async (file) => {
      const target = path.join(directory, file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, file, "utf8");
    }),
  );
}

async function writeTextFile(directory: string, file: string, content: string) {
  const target = path.join(directory, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

async function singleProjectHashedAssetFile(
  directory: string,
  project: string,
  name: string,
  extension: string,
) {
  const entries = await fs.readdir(path.join(directory, "assets", project), {
    withFileTypes: true,
  });
  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        new RegExp(`^${name}\\.[a-f0-9]{16}\\.${extension}$`).test(entry.name),
    )
    .map((entry) => entry.name);
  assert.equal(files.length, 1);
  return files[0];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertNoDocsVersionSwitcherIsland(html: string) {
  assert.doesNotMatch(
    html,
    /<astro-island\b[^>]*(?:DocsVersionSwitcher|docs-version-switcher)/i,
  );
}

async function exists(file: string) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
