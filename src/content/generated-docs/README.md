# Generated Docs Fragments

The HTML files in this directory are rendered directly from checked-out
Micronaut project adoc sources with Asciidoctor.js:

```bash
npm run render:docs -- --slugs core,serde
```

By default the renderer reads `.docs`, uses
`.docs/repos/micronaut-platform/gradle/libs.versions.toml` together
with checked-in metadata from `src/data/docs-projects.fixture.json`,
then reads each project's `src/main/docs/guide/toc.yml` and writes fragments
back into this directory.
Generated HTML files and copied docs assets are ignored by Git and are created
by `npm run dev` and `npm run build` before Astro starts. Do not hand-edit the
generated HTML files or the generated `assets/` tree.

The full shared adoc processing and rendering flow is documented in
`scripts/asciidoc/README.md`.

## AsciiDoc Snippet Pipeline

Docs snippets are rendered as static HTML during fragment generation.
AsciiDoc macros and guide preprocessors emit `[snippet]` and `[dependency]`
open blocks whose base64url payload contains the snippet kind, title,
description, and code samples. Those blocks are consumed by Asciidoctor.js block
processors during conversion and are not emitted to generated HTML.

Asciidoctor.js 4 renders through
`scripts/asciidoc/component-renderer.ts`, a custom HTML converter that turns
extension-created snippet nodes, listing blocks, and configuration property
tables into shared component markup during conversion.

The direct converter renders snippet cards with
`src/components/web/docs-generated-snippet.tsx`, which server-renders the same
React primitives used by the hand-authored docs snippet components. The legacy
template fallback has been removed from the AsciiDoc pipeline.

The renderer splits snippet types by source shape:
`scripts/asciidoc/snippets/macro-snippets.ts` handles extension-created snippet
nodes, `scripts/asciidoc/snippets/listing-snippets.ts` handles ordinary source
listings, and `scripts/asciidoc/snippets/properties-snippets.ts` handles
configuration property tables.

The `[configuration]` block processor also creates snippet payload nodes.
`configuration-samples.ts` parses the source YAML with `js-yaml`, formats TOML
with `smol-toml`, and keeps the small remaining format adapters for Properties,
Groovy config, and HOCON source text. Those adapters only generate source
strings; Shiki still performs all syntax highlighting in the AsciiDoc snippet
pipeline.

Shiki highlighting stays in the build/server-side rendering path. Static snippet
panels and ordinary listing blocks are highlighted by the component renderer.
React is used only to render static markup for these generated fragments;
snippets are not hydrated React islands.

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

Run the checks used by `dev` and `build`, including snippet style sharing
checks:

```bash
npm run check
```
