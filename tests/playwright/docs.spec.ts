import { expect, test, type Page } from "@playwright/test";
import {
  collectRuntimeScriptAssertions,
  expectClipboardText,
  expectNoForbiddenRuntimeLibraries,
  installClipboardMock,
} from "./runtime-script-assertions";

const docsProjects = [
  {
    language: "java",
    name: "Micronaut Core",
    requireDependency: true,
    requireProperties: true,
    slug: "core",
  },
  {
    language: "kotlin",
    name: "Micronaut Data",
    requireDependency: false,
    requireProperties: false,
    slug: "data",
  },
  {
    language: "groovy",
    name: "Micronaut Serialization",
    requireDependency: false,
    requireProperties: false,
    slug: "serde",
  },
];

test("docs catalog lays out generated project cards", async ({ page }) => {
  const failures = collectBrowserFailures(page);

  await page.goto(appPath("/docs/"));

  await expect(page.locator("[data-docs-shell]")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Playwright Copied Docs" }),
  ).toBeVisible();

  const cards = page.locator('main [data-slot="card"]');
  await expect(cards).toHaveCount(docsProjects.length);
  for (const project of docsProjects) {
    const card = cards.filter({ hasText: project.name });
    await expect(card).toBeVisible();
    await expect(card.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      docsProjectHrefPattern(project.slug),
    );
  }

  await expectNoHorizontalOverflow(page);
  expect(failures).toEqual([]);
});

test("generated docs page renders desktop content and sidebars without overlap", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  await page.goto(appPath("/docs/core/"));

  await expect(
    page.getByRole("heading", {
      exact: true,
      level: 1,
      name: "Micronaut Core",
    }),
  ).toBeVisible();
  await expect(page.locator("[data-generated-docs]")).toBeVisible();
  await expect(
    page.locator(".docs-code-snippet-template").first(),
  ).toBeVisible();
  await expect(page.locator(".docs-properties-template").first()).toBeVisible();

  const docsSidebar = page.locator("[data-docs-sidebar]");
  await expect(docsSidebar).toBeVisible();
  await expect(
    docsSidebar.getByRole("link", { name: "Micronaut Core" }),
  ).toHaveAttribute("aria-current", "page");

  const sectionNav = page.locator('aside[aria-label="In this section"]');
  await expect(sectionNav).toBeVisible();
  await expect(
    sectionNav.getByRole("link", { name: "1 Introduction" }),
  ).toBeVisible();
  await expect(
    sectionNav.getByRole("link", { name: "2 Quick Start" }),
  ).toBeVisible();
  const ordinarySourceBlocks = sectionNav.getByRole("link", {
    name: "Ordinary Source Blocks",
  });
  await expect(ordinarySourceBlocks).toBeVisible();
  await expect(
    sectionNav.getByRole("link", { name: "Generated Snippet Macros" }),
  ).toBeVisible();
  await page.evaluate(() =>
    document.getElementById("core-_ordinary_source_blocks")?.scrollIntoView(),
  );
  await expect(ordinarySourceBlocks).toHaveAttribute("data-active", "true");
  await expect(ordinarySourceBlocks).toHaveAttribute(
    "aria-current",
    "location",
  );
  await expectTopHeaderPinned(page);

  await expectNoHorizontalOverflow(page);
  await expectElementInsideViewport(page, ".docs-code-snippet-template");
  await expectElementsDoNotOverlap(
    page,
    "[data-generated-docs]",
    'aside[aria-label="In this section"]',
  );
  expect(failures).toEqual([]);
});

test("docs runtime scripts do not include build-time content processors", async ({
  page,
}) => {
  const runtimeScripts = collectRuntimeScriptAssertions(page);
  const failures = collectBrowserFailures(page);
  await installClipboardMock(page);

  await page.goto(appPath("/docs/core/"));

  await expect(
    page.locator(".docs-code-snippet-template").first(),
  ).toBeVisible();
  await expect(
    page.locator(".docs-code-snippet-template code span[style]").first(),
  ).toBeVisible();
  const firstSnippet = page.locator(".docs-code-snippet-template").first();
  const tabs = firstSnippet.locator(".docs-snippet-tabs button[role='tab']");
  if ((await tabs.count()) > 1) {
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  }
  await firstSnippet.locator("[data-copy-active-snippet]").click();
  await expect(
    firstSnippet.locator("[data-copy-active-snippet]"),
  ).toHaveAttribute("aria-label", "Copied");
  await expectClipboardText(page);

  await expectNoForbiddenRuntimeLibraries(runtimeScripts);
  expect(failures).toEqual([]);
});

test("generated docs pages convert snippets for selected real projects", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  for (const project of docsProjects) {
    await page.goto(appPath(`/docs/${project.slug}/`));

    await expect(
      page.getByRole("heading", {
        exact: true,
        level: 1,
        name: project.name,
      }),
    ).toBeVisible();
    await expectConvertedGeneratedSnippets(page, {
      language: project.language,
      requireDependency: project.requireDependency,
      requireProperties: project.requireProperties,
    });
    await expectNoHorizontalOverflow(page);
  }

  expect(failures).toEqual([]);
});

test("generated docs page fits the mobile viewport", async ({ page }) => {
  const failures = collectBrowserFailures(page);
  await page.setViewportSize({ width: 390, height: 860 });

  await page.goto(appPath("/docs/data/"));

  await expect(page.locator("[data-generated-docs]")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      exact: true,
      level: 1,
      name: "Micronaut Data",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open docs navigation" }),
  ).toBeVisible();
  await expect(
    page.locator(".docs-code-snippet-template").first(),
  ).toBeVisible();
  await expect(
    page.locator('aside[aria-label="In this section"]'),
  ).toBeHidden();

  await expectNoHorizontalOverflow(page);
  await expectElementInsideViewport(page, ".docs-code-snippet-template");
  expect(failures).toEqual([]);
});

function collectBrowserFailures(page: Page) {
  const failures: string[] = [];
  page.on("pageerror", (error) => {
    failures.push(`page error: ${error.message}`);
  });
  page.on("requestfailed", (request) => {
    if (request.resourceType() === "script") {
      failures.push(
        `script request failed: ${request.url()} ${request.failure()?.errorText || ""}`.trim(),
      );
    }
  });
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "script" &&
      response.status() >= 400
    ) {
      failures.push(
        `script response failed: ${response.url()} ${response.status()}`,
      );
    }
  });
  return failures;
}

function docsProjectHrefPattern(slug: string): RegExp {
  if (process.env.MICRONAUT_DEPLOY_SURFACE === "docs") {
    return new RegExp(
      `${escapeRegExp(appPath(`${configuredDocsRoot()}${slug}/`))}$`,
    );
  }
  return new RegExp(`/docs/${slug}/$`);
}

function configuredDocsRoot(): string {
  return normalizeRoot(process.env.MICRONAUT_DOCS_ROOT || "/latest");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function expectConvertedGeneratedSnippets(
  page: Page,
  {
    language,
    requireDependency,
    requireProperties,
  }: {
    language: string;
    requireDependency: boolean;
    requireProperties: boolean;
  },
): Promise<void> {
  const root = page.locator("[data-generated-docs]");
  await expect(root).toBeVisible();

  const codeSnippets = root.locator(".docs-code-snippet-template");
  await expect(codeSnippets.first()).toBeVisible();
  await expect(
    codeSnippets.locator(`button[data-lang="${language}"]`).first(),
  ).toBeVisible();
  await expect(
    root.locator("[data-copy-active-snippet]").first(),
  ).toBeVisible();
  await expect(root.locator(".docs-code-callouts").first()).toBeVisible();
  await expect(root.locator(".listingblock")).toHaveCount(0);
  await expect(
    root.locator(".literalblock pre").filter({ hasText: /^\[source,/ }),
  ).toHaveCount(0);

  if (requireProperties) {
    await expect(
      root.locator(".docs-properties-template").first(),
    ).toBeVisible();
  }
  if (requireDependency) {
    await expect(
      root.locator(".docs-dependency-template").first(),
    ).toBeVisible();
  }
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectElementInsideViewport(
  page: Page,
  selector: string,
): Promise<void> {
  const box = await page.locator(selector).first().boundingBox();
  const viewport = page.viewportSize();
  assertBox(box, selector);
  expect(viewport).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual((viewport?.width || 0) + 1);
}

async function expectElementsDoNotOverlap(
  page: Page,
  leftSelector: string,
  rightSelector: string,
): Promise<void> {
  const left = await page.locator(leftSelector).first().boundingBox();
  const right = await page.locator(rightSelector).first().boundingBox();
  assertBox(left, leftSelector);
  assertBox(right, rightSelector);
  expect(left.x + left.width).toBeLessThanOrEqual(right.x + 8);
}

async function expectTopHeaderPinned(page: Page): Promise<void> {
  const banner = page.getByRole("banner");
  await expect(banner).toBeVisible();
  await expect
    .poll(async () => Math.round((await banner.boundingBox())?.y ?? -1))
    .toBe(0);
}

function assertBox(
  box: Awaited<ReturnType<ReturnType<Page["locator"]>["boundingBox"]>>,
  selector: string,
): asserts box is NonNullable<typeof box> {
  expect(box, `${selector} should have a layout box`).not.toBeNull();
}

function appPath(path: string): string {
  const basePath = normalizeBasePath(
    process.env.PLAYWRIGHT_BASE_PATH || process.env.ASTRO_BASE,
  );
  if (path === "/") {
    return basePath;
  }
  return `${basePath}${path.replace(/^\/+/, "")}`;
}

function normalizeBasePath(path: string | undefined): string {
  if (!path || path === "/") {
    return "/";
  }
  const absolutePath = path.startsWith("/") ? path : `/${path}`;
  return absolutePath.endsWith("/") ? absolutePath : `${absolutePath}/`;
}

function normalizeRoot(path: string): string {
  const absolutePath = path.startsWith("/") ? path : `/${path}`;
  if (absolutePath === "/") {
    return "/";
  }
  return absolutePath.endsWith("/") ? absolutePath : `${absolutePath}/`;
}
