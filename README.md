# Micronaut Web

Astro prototype for three separately hostable Micronaut web surfaces:

- `main`: product entry point at `/` and `/main/`
- `docs`: platform documentation catalog and detail pages under `/docs/`
- `guides`: guides catalog and detail pages under `/guides/`

All surfaces share the same protocol file, design tokens, and React components. The protocol is checked in as a static contract for the prototype:

```bash
npm run dev
npm run build
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
