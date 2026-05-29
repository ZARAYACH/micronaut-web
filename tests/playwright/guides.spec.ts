import { expect, test, type Page } from "@playwright/test";

const httpClientGuideTitle = "Micronaut HTTP Client";
const generatedGuidePages = [
  {
    dependencyLanguage: "gradle",
    expectedHeadings: [
      "What you will need",
      "Solution",
      "Writing the Application",
    ],
    expectedText: "Download and unzip the source",
    requireDependency: true,
    requireProperties: true,
    sourceLanguage: "java",
    slug: "micronaut-http-client-gradle-java",
    title: httpClientGuideTitle,
  },
  {
    dependencyLanguage: "maven",
    expectedHeadings: [
      "What you will need",
      "Solution",
      "Writing the Application",
    ],
    expectedText: "Download and unzip the source",
    requireDependency: true,
    requireProperties: true,
    sourceLanguage: "kotlin",
    slug: "micronaut-http-client-maven-kotlin",
    title: httpClientGuideTitle,
  },
  {
    dependencyLanguage: "gradle",
    expectedHeadings: [
      "What you will need",
      "Solution",
      "Writing the Application",
    ],
    expectedText: "Download and unzip the source",
    requireDependency: false,
    requireProperties: false,
    sourceLanguage: "java",
    slug: "creating-your-first-micronaut-app-gradle-java",
    title: "Creating your first Micronaut application",
  },
  {
    dependencyLanguage: "gradle",
    expectedHeadings: [
      "What you will need",
      "Solution",
      "Writing the Application",
    ],
    expectedText: "Download and unzip the source",
    requireDependency: true,
    requireProperties: true,
    sourceLanguage: "java",
    slug: "micronaut-data-jdbc-repository-gradle-java",
    title: "Access a database with Micronaut Data JDBC",
  },
  {
    dependencyLanguage: "gradle",
    expectedHeadings: ["Content Macros", "Snippet Macros"],
    expectedRenderedText: [
      "Common template value: COMMON.",
      "External guide include content.",
      "Rocker template include content.",
      "Source callout loaded from a guide callout macro.",
      "Grouped HTTP client dependency.",
    ],
    expectedText: "Common guide snippet content.",
    requireDependency: true,
    requireProperties: false,
    sourceLanguage: "java",
    slug: "snippet-gallery-gradle-java",
    title: "Snippet Gallery",
  },
];

test("guide catalog hydrates guide card islands and variant menus", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  await page.goto(appPath("/guides/"));

  await expect(
    page.getByRole("heading", { level: 1, name: "Micronaut Guides" }),
  ).toBeVisible();

  const card = page
    .locator("[data-guide-card]", { hasText: httpClientGuideTitle })
    .first();
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();

  const island = card.locator("astro-island").first();
  await expect(island).toBeVisible();
  await expect
    .poll(async () =>
      island.evaluate((element) => !element.hasAttribute("ssr")),
    )
    .toBe(true);

  await expect(
    card.getByRole("link", { name: `Read ${httpClientGuideTitle}` }),
  ).toHaveAttribute(
    "href",
    guideHrefPattern("micronaut-http-client-gradle-java.html"),
  );

  await card
    .getByRole("button", { name: `Choose variant for ${httpClientGuideTitle}` })
    .click();

  const javaGradle = page.getByRole("menuitem", { name: /Java\s+Gradle/ });
  await expect(javaGradle).toBeVisible();
  await expect(javaGradle).toHaveAttribute("aria-current", "page");

  const kotlinGradle = page.getByRole("menuitem", {
    name: /Kotlin\s+Gradle/,
  });
  await expect(kotlinGradle).toHaveAttribute(
    "href",
    guideHrefPattern("micronaut-http-client-gradle-kotlin.html"),
  );

  if (isGuidesSurface()) {
    await page.goto(appPath("/guides/micronaut-http-client-gradle-kotlin/"));
  } else {
    await kotlinGradle.click();
  }

  await expect(page).toHaveURL(
    guideUrlPattern("micronaut-http-client-gradle-kotlin"),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: httpClientGuideTitle }),
  ).toBeVisible();
  expect(failures).toEqual([]);
});

test("guide overview redirects to the preferred variant and exposes variant navigation", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  await page.goto(
    appPath(
      isGuidesSurface()
        ? "/guides/micronaut-http-client-gradle-java/"
        : "/guides/micronaut-http-client.html",
    ),
  );

  await expect(page).toHaveURL(
    guideUrlPattern("micronaut-http-client-gradle-java"),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: httpClientGuideTitle }),
  ).toBeVisible();
  await expect(page.getByText("Guide content unavailable")).toHaveCount(0);
  await expect(
    page.getByText(
      "In this guide, we will create a Micronaut application written in Java",
    ),
  ).toBeVisible();
  await expect(
    page.locator(".docs-code-snippet-template").first(),
  ).toBeVisible();

  const guideNavigation = page.locator('aside[aria-label="On this guide"]');
  await expect(guideNavigation).toBeVisible();
  await expect(
    guideNavigation.getByRole("link", { name: "Java / Gradle" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    guideNavigation.getByRole("link", { name: "Kotlin / Maven" }),
  ).toHaveAttribute(
    "href",
    guideHrefPattern("micronaut-http-client-maven-kotlin.html"),
  );
  expect(failures).toEqual([]);
});

test("generated guide pages are rendered from real sources with converted snippets", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  for (const guide of generatedGuidePages) {
    await page.goto(appPath(`/guides/${guide.slug}/`));

    await expect(page).toHaveURL(guideUrlPattern(guide.slug));
    await expect(
      page.getByRole("heading", { level: 1, name: guide.title }),
    ).toBeVisible();
    await expect(page.getByText("Guide content unavailable")).toHaveCount(0);
    const content = page.locator(".generated-guides-content");
    for (const heading of guide.expectedHeadings) {
      await expect(
        content.getByRole("heading", {
          exact: true,
          name: heading,
        }),
      ).toBeVisible();
    }
    await expect(content.getByText(guide.expectedText).first()).toBeVisible();
    for (const text of guide.expectedRenderedText || []) {
      await expect(content.getByText(text).first()).toBeVisible();
    }
    await expectConvertedGuideSnippets(page, guide);
  }

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

async function expectConvertedGuideSnippets(
  page: Page,
  {
    dependencyLanguage,
    requireDependency,
    requireProperties,
    sourceLanguage,
  }: {
    dependencyLanguage: string;
    requireDependency: boolean;
    requireProperties: boolean;
    sourceLanguage: string;
  },
): Promise<void> {
  const root = page.locator(".generated-guides-content");
  await expect(root).toBeVisible();

  const codeSnippets = root.locator(".docs-code-snippet-template");
  await expect.poll(async () => codeSnippets.count()).toBeGreaterThanOrEqual(4);
  await expect(
    codeSnippets.locator(`button[data-lang="${sourceLanguage}"]`).first(),
  ).toBeVisible();
  await expect(
    root.locator("[data-copy-active-snippet]").first(),
  ).toBeVisible();
  await expect(root.locator(".listingblock")).toHaveCount(0);
  await expect(
    root.locator(".literalblock pre").filter({ hasText: /^\[source,/ }),
  ).toHaveCount(0);

  if (requireDependency) {
    await expect(
      root.locator(".docs-dependency-template").first(),
    ).toBeVisible();
    await expect(
      root
        .locator(".docs-dependency-template")
        .locator(`button[data-lang="${dependencyLanguage}"]`)
        .first(),
    ).toBeVisible();
  }
  if (requireProperties) {
    await expect(
      root.locator(".docs-properties-template").first(),
    ).toBeVisible();
  }

  expect(await root.innerHTML()).not.toMatch(
    /\b(?:common|source|dependency|zipInclude|diffLink):{1,2}[^<\[]*\[[^\]]*]/,
  );
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

function guideHrefPattern(file: string): RegExp {
  if (isGuidesSurface()) {
    return new RegExp(`${escapeRegExp(appPath(`/latest/${file}`))}$`);
  }
  return new RegExp(`/guides/${escapeRegExp(file)}$`);
}

function guideUrlPattern(slug: string): RegExp {
  if (isGuidesSurface()) {
    return new RegExp(
      `${escapeRegExp(appPath(`/guides/${slug}`))}(?:\\.html|/)$`,
    );
  }
  return new RegExp(`/guides/${escapeRegExp(slug)}(?:\\.html|/)$`);
}

function isGuidesSurface(): boolean {
  return process.env.MICRONAUT_DEPLOY_SURFACE === "guides";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeBasePath(path: string | undefined): string {
  if (!path || path === "/") {
    return "/";
  }
  const absolutePath = path.startsWith("/") ? path : `/${path}`;
  return absolutePath.endsWith("/") ? absolutePath : `${absolutePath}/`;
}
