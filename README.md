# Micronaut Web

Astro prototype for three separately hostable Micronaut web surfaces:

- `main`: product entry point at `/` and `/main/`
- `docs`: platform documentation catalog and detail pages under `/docs/`
- `guides`: guides catalog and detail pages under `/guides/`

All surfaces share the same protocol file, design tokens, and React components. The protocol is checked in as a static contract for the prototype:

```bash
npm run dev
npm run build
npm run build:main
npm run build:docs
npm run build:guides
```

`npm run protocol` validates the checked-in protocol file without reading sibling repositories.
`npm run sync:docs-projects` refreshes the test fixture at `src/data/docs-projects.fixture.json` from a local `micronaut-projects/micronaut-platform` checkout's `gradle/libs.versions.toml` plus checked-in project metadata.
`src/data/docs/docs-projects.properties` is checked-in docs project metadata so CI can run the docs renderer without an external metadata checkout.
`npm run build` also prepares plain HTML template artifacts under `dist/micronaut-web`.

## Script Development

All repository scripts under `scripts/` must be TypeScript files. Add new scripts as `.ts`, import other local script modules with `.ts` extensions, invoke them from `package.json` with `node scripts/...ts` or `node --test scripts/...test.ts`, and keep the full `npm run typecheck:scripts` TypeScript check passing. The script check uses strict TypeScript settings and non-pretty compiler output for CI logs. TypeScript script style is checked separately with `npm run style:scripts`, which is scoped to `scripts/**/*.ts` only. Node 24 or newer is assumed for direct TypeScript script execution, matching CI.

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

## Protocol

`src/data/protocol.json` contains:

- `surfaces`: deployment entries for `main`, `docs`, and `guides`
- `docs.categories`: platform documentation category groups
- `docs.projects`: all platform documentation projects with links, descriptions, references, sections, and search terms
- `guides.categories`: guide category groups discovered from guide metadata
- `guides.guides`: all guides with tags, variants, authors, dates, and searchable metadata

`src/data/protocol.schema.json` documents the expected contract for future generators.

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

- `npm run build:main` keeps the homepage, Launch, blog/content pages, redirects, and shared branding assets. It sets `MICRONAUT_PREPARE_GENERATED_CONTENT=false` by default, so the web deployment does not fetch or render docs/guides content. Dynamic docs/guides route generation is disabled for this surface, and pruning removes any remaining docs, guides, latest-route, and template artifacts from the published Pages branch.
- `npm run build:docs` keeps the docs index, docs project pages, search index, docs version selector, docs redirects, `_astro`, `.nojekyll`, and shared docs assets. It prepares only generated docs content and removes unrelated main and guides route trees.
- `npm run build:guides` keeps the latest guides tree, root redirect, guide compatibility routes, `_astro`, `.nojekyll`, and shared guide assets. It prepares only generated guides content and removes unrelated main and docs route trees.

The main workflow, `.github/workflows/deploy-web.yml`, runs on pushes to `main`, checks out this repository's `gh-pages` branch, builds only the web surface, replaces the branch contents with the pruned `dist`, and pushes the branch. It does not check out Micronaut Platform or Micronaut Guides and does not render generated docs/guides content. The docs and guides workflows are manual publish jobs in this repository:

- `.github/workflows/deploy-docs.yml` publishes to `dstepanov/micronaut-docs` by default.
- `.github/workflows/deploy-guides.yml` publishes to `dstepanov/micronaut-guides` by default.
- All three Pages targets use branch-based GitHub Pages deployment from `gh-pages`.
- The web workflow exposes `target_branch`, defaulting to `gh-pages`.
- The docs and guides workflows expose `target_repository` and `target_branch`, defaulting to the target repo and `gh-pages`.

Branch-based Pages deployment does not use a dedicated Pages deployment secret. The web workflow publishes to this repository's `gh-pages` branch with the default `github.token`. Docs and guides also use `github.token` when the workflow runs in the target repository; if a workflow in `micronaut-web` pushes to a different repository, set `TARGET_REPOSITORY_TOKEN` with `contents:write` access to that target repository.

External source repositories checked out by the manual docs and guides workflows are placed under `external/` in the GitHub workspace. `actions/checkout` paths must stay inside the workspace; do not use `${{ runner.temp }}` for those checkouts.

The docs workflow resolves `platform_ref` explicitly as a branch first, then as an exact tag, then as a `v`-prefixed tag such as `v4.10.14`, and finally as a raw Git ref or SHA. When `platform_ref` is empty, it starts from `docs_version`, so publishing `docs_version=4.10.14` resolves the Platform tag `v4.10.14`.

### Routing Inputs

The build reads these deployment inputs:

- `ASTRO_BASE`: GitHub Pages project base, such as `/micronaut-web/`, `/micronaut-docs/`, or `/micronaut-guides/`.
- `MICRONAUT_DEPLOY_SURFACE`: active surface, one of `main`, `docs`, `guides`, or `all`.
- `MICRONAUT_DOCS_ROOT`: docs root in the current artifact. It is `/docs` for all-in-one preview and `/<version>` or `/latest` for standalone docs.
- `MICRONAUT_DOCS_LATEST_ROOT`: latest docs root, normally `/latest`.
- `MICRONAUT_GUIDES_ROOT`: guides root in the current artifact. It is `/guides` for all-in-one preview and `/latest` for standalone guides.
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

- `_astro`: Astro-generated JavaScript and CSS. Surface pruning preserves this folder and writes `.nojekyll` so GitHub Pages serves underscore-prefixed paths.
- `public/micronaut-assets`: source-controlled brand, icon, and main-site assets used mainly by the main surface.
- Generated docs/guides content assets: images and copied resources produced under generated `assets` folders before pruning.

Docs and guides surface pruning hoists generated docs/guides content assets out of version folders into content-addressed `/assets/<hash>/...` folders, then rewrites generated HTML to reference those shared files. The hash is based on file content, so identical assets across versions share one folder instead of being duplicated under every version. Docs publication preserves referenced shared hash folders and removes unreferenced generated hash folders so old assets do not accumulate unnecessarily.

Legacy route behavior, production host mapping, canonical URL rules, PageSpeed baselines, and the manual QA checklist are documented in [`docs/website-ux-and-compatibility.md`](docs/website-ux-and-compatibility.md). Route aliases and redirects should be added through `src/lib/route-compatibility.ts` so compatibility remains centralized.

## Astro Publishing Best Practices

Keep published content canonical. A content page should have one source route, and compatibility URLs such as legacy blog paths should redirect to that route instead of rendering duplicate page bodies. When adding a compatibility route, prefer the centralized redirect and alias helpers so redirects remain `noindex` and easy to audit.

Route internal links through `src/lib/base-path.ts` or `src/lib/deployment-config.ts`. Do not hard-code `/docs`, `/guides`, `/latest`, or GitHub Pages repository prefixes in components or generated HTML; the deployment helpers keep links valid across all-in-one preview, standalone docs, standalone guides, and the main site.

Use Astro islands deliberately. Hydrate only UI that must run in the browser, and prefer static Astro markup for shared layout such as headers, navigation structure, and content shells wherever possible. Reserve `client:load` for controls that must be interactive immediately; use `client:idle` or `client:visible` for lower-priority UI.

Avoid broad browser-side dynamic imports. Syntax highlighting, especially Shiki, should run at build time where possible or use a constrained language/theme bundle. Do not ship full highlighter language catalogs to the browser for small preview panes or generated content.

Use `is:inline` only for intentional critical scripts, such as the early theme script that prevents a visible color-mode flash. Non-critical scripts should be processed by Astro so they can be bundled, deduplicated, and cached.

Keep shared CSS focused. Global design tokens and cross-surface primitives belong in `src/styles/globals.css`, but route-specific styling should stay close to the route or component that needs it. Avoid adding one-off page styles to the global baseline.

Deduplicate public assets before publishing. Prefer canonical asset paths for shared logos, brand files, PDFs, and generated content assets, and keep legacy copies only when external compatibility requires them.

Prune published artifacts. Surface publication should remove unreferenced `_astro` chunks and unrelated surface output so Pages branches do not accumulate stale JavaScript, CSS, docs, guides, or template artifacts.

Pin npm dependencies. Avoid `latest` ranges in `package.json`; use exact or caret-bounded versions so local builds, CI, and Pages publishes resolve the same Astro, React, Vite, and tooling behavior.

## Template Artifacts

The static build prepares plain HTML templates with exact `{{placeholder}}` slots,
plus asset manifests, under `dist/micronaut-web`.

Required placeholders are:

- `{{pageTitle}}`, `{{pageDescription}}`, `{{assetBasePath}}`
- `{{headAssetsHtml}}`, `{{themeScriptHtml}}`, `{{bodyScriptsHtml}}`
- `{{topNavigationHtml}}`, `{{contentHtml}}`, `{{searchIndexJson}}`
- docs templates additionally use `{{sidebarHtml}}`
- detail-page templates additionally use `{{contentSubmenuHtml}}`

The expected consumer flow is:

1. Generate the docs or guides content body as HTML.
2. Generate navigation fragments separately: top navigation, docs sidebar when applicable, and the right-side content submenu for detail pages.
3. Generate the search index as JSON.
4. Render one template with exact placeholder values.

## Shared Assets

`public/micronaut-assets` contains the Micronaut logos and project/language icon SVGs copied from `~/dev/micronaut-ui`. It also keeps local copies of the classic micronaut.io feature SVGs under `public/micronaut-assets/icons/features` for product and Launch feature cards. The React shell consumes those assets through `MicronautLogo` and `IconGlyph` so the prototype matches the docs and micronaut.io visual systems without inventing replacement marks.
