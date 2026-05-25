# Generated Docs Fragments

The HTML files in this directory are rendered directly from checked-out
Micronaut project adoc sources with Asciidoctor.js:

```bash
npm run render:docs -- --slugs core,serde
```

By default the renderer reads `.docs`, uses
`.docs/repos/micronaut-platform/gradle/libs.versions.toml` together
with checked-in metadata from `src/data/docs/docs-projects.properties`,
then reads each project's `src/main/docs/guide/toc.yml` and writes fragments
back into this directory.
Generated HTML files and copied docs assets are ignored by Git and are created
by `npm run dev` and `npm run build` before Astro starts. Do not hand-edit the
generated HTML files or the generated `assets/` tree.

## Static Snippet Pipeline

Docs snippets are rendered as static HTML during fragment generation. The
AsciiDoc macros do not emit finished snippet cards directly. They emit semantic
`<micronaut-snippet>` marker tags whose `data-payload` contains base64url JSON
describing the snippet kind, title, description, and code samples.

After Asciidoctor.js produces HTML, `scripts/docs/static-snippets.ts`
parses the fragment, replaces each marker with static HTML, and wraps generated
configuration property tables in the shared properties card. The static snippet
markup comes from `src/components/web/docs-snippet-templates.tsx`; the renderer
loads that support through `renderDocsSnippetStaticSupport()` so the generated
HTML and browser enhancement use the same templates.

The `[configuration]` preprocessor in `scripts/docs/configuration.ts`
also emits snippet markers. `configuration-samples.ts` parses the source YAML
with `js-yaml`, formats TOML with `smol-toml`, and keeps the small remaining
format adapters for Properties, Groovy config, and HOCON source text. Those
adapters only generate source strings; Shiki still performs all syntax
highlighting in the static snippet pipeline.

Shiki highlighting stays in the build/server-side rendering path. Static snippet
panels are highlighted by `static-snippets.ts`, and ordinary listing blocks are
highlighted by the docs renderer. React is used only to render static
markup for these generated fragments; snippets are not hydrated React islands.

`src/components/web/generated-docs-enhancer.astro` adds progressive behavior in
the browser: language tabs, active-panel copy buttons, and copy controls for
plain Shiki blocks. The baseline HTML remains useful without that script because
the snippet cards, highlighted code, and property tables are already present in
the generated fragment.

## Style Ownership

Tailwind class ownership for snippet cards is centralized in
`src/components/web/docs-snippet-styles.ts`. Keep generated-template classes,
browser enhancement classes, and test/gallery snippet classes aligned there
instead of duplicating class strings in the renderer.

Runtime snippet styling for Shiki spans, callout badges, callout footers, and
configuration-property table internals also lives in `docs-snippet-styles.ts`.
Astro/Tailwind emits the actual CSS from those shared class strings during the
normal site build; there is no copied snippet runtime stylesheet.

## Useful Commands

Render selected docs fragments:

```bash
npm run render:docs -- --slugs core,serde
```

Validate snippet style sharing:

```bash
npm run snippet-styles
```

Run the protocol validation used by `dev` and `build`, including snippet style
sharing checks:

```bash
npm run protocol
```
