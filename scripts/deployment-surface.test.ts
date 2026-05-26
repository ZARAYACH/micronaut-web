import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { publishDocsSurface } from "./publish-docs-surface.ts";
import { pruneSurface } from "./prune-surface.ts";
import { updateDocsVersionManifest } from "./update-docs-version-manifest.ts";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
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
    ["src/pages/latest/[page].astro", "shouldBuildGuidesRoutes"],
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
  assert.equal(await exists(path.join(dist, "latest", "assets")), false);
  const assetHash = await singleHashedAssetDirectory(dist);
  assert.equal(
    await exists(
      path.join(
        dist,
        "assets",
        assetHash,
        "core",
        "docs",
        "img",
        "diagram.svg",
      ),
    ),
    true,
  );
  assert.match(
    await fs.readFile(path.join(dist, "latest", "index.html"), "utf8"),
    /docs\/index\.html/,
  );
  assert.match(
    await fs.readFile(path.join(dist, "latest", "core", "index.html"), "utf8"),
    new RegExp(
      `\\.\\./\\.\\./assets/${assetHash}/core/docs/img/diagram\\.svg\\?cache=1#diagram`,
    ),
  );
  assert.match(
    await fs.readFile(path.join(dist, "latest", "guide", "index.html"), "utf8"),
    /\/micronaut-docs\/latest\/core\//,
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
  assert.equal(await exists(path.join(dist, "latest", "assets")), false);
  const assetHash = await singleHashedAssetDirectory(dist);
  assert.equal(
    await exists(
      path.join(
        dist,
        "assets",
        assetHash,
        "micronaut-http-client",
        "images",
        "client.png",
      ),
    ),
    true,
  );
  assert.match(
    await fs.readFile(path.join(dist, "index.html"), "utf8"),
    /\/micronaut-guides\/latest\//,
  );
  assert.match(
    await fs.readFile(
      path.join(dist, "latest", "micronaut-http-client", "index.html"),
      "utf8",
    ),
    new RegExp(
      `\\.\\./\\.\\./assets/${assetHash}/micronaut-http-client/images/client\\.png`,
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
  assert.equal(await exists(path.join(dist, "docs")), false);
  assert.equal(await exists(path.join(dist, "guides")), false);
  assert.equal(await exists(path.join(dist, "latest")), false);
  assert.equal(await exists(path.join(dist, "micronaut-web")), false);
});

test("web workflow publishes the main surface to the gh-pages branch", async () => {
  const workflow = await fs.readFile(
    path.join(projectDirectory, ".github", "workflows", "deploy-web.yml"),
    "utf8",
  );

  assert.match(workflow, /contents:\s*write/);
  assert.match(workflow, /fetch-depth:\s*0/);
  assert.match(workflow, /git worktree add published-web FETCH_HEAD/);
  assert.match(workflow, /checkout --orphan "\$TARGET_BRANCH"/);
  assert.match(workflow, /MICRONAUT_DEPLOY_SURFACE:\s*main/);
  assert.match(workflow, /npm run build:main/);
  assert.match(workflow, /git push origin HEAD:"\$TARGET_BRANCH"/);
  assert.doesNotMatch(workflow, /upload-pages-artifact/);
  assert.doesNotMatch(workflow, /deploy-pages/);
  assert.doesNotMatch(workflow, pagesArtifactTokenPattern);
  assert.doesNotMatch(workflow, /pages:\s*write/);
});

test("branch deployment workflows do not use the GitHub Pages artifact token", async () => {
  const workflows = await Promise.all(
    ["deploy-web.yml", "deploy-docs.yml", "deploy-guides.yml"].map(
      async (workflow) =>
        fs.readFile(
          path.join(projectDirectory, ".github", "workflows", workflow),
          "utf8",
        ),
    ),
  );

  for (const workflow of workflows) {
    assert.doesNotMatch(workflow, pagesArtifactTokenPattern);
    assert.doesNotMatch(workflow, /upload-pages-artifact/);
    assert.doesNotMatch(workflow, /deploy-pages/);
  }
  assert.match(workflows[1], /TARGET_REPOSITORY_TOKEN/);
  assert.match(workflows[2], /TARGET_REPOSITORY_TOKEN/);
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
    /path:\s*external\/docs\/repos\/micronaut-platform/,
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
    { label: "Latest", href: "/latest/", current: true },
    { label: "4.10.14", href: "/4.10.14/" },
    { label: "4.10.1", href: "/4.10.1/" },
    { label: "4.9.4", href: "/4.9.4.html" },
  ]);
  assert.match(await fs.readFile(manifest, "utf8"), /"4\.10\.14"/);
});

test("docs publish merge preserves shared assets and updates version roots", async (t) => {
  const dist = await temporaryDirectory(t);
  const published = await temporaryDirectory(t);
  await writeFiles(dist, [
    "_astro/app.js",
    "assets/1111111111111111/core/docs/img/diagram.svg",
    "index.html",
    "4.10.14/index.html",
    "4.10.14/core/index.html",
  ]);
  await writeFiles(published, [
    "assets/aaaaaaaaaaaaaaaa/unused.png",
    "assets/bbbbbbbbbbbbbbbb/old.png",
    "assets/stylesheets/site.css",
    "docsassets/css/main.css",
    "4.10.1/core/index.html",
    "4.10.1/index.html",
  ]);
  await writeTextFile(
    dist,
    "4.10.14/core/index.html",
    '<img src="../../assets/1111111111111111/core/docs/img/diagram.svg">',
  );
  await writeTextFile(
    published,
    "4.10.1/core/index.html",
    '<img src="../../assets/bbbbbbbbbbbbbbbb/old.png">',
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
      path.join(
        published,
        "assets",
        "1111111111111111",
        "core",
        "docs",
        "img",
        "diagram.svg",
      ),
    ),
    true,
  );
  assert.equal(
    await exists(path.join(published, "assets", "bbbbbbbbbbbbbbbb", "old.png")),
    true,
  );
  assert.equal(
    await exists(
      path.join(published, "assets", "aaaaaaaaaaaaaaaa", "unused.png"),
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
    await fs.readFile(path.join(published, "versions.json"), "utf8"),
    /"4\.10\.14"/,
  );
});

async function importDeploymentConfig(
  scenario: string,
  env: Record<string, string | undefined>,
): Promise<typeof import("../src/lib/deployment-config.ts")> {
  return importWithEnv(deploymentConfigFile, scenario, env);
}

async function importSurfaceRoutes(
  scenario: string,
  env: Record<string, string | undefined>,
): Promise<typeof import("../src/lib/surface-routes.ts")> {
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
    "index.html",
    "launch/index.html",
    "docs/index.html",
    "docs/core/index.html",
    "docs/assets/core/docs/img/diagram.svg",
    "docs/search-index.json",
    "guides/index.html",
    "latest/index.html",
    "latest/guide/index.html",
    "latest/micronaut-http-client/index.html",
    "latest/assets/micronaut-http-client/images/client.png",
    "micronaut-assets/logo.svg",
    "micronaut-web/templates/docs/docs-page.html",
  ];
  await writeFiles(dist, files);
  await writeTextFile(
    dist,
    "docs/core/index.html",
    '<img src="../assets/core/docs/img/diagram.svg?cache=1#diagram">',
  );
  await writeTextFile(
    dist,
    "latest/micronaut-http-client/index.html",
    '<img src="../assets/micronaut-http-client/images/client.png">',
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

async function singleHashedAssetDirectory(directory: string) {
  const entries = await fs.readdir(path.join(directory, "assets"), {
    withFileTypes: true,
  });
  const hashes = entries
    .filter((entry) => entry.isDirectory() && /^[a-f0-9]{16}$/.test(entry.name))
    .map((entry) => entry.name);
  assert.equal(hashes.length, 1);
  return hashes[0];
}

async function exists(file: string) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
