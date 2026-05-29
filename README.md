# Micronaut Web

Astro prototype for three separately hostable Micronaut web surfaces:

- `main`: product entry point at `/` and `/main/`
- `docs`: platform documentation catalog and detail pages under `/docs/`
- `guides`: guides catalog and detail pages under `/guides/`

All surfaces share the same design tokens, React components, docs catalog fixture, and generated guide manifest:

```bash
npm run dev
npm run build
npm run build:main
npm run build:docs
npm run build:guides
```

`npm run check` validates TypeScript, script formatting, tests, and shared snippet styles.
`npm run sync:docs-projects` refreshes the test fixture at `src/data/docs-projects.fixture.json` from a local `micronaut-projects/micronaut-platform` checkout's `gradle/libs.versions.toml` plus the metadata already stored in the fixture.
`src/data/docs-projects.fixture.json` is the checked-in docs project metadata source so CI can run the docs renderer without an external metadata checkout.
`npm run build` also prepares plain HTML template artifacts under `dist/micronaut-web`.

## Script Development

All repository scripts under `scripts/` must be TypeScript files. Add new scripts as `.ts`, import other local script modules with `.ts` extensions, invoke them from `package.json` with `node scripts/...ts` or `node --test scripts/tests/...test.ts`, and keep the full `npm run typecheck:scripts` TypeScript check passing. The script check uses strict TypeScript settings and non-pretty compiler output for CI logs. TypeScript script style is checked separately with `npm run style:scripts`, which is scoped to `scripts/**/*.ts` only. Node 24 or newer is assumed for direct TypeScript script execution, matching CI.

### Package Scripts

| Script                              | Purpose                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                     | Runs TypeScript checks, script formatting, script tests, browser-backed surface tests, and snippet style validation. |
| `npm run snippet-styles`            | Verifies generated docs snippet styles stay shared instead of copied into runtime layout code.                       |
| `npm run sync:docs-projects`        | Refreshes `src/data/docs-projects.fixture.json` from a local Micronaut Platform checkout.                            |
| `npm run render:docs`               | Renders generated docs fragments and the docs project catalog.                                                       |
| `npm run render:guides`             | Renders generated guide fragments and the guide manifest.                                                            |
| `npm run prepare:generated-docs`    | Alias for `render:docs`, used by docs preparation flows.                                                             |
| `npm run prepare:generated-content` | Renders docs and guides generated content together.                                                                  |
| `npm run test:main-site`            | Runs main-site script tests and the main-site Playwright wrapper.                                                    |
| `npm run test:main-site:browser`    | Runs the main-site Playwright spec directly.                                                                         |
| `npm run test:asciidoc`             | Runs shared Asciidoc renderer and macro tests.                                                                       |
| `npm run test:docs`                 | Runs docs script tests and the docs Playwright wrapper.                                                              |
| `npm run test:docs:browser`         | Prepares docs generated content and runs the docs Playwright spec.                                                   |
| `npm run test:guides`               | Runs guides script tests and the guides Playwright wrapper.                                                          |
| `npm run test:guides:browser`       | Prepares guides generated content and runs the guides Playwright spec.                                               |
| `npm run test:deployment`           | Runs deployment, pruning, publishing, and surface-routing script tests.                                              |
| `npm run typecheck`                 | Runs the main TypeScript project check.                                                                              |
| `npm run typecheck:scripts`         | Runs the strict TypeScript check for files under `scripts/`.                                                         |
| `npm run style:scripts`             | Checks TypeScript script formatting with Prettier.                                                                   |
| `npm run dev`                       | Runs the full check, prepares generated content, and starts Astro dev on `127.0.0.1`.                                |
| `npm run build:site`                | Runs checks, prepares generated content, builds Astro, builds the shared header shell, and prepares template artifacts. |
| `npm run build`                     | Same as `build:site`; kept as the default full-site build command.                                                   |
| `npm run build:surface`             | Builds and prunes a selected deployment surface.                                                                     |
| `npm run build:main`                | Builds the standalone main surface.                                                                                  |
| `npm run build:docs`                | Builds the standalone docs surface.                                                                                  |
| `npm run build:guides`              | Builds the standalone guides surface.                                                                                |
| `npm run prune:surface`             | Prunes an existing `dist` output for the selected surface.                                                           |
| `npm run update:docs-versions`      | Rebuilds the published docs version manifest.                                                                        |
| `npm run publish:docs-surface`      | Merges a docs surface build into an existing published docs tree.                                                    |
| `npm run preview`                   | Runs `astro preview` on `127.0.0.1`.                                                                                 |

## Design Tokens

The shared palette intentionally follows the classic micronaut.io direction:

- black hero and footer surfaces
- white content areas
- Micronaut blue for primary CTAs, active states, links, and section bands
- restrained cool gray borders and muted text
- near-black code panels

The logo must stay black on light surfaces and white on dark surfaces. Do not recolor Micronaut logos with blue or other accents; use blue for UI treatments around the brand, not for the mark itself.

Core brand tokens live in `src/styles/globals.css`:

```text
Brand black:        #000000
Brand white:        #ffffff
Micronaut blue:     #2f73b9
Classic site blue:  #337ab7
Blue hover:         #245e99
Blue deep:          #173f67
Blue soft:          #eaf3fb
Light border:       #d9e1e8
Dark background:    #050505
Dark surface:       #111111
Dark blue:          #66a9e6
```

Tailwind can access the extra Micronaut-specific variables through the `@theme inline` mappings, for example `bg-micronaut-blue`, `text-micronaut-blue-deep`, `bg-hero`, `bg-blue-band`, and `bg-code`.

## Content Catalogs

`src/data/docs-projects.fixture.json` contains the checked-in docs project catalog, categories, descriptions, repository links, and platform versions used when generated docs output is unavailable.

`src/data/generated-guides.fixture.json` contains the checked-in guide catalog subset used when generated guide output is unavailable. `src/content/generated-guides/manifest.json` is produced by `npm run render:guides` and ignored as generated content.

## Blog Authoring

### Blog Posts

Blog posts are Astro Markdown content entries under `src/content/main-site/blog`. Use a dated path that mirrors the public slug, for example `src/content/main-site/blog/2026/06/01/example-post.md`. The `slug` frontmatter field is the canonical route without leading or trailing slashes; `href` defaults to `/${slug}/`, so set `href` only when a post needs an explicit canonical override.

Use this shape for a normal post:

````md
---
slug: 2026/06/01/example-post
title: Example Post Title
description: One or two sentences used in cards, metadata, and search previews.
date: '2026-06-01T09:00:00'
modified: '2026-06-01T09:00:00'
category: release-announcements
categories:
  - release-announcements
tags:
  - release
href: /2026/06/01/example-post/
---

Opening paragraph for the post.

## Section Heading

Body copy can use normal Markdown.

```java
class Example {
}
```
````

Required blog fields are `slug`, `title`, and `description`. Dates are optional in the schema, but new posts should set `date` so sorting is predictable; set `modified` when the published content changes after the initial date. `order` is an optional tie-breaker when posts have the same date. `sourceUrl`, `wordpressId`, and `contentSource: wordpress-post` are migration metadata for imported posts and are not required for newly authored content.

The Markdown body is rendered through Astro and then passed through the main-site Markdown renderer. Headings, paragraphs, links, lists, blockquotes, tables, horizontal rules, images, inline code, and fenced code blocks are supported. Fenced code blocks are converted to the shared docs snippet card style; prefer a language marker such as `java`, `kotlin`, `groovy`, `bash`, `xml`, `yaml`, or `gradle`. Some obvious Java, Gradle, and XML snippets can be inferred when the fence has no language, but explicit language markers are easier to maintain.

Use root-relative links for internal routes, such as `/docs/`, `/guides/`, or `/2026/06/01/example-post/`. Links and images pointing at `https://micronaut.io/...` or root-relative Micronaut paths are rewritten through the deployment base-path helpers during rendering. For local images and downloads, put source files under `public/micronaut-assets/main-site/...` and reference them from Markdown with `/micronaut-assets/main-site/...`. Image Markdown should include useful alt text.

### Main-Site Pages

Main-site pages are Markdown content entries under `src/content/main-site/pages`. The route is derived from the file path under that directory: `support.md` becomes `/support/`, `foundation/sponsors.md` becomes `/foundation/sponsors/`, `category/release-announcements.md` becomes `/category/release-announcements/`, and an `index.md` file drops the final `index` segment.

Use this shape for a normal page:

```md
---
order: 12
title: Example Page
eyebrow: Resources
description: One or two sentences used in cards, metadata, and search previews.
sourceUrl: https://micronaut.io/example/
intro: Optional short lead text for the page header.
redirectFrom:
  - /old-example/
---

# Example Page

Normal Markdown page content.
```

Required page fields are `order`, `title`, `eyebrow`, `description`, and `sourceUrl`. `intro` feeds the shared main-site page header for authored pages; body Markdown is rendered as page content for normal pages. `redirectFrom` lists old paths that should redirect to the new route. Adding a page makes the route available and searchable, but it does not automatically add the page to the header or footer; update the relevant navigation data when a new page should be linked globally.

Use `layoutVariant: public-markdown` only for imported public `micronaut.io` Markdown pages whose body already carries the page heading or whose route has special archive/FAQ rendering. This layout variant uses the full main-site content width and suppresses the generated wrapper header for ordinary pages. Omit `layoutVariant` for newly authored pages so they use the default narrower article layout with the generated badge, title, and intro header.

### Blog Categories and Archives

`category` is the primary category slug. It is shown on blog cards and is used by `/category/<slug>/` archive pages. `categories` is an additional list of category slugs; include the primary category there as well so archive membership stays consistent with older imported posts. Category slugs are lower-case kebab-case strings. Existing category pages are:

- `case-studies`
- `guest-post`
- `microcast`
- `micronaut-4`
- `micronaut-5`
- `micronaut-framework-2`
- `release-announcements`
- `security-announcements`
- `sponsor`
- `town-hall-meetings`
- `uncategorized`
- `webinar`

Category archive routes are page-backed. Post metadata decides membership, but it does not create the public category page by itself. To introduce a new public category:

1. Choose a lower-case kebab-case slug, for example `micronaut-6`.
2. Set the post `category` to that slug and include the same slug in `categories`.
3. Add `src/content/main-site/pages/category/<slug>.md` with the normal main-site page frontmatter so `/category/<slug>/` has a title, intro, sections, metadata, and archive content.
4. Add the page to footer or header navigation only when it should be linked globally.

The category archive lists posts whose primary `category` matches the slug or whose `categories` array contains it. The `/blog/` page lists the first 24 regular posts, `/blog/page/<n>/` pages are generated from the post count, and the `success-story` category is excluded from the regular blog archive.

`tags` are lower-case kebab-case slugs used for `/tag/<tag>/` archive routes. Tag archive routes are generated from post metadata and do not require separate page files. The global search dialog indexes main-site pages, docs, guides, and guide tags; blog category and tag archives are normal static routes rather than a separate external search service.

Dated blog slugs automatically get legacy redirects from `/blog/YYYY-MM-DD-post-slug.html` to the canonical dated route. Explicit historical aliases live in `src/lib/blog-redirects.ts`; add there only when an old WordPress URL does not match the generated dated redirect. The `success-story` category is special-cased out of the regular `/blog/` listing; new production stories should normally be authored as pages under `src/content/main-site/pages/micronaut-success-stories/` instead of as blog posts.

## Search

Search is static and catalog-backed. There is no external search service; the UI searches data already shipped in the current surface artifact.

The header search is `SearchDialog`, rendered by `SiteHeader` in the top-menu island and hydrated on load. It opens from the search button or the `Meta/Ctrl+K` keyboard shortcut, then navigates by assigning `window.location.href` through the base-path helpers so the same result paths work in the all-in-one preview, standalone docs, standalone guides, remote-header shells, and GitHub Pages base paths.

The main-site search mode is used on the main, guides, and launch surfaces. Its result sets are built synchronously from:

- `getMainSitePageSummaries()`, passed into `SiteHeader`, for main-site pages.
- `searchItems()` in `src/lib/content-catalog.ts`, backed by `src/data/docs-projects.fixture.json` for docs projects and synthetic docs sections.
- `src/data/generated-guides.fixture.json` for guides and guide tags.

Main-site search groups results into actions, main-site pages, docs and APIs, guides, and tags. Each command item exposes a searchable value made from its kind, title, description, and terms; the `cmdk` command component handles the visible filtering. The source groups are capped before rendering to keep the dialog small: up to 80 main-site pages, 80 docs entries, 80 guide entries, and 40 tags. This mode does not read generated docs HTML, so deep generated headings, configuration properties, and API classes are available only in docs search mode.

Docs search mode is used when `SiteHeader` is rendered with `surface="docs"`. The dialog starts with the synchronous fallback from `docsSearchItems()` and, when opened, fetches the configured docs search index URL or `withBasePath("/docs/search-index.json")`. In standalone docs deployments that path is routed to `/latest/search-index.json`; in the all-in-one preview it stays under `/docs/search-index.json`. If the fetch fails, the fallback project/section/repository index remains usable.

The docs search index route is `src/pages/docs/[searchIndex].json.ts`. It is prerendered only when docs routes are enabled, returns JSON as `{ "items": [...] }`, and sets `Cache-Control: public, max-age=300`. It loads the docs project catalog from `src/content/generated-docs/project-catalog.json` when present, otherwise from `src/data/docs-projects.fixture.json`, then reads generated HTML from `src/content/generated-docs/*.html` and calls `buildDocsSearchIndex(...)` in `scripts/docs/search-index.ts`.

`buildDocsSearchIndex(...)` emits project, docs section, and repository items for every project, then extracts richer generated-doc entries from HTML:

- `h1` and `h2` headings inside `.guide-section-heading` become docs results.
- Table rows whose first cell looks like a configuration property become property results.
- Links to generated `/api/*.html` pages become class results.

Generated entries are deduplicated by scope, href, and title, and each project is capped at 1200 generated items. Docs search adds scope chips for all results, projects, docs, properties, classes, and repositories, then filters by lower-case substring over kind, title, description, and terms before rendering up to 240 results.

Guides catalog filtering is separate from the header dialog. `LatestGuidesCatalog` reads URL parameters on the server: `q` matches guide title, intro, authors, categories, and tags; `category` and `tag` narrow the list; and `sort` accepts `latest`, `title`, or `duration`. Filter links are generated with `filterHref(...)`, so the selected filters remain URL-addressable.

Launch feature search is also separate. It is client-side React state over feature name, title, description, and category; it is not part of the global search index.

## Deployment and Compatibility

This repository is the only source implementation for the three web surfaces. A normal Astro build can render the all-in-one preview, then `scripts/prune-surface.ts` rewrites that full `dist` output into the artifact shape needed by one deploy target.

Production-compatible hosts are:

- `main`: `https://micronaut.io/`
- `docs`: `https://docs.micronaut.io/`
- `guides`: `https://guides.micronaut.io/latest/index.html`

Temporary GitHub Pages hosts keep the repository names in the path:

- `micronaut-web`: main site and Launch at `/micronaut-web/`
- `micronaut-docs`: docs selector at `/micronaut-docs/`, latest docs at `/micronaut-docs/latest/`, and version folders such as `/micronaut-docs/4.10.14/`
- `micronaut-guides`: guides at `/micronaut-guides/latest/`

### Surface Split

Surface builds are selected with `MICRONAUT_DEPLOY_SURFACE=main|docs|guides`. `scripts/build-surface.ts` sets a matching default `ASTRO_BASE`, runs the full static build, then prunes the artifact:

- `npm run build:main` keeps the homepage, Launch, blog/content pages, redirects, `.nojekyll`, shared branding assets, and the shared header shell under `/shell/site-header.js` and `/shell/site-header.css`. It sets `MICRONAUT_PREPARE_GENERATED_CONTENT=false` by default, so the web deployment does not fetch or render docs/guides content. Dynamic docs/guides route generation is disabled for this surface, and pruning removes any remaining docs, guides, latest-route, and template artifacts from the published Pages artifact.
- `npm run build:docs` keeps the docs index, docs project pages, search index, docs version selector, docs redirects, `_astro`, `.nojekyll`, and shared docs assets. It prepares only generated docs content and removes unrelated main and guides route trees.
- `npm run build:guides` renders the generated guides once under `/guides`, moves that tree to `/latest` for the standalone guides artifact, and keeps the root redirect, guide compatibility routes, `_astro`, `.nojekyll`, and shared guide assets. It prepares only generated guides content and removes unrelated main and docs route trees.

Standalone docs and guides builds do not publish their own header shell. In production they render a small static fallback header, load the header stylesheet and React shell from the configured main-site URL, then mount the current `SiteHeader` implementation from `micronaut-web`. This keeps the top navigation owned by the web repository even when docs and guides content are generated from separate repositories. The fallback links use `MICRONAUT_MAIN_SITE_URL`, `MICRONAUT_DOCS_SITE_URL`, and `MICRONAUT_GUIDES_SITE_URL`, so split-repo Pages deployments can point at the correct published artifacts without hard-coded repository names.

The main workflow, `.github/workflows/deploy-web.yml`, runs on pushes to `main`, builds only the web surface, ensures `dist/.nojekyll` is present, uploads the pruned `dist` directory as the GitHub Pages artifact, and deploys it with GitHub Pages Actions. It does not check out Micronaut Platform or Micronaut Guides and does not render generated docs/guides content. The docs and guides workflows are manual publish jobs in this repository:

- `.github/workflows/deploy-docs.yml` publishes to `dstepanov/micronaut-docs` by default.
- `.github/workflows/deploy-guides.yml` publishes to `dstepanov/micronaut-guides` by default.
- The web target uses GitHub Pages Actions deployment from the uploaded `dist` artifact.
- The docs and guides Pages targets branch-deploy to their configured `target_repository` and `target_branch`, defaulting to `dstepanov/micronaut-docs:gh-pages` and `dstepanov/micronaut-guides:gh-pages`.

The web workflow uses the repository's GitHub Pages Actions permissions (`pages:write` and `id-token:write`) and does not need a branch-publish token. Docs and guides use `github.token` when the workflow runs in the target repository; if a workflow in `micronaut-web` pushes to a different repository, set `TARGET_REPOSITORY_TOKEN` with `contents:write` access to that target repository.

External source repositories checked out by the manual docs and guides workflows are placed under `external/` in the GitHub workspace. `actions/checkout` paths must stay inside the workspace; do not use `${{ runner.temp }}` for those checkouts.

The docs workflow resolves `platform_ref` explicitly as a branch first, then as an exact tag, then as a `v`-prefixed tag such as `v4.10.14`, and finally as a raw Git ref or SHA. When `platform_ref` is empty, it starts from `docs_version`, so publishing `docs_version=4.10.14` resolves the Platform tag `v4.10.14`.

### Routing Inputs

The build reads these deployment inputs:

- `ASTRO_BASE`: GitHub Pages project base, such as `/micronaut-web/`, `/micronaut-docs/`, or `/micronaut-guides/`.
- `MICRONAUT_DEPLOY_SURFACE`: active surface, one of `main`, `docs`, `guides`, or `all`.
- `MICRONAUT_DOCS_ROOT`: docs root in the current artifact. It is `/docs` for all-in-one preview and `/<version>` or `/latest` for standalone docs.
- `MICRONAUT_DOCS_LATEST_ROOT`: latest docs root, normally `/latest`.
- `MICRONAUT_GUIDES_ROOT`: public guides root in the current artifact. Source guide pages are authored under `/guides`; standalone guides builds publish that rendered tree at `/latest`.
- `MICRONAUT_GUIDES_LATEST_ROOT`: latest guides root, normally `/latest`.
- `MICRONAUT_PREPARE_GENERATED_CONTENT`: set to `false`, `0`, or `none` to skip generated docs/guides rendering before Astro starts. `build:main` sets this to `false` by default; docs and guides builds leave it enabled but prepare only the generated content for their own surface.
- `DEFAULT_GITHUB_PAGES_ORIGIN`: computed by GitHub Actions from the Pages owner, for example `https://${GITHUB_REPOSITORY_OWNER}.github.io` for the main site or the owner of `target_repository` for docs and guides.
- `MICRONAUT_GITHUB_PAGES_ORIGIN`: effective GitHub Pages host override. When unset, it falls back to `DEFAULT_GITHUB_PAGES_ORIGIN`.
- `MICRONAUT_MAIN_SITE_URL`, `MICRONAUT_DOCS_SITE_URL`, `MICRONAUT_GUIDES_SITE_URL`: optional complete surface URL overrides. When unset, they are derived from `MICRONAUT_GITHUB_PAGES_ORIGIN` plus `micronaut-web`, `micronaut-docs`, or `micronaut-guides`.

All app links should go through `src/lib/base-path.ts` or `src/lib/deployment-config.ts`. Those helpers translate `/docs`, `/guides`, and `/latest` links so the same source can run as an all-in-one preview, standalone docs, standalone guides, or the main site linking to external docs/guides.

### Docs Versions and Latest

Docs are versioned. The docs publish workflow accepts `docs_version`, for example `4.10.14`, and `publish_latest`.

The docs workflow:

1. Checks out this repository.
2. Checks out the target docs Pages repository on `target_branch`, normally `gh-pages`.
3. Checks out the requested Micronaut Platform ref for docs sources and metadata.
4. Runs `scripts/update-docs-version-manifest.ts` against the existing published branch. This rebuilds the selector data from existing version folders plus the version currently being published.
5. Builds a docs surface with `MICRONAUT_DOCS_ROOT=/${docs_version}` and `MICRONAUT_DOCS_LATEST_ROOT=/latest`.
6. Runs `scripts/publish-docs-surface.ts` to merge the new version into the published branch.
7. Commits and pushes the branch.

The docs workflow does not check out or render Micronaut Guides.

The published docs branch layout is:

- `/index.html`: docs selector/index.
- `/versions.json`: compact selector data for published versions.
- `/latest/`: latest docs tree when `publish_latest=true`.
- `/latest.html`: redirect to `/latest/`.
- `/latest/guide/index.html`: compatibility redirect to `/latest/core/`.
- `/<version>/`: immutable docs tree for a published version.
- `/<version>.html`: compatibility redirect to `/<version>/`.
- `/_astro/`: Astro-generated scripts and styles.
- `/assets/<hash>/...`: shared generated content assets.
- `/assets/...` and `/docsassets/...`: preserved upstream docs assets when already present in the published branch.

Older docs are not copied into new builds. They remain in `gh-pages` from previous publishes, and the selector links to those existing version folders or legacy external URLs.

### Guides Latest

Guides are currently published as a latest-only surface. The guides workflow accepts the guides repository/ref to build from, checks out the target guides Pages repository on `target_branch`, builds `npm run build:guides`, replaces the published branch contents with the pruned `dist`, and pushes `gh-pages`. It does not check out Micronaut Platform or render generated docs.

The published guides branch layout is:

- `/index.html`: redirect to `/latest/`.
- `/latest/`: latest guides catalog and generated guide pages.
- `/latest/index.html`: compatibility entry point.
- `/latest/<guide>/`: guide overview or detail pages.
- `/_astro/`: Astro-generated scripts and styles.
- `/assets/<hash>/...`: shared generated guide content assets.

Guide ZIP downloads stay as redirects to the production guide ZIP URLs instead of storing ZIP payloads in the GitHub Pages branch.

### Shared Assets

There are three asset groups:

- `_astro`: Astro-generated JavaScript and CSS. Surface pruning preserves reachable files in this folder, removes unreferenced chunks, and writes `.nojekyll` so GitHub Pages serves underscore-prefixed paths.
- `public/micronaut-assets`: source-controlled brand, icon, and main-site assets used mainly by the main surface.
- Generated docs/guides content assets: images and copied resources produced under generated `assets` folders before pruning.

Docs and guides surface pruning hoists generated docs/guides content assets out of version folders into content-addressed `/assets/<hash>/...` folders, then rewrites generated HTML to reference those shared files. The hash is based on file content, so identical assets across versions share one folder instead of being duplicated under every version. Docs publication preserves referenced shared hash folders and removes unreferenced generated hash folders so old assets do not accumulate unnecessarily.

### UX And Compatibility Contract

This section is the maintainer-facing contract for Micronaut web UI/UX work, legacy URL handling, and production host mapping.

#### PageSpeed Baselines

Observed baselines before the compatibility pass:

| Surface | URL | Form factor | Performance | Accessibility | Best Practices | SEO | Notes |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| Homepage | `${MICRONAUT_GITHUB_PAGES_ORIGIN}/micronaut-web/` | Desktop | 100 | 93 | 100 | 100 | Main issues were shared link naming and low-contrast brand opacity patterns. |
| Homepage | `${MICRONAUT_GITHUB_PAGES_ORIGIN}/micronaut-web/` | Mobile | 96 | 93 | 100 | 100 | Cache lifetime is partly hosting-controlled. |
| Docs index | `${MICRONAUT_GITHUB_PAGES_ORIGIN}/micronaut-web/docs/` | Mobile | 93 | 95 | 100 | 100 | Main issues were unnamed generated anchors, image dimensions, and unused hydrated JS. |
| Core docs | `${MICRONAUT_GITHUB_PAGES_ORIGIN}/micronaut-web/docs/core/` | Desktop | Needs re-run after generated docs render | Needs re-run after generated docs render | Needs re-run after generated docs render | Needs re-run after generated docs render | Core is the heaviest generated page and the main DOM-size/performance risk. |

Known Core docs findings:

- The generated Core page can exceed 100k DOM nodes when the full guide is rendered.
- Generated heading anchor links must have accessible names.
- Generated docs images should have stable dimensions or get dimensions attached once loaded.
- Render-blocking and unused JavaScript should be reduced by keeping static page chrome server-rendered where possible and hydrating only interactive controllers.

#### UI/UX Findings And Intended Fixes

- Header and footer logo links need explicit accessible names because the visual logo image is decorative.
- Generated heading anchors need `aria-label` values derived from heading text.
- Repeated generic links such as guide card "Read" actions need item-specific labels.
- Brand-colored text should not rely on reduced opacity where that can lower contrast.
- Logos, project icons, customer logos, language icons, and generated docs images need stable sizing to reduce layout shift.
- Docs/Core should favor readable generated content, a predictable sidebar, and active section state without making the generated article part of a large hydrated island.
- Guides index must remain available at `/latest/index.html` and support URL-backed filtering with `q`, `category`, `tag`, and `sort`.
- Launch share URLs should remain stable while exposing validation, selected-feature summary, and keyboard-friendly flow.

#### Compatibility Manifest Schema

Route aliases and redirects should be added through `src/lib/route-compatibility.ts` so compatibility remains centralized.

Each route compatibility entry has:

| Field | Purpose |
| --- | --- |
| `id` | Stable identifier used by tests and route modules. |
| `sourceSurface` | Surface receiving the legacy URL: `main`, `docs`, `guides`, or `assets`. |
| `sourcePath` | Representative legacy path, with `{placeholder}` markers for route families. |
| `destinationSurface` | Surface that owns the canonical destination. |
| `previewDestinationPath` | All-in-one preview target, before `ASTRO_BASE` is applied. |
| `productionDestinationPath` | Production target path on `destinationSurface`. |
| `status` | Expected status for redirect-style routes, or `200` for production aliases. |
| `behavior` | `canonical`, `redirect`, `external-redirect`, or `alias`. |
| `preservesSearch` | Whether query strings are expected to survive the redirect. |
| `preservesHash` | `client`, `same-document`, or `not-available`. URL fragments are not sent to servers, so server redirects cannot preserve them. |
| `notes` | Maintainer context and constraints. |

When a legacy route is added, update the manifest and add or update one route module. Avoid duplicating redirect tables across pages.

#### Compatibility Matrix

| Representative old URL | Preview behavior | Production behavior | Notes |
| --- | --- | --- | --- |
| `https://micronaut.io/core/` | Deferred until `/core/` routing is resumed | Deferred until main-host Core routing is resumed | Tracked here as a known legacy URL, but not implemented in this pass. |
| `/core/?q=bean` | Deferred until `/core/` routing is resumed | Deferred until main-host Core routing is resumed | Query/hash preservation should be covered when this route is reintroduced. |
| `https://docs.micronaut.io/latest/guide/` | `/micronaut-web/latest/guide/` redirects to `/micronaut-web/docs/core/` | Remains Core docs on docs host | Production may serve this as canonical or alias. |
| `https://docs.micronaut.io/latest/guide/index.html#ioc` | `/micronaut-web/latest/guide/index.html` redirects to `/micronaut-web/docs/core/#ioc` in client-capable redirects | Redirect or alias to Core docs with the same section | Fragments require client redirect pages. |
| `https://guides.micronaut.io/latest/index.html` | `/micronaut-web/latest/index.html` redirects to `/micronaut-web/guides/` | Redirect or alias to guides latest index | Query strings are preserved. |
| `https://guides.micronaut.io/latest/tag-security.html` | Redirects to the generated `/guides/` tag route when present, otherwise external production tag URL | Served or redirected by guides production | Existing tag compatibility stays generated from guide metadata. |
| `https://guides.micronaut.io/latest/micronaut-http-client.html` | Redirects to slash-style generated `/guides/` overview when present, otherwise external production URL | Served by guides production | Applies to guide overview `.html` pages. |
| `https://guides.micronaut.io/latest/micronaut-http-client-gradle-java.html` | Redirects to slash-style generated `/guides/` variant when present, otherwise external production URL | Served by guides production | Applies to language/build variants. |
| `https://guides.micronaut.io/latest/micronaut-http-client-gradle-java.zip` | Redirects to production ZIP URL | Production ZIP remains downloadable | ZIP redirects are temporary external redirects. |
| `https://micronaut.io/blog/2020-04-30-introducing-micronaut-launch.html` | Redirects to the canonical dated post | Redirects to the canonical dated post | Dated blog aliases are generated from post metadata. |
| `https://micronaut.io/blog/2019-07-18-unleashing-predator-precomputed-data-repositories.html` | Redirects to `/2019/07/18/announcing-micronaut-data/` | Same canonical post | Explicit historical aliases remain in `blog-redirects`. |
| Any supported route with `#section` | Same-document anchors stay intact; client redirect pages preserve hashes across route changes | Same rule | Server redirects cannot see fragments. |

#### Canonical URL Rules

- Main-site canonical content uses `https://micronaut.io/`.
- Docs canonical catalog pages use `https://docs.micronaut.io/`; Core legacy docs paths continue to resolve.
- Guides canonical generated guide URLs use `https://guides.micronaut.io/latest/`.
- GitHub Pages preview URLs must always be generated with `ASTRO_BASE`, not hard-coded as production links.
- Split GitHub Pages deployments must use the repo-name bases until custom domains are enabled: `/micronaut-web/`, `/micronaut-docs/`, and `/micronaut-guides/`.
- Docs version publishing updates the selector from the Pages branch and preserves shared root assets so older versions do not duplicate the same asset trees.
- Legacy URLs should prefer permanent redirects unless the destination points to another production host for generated artifacts, where temporary redirects are safer.
- Main-host `/core/` compatibility is intentionally deferred for now; add it through `src/lib/route-compatibility.ts` when route work resumes.

#### Accessibility And Performance Acceptance Criteria

- Docs accessibility target: 100 after generated docs are present.
- No known shared unnamed logo link or generated heading-anchor link remains.
- Repeated generic links must have accessible names that identify the target item.
- CLS remains `0` for docs mobile.
- Docs mobile performance improves from the baseline without introducing new render-blocking script work.
- Images in static components have explicit intrinsic dimensions or a stable sizing wrapper.
- Generated docs images receive lazy loading, async decoding, and dimensions when the browser can determine them.

#### Manual QA Checklist

- Build with `ASTRO_BASE=/micronaut-web/` and verify all preview links keep the base path.
- Check `/`, `/docs/`, `/docs/core/`, `/latest/index.html`, `/latest/guide/`, `/latest/guide/index.html`, `/guides/`, a guide detail page, `/launch/`, `/blog/`, a dated blog alias, and a content page.
- Repeat the checks on desktop and mobile widths.
- Verify `/latest/guide/index.html#ioc` preserves the fragment after redirect.
- Verify guides filters update and restore state with `q`, `category`, `tag`, and `sort`.
- Verify Launch share URLs keep selected settings/features and validation text is announced through field descriptions.
- Re-run PageSpeed or Lighthouse-style checks for homepage, docs index, and Core docs after deployment assets are available.

#### Automated Checks

Run:

```bash
npm run typecheck
npm run typecheck:scripts
npm run test:main-site
npm run test:asciidoc
npm run test:guides
npm run test:docs
npm run build
```

This repository keeps shared Asciidoc renderer coverage in `test:asciidoc` and docs integration coverage in `test:docs`; use `test:docs` for planned `test:platform-docs` coverage unless a separate script is introduced.

## Astro Publishing Best Practices

Keep published content canonical. A content page should have one source route, and compatibility URLs such as legacy blog paths should redirect to that route instead of rendering duplicate page bodies. When adding a compatibility route, prefer the centralized redirect and alias helpers so redirects remain `noindex` and easy to audit.

Route internal links through `src/lib/base-path.ts` or `src/lib/deployment-config.ts`. Do not hard-code `/docs`, `/guides`, `/latest`, or GitHub Pages repository prefixes in components or generated HTML; the deployment helpers keep links valid across all-in-one preview, standalone docs, standalone guides, and the main site.

Use Astro islands deliberately. Hydrate only UI that must run in the browser, and prefer static Astro markup for shared layout such as headers, navigation structure, and content shells wherever possible. Reserve `client:load` for controls that must be interactive immediately; use `client:idle` or `client:visible` for lower-priority UI.

#### Island Usage

Default to static Astro components for route chrome and generated content. Generated docs, generated guides, sidebar link trees, version lists, and article bodies should render as HTML first and should not become React islands just to attach a small behavior.

Use a React island only when the component owns meaningful client state, keyboard handling, focus management, or third-party interactive primitives. Current docs pages intentionally hydrate `SiteHeader`, `DocsSidebarRailControl`, and `DocsSidebarMobileSheet`. Docs scroll-spy behavior lives in `src/components/web/docs-scroll-spy.astro` as a processed Astro script. Do not reintroduce a docs version switcher island; `src/components/web/docs-version-selector.astro` renders fallback options statically and uses a processed Astro script to fetch `/versions.json`.

For small native controls, use an Astro component plus a processed `<script>` instead of `client:*`. The script should import shared routing helpers, leave server-rendered fallback markup usable when fetches fail, and enhance all matching instances on the page. If the control can appear inside a hydrated React island, such as content passed into a mobile sheet, use delegated events and handle late DOM insertion through `astro:hydrate` or a narrowly scoped observer.

When adding, removing, or changing an island, inspect built HTML for `<astro-island>` markers and update tests that encode the expected island inventory. A docs page should not include `DocsVersionSwitcher` in `component-export`, `component-url`, or bundled source output.

Avoid broad browser-side dynamic imports. Syntax highlighting, especially Shiki, should run at build time where possible or use a constrained language/theme bundle. Do not ship full highlighter language catalogs to the browser for small preview panes or generated content.

Use `is:inline` only for intentional critical scripts, such as the early theme script that prevents a visible color-mode flash. Non-critical scripts should be processed by Astro so they can be bundled, deduplicated, and cached.

Keep shared CSS focused. Global design tokens and cross-surface primitives belong in `src/styles/globals.css`, but route-specific styling should stay close to the route or component that needs it. Avoid adding one-off page styles to the global baseline.

Deduplicate public assets before publishing. Prefer canonical asset paths for shared logos, brand files, PDFs, and generated content assets, and keep legacy copies only when external compatibility requires them.

Prune published artifacts. Surface publication should remove unreferenced `_astro` chunks and unrelated surface output so Pages branches do not accumulate stale JavaScript, CSS, docs, guides, or template artifacts.

Pin npm dependencies. Avoid `latest` ranges in `package.json`; use exact or caret-bounded versions so local builds, CI, and Pages publishes resolve the same Astro, React, Vite, and tooling behavior.
