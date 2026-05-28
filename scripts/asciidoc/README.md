# AsciiDoc Rendering Pipeline

This directory contains the shared AsciiDoc rendering pipeline used by generated
Micronaut docs and guides. The pipeline renders adoc sources to static HTML
fragments during the build. Snippet, dependency, configuration, listing, and
configuration-property output is produced through Asciidoctor.js conversion and
shared React component markup.

## Inputs

Docs rendering starts in `scripts/docs/renderer.ts`.

- The renderer reads a checked-out Micronaut project from `.docs/repos`.
- It reads each project's `src/main/docs/guide/toc.yml`.
- Each TOC node points at an adoc file under `src/main/docs/guide`.
- Project attributes are built from platform metadata, checked-in project
  metadata, and the project's `gradle.properties`.

Guides rendering starts in `scripts/guides/renderer.ts`.

- `scripts/guides/preprocessor.ts` expands guide-specific include and sample
  macros before Asciidoctor receives the source.
- The same shared `renderAsciiDoc(...)` function then converts the result.

## Source Preparation

Docs adoc source is prepared before conversion in this order:

1. `normalizeAsciiDocSource(...)` fixes source shapes that Asciidoctor cannot
   consume directly in this site pipeline.
2. `expandSnippetMacrosToBlocks(...)` converts source-compatible
   `snippet::target[]` macros into `[snippet,payload=...]` open blocks.
3. `expandDependencyMacrosToBlocks(...)` converts source-compatible
   `dependency:target[]` macros into `[dependency,payload=...]` open blocks.

The payload value is base64url-encoded JSON. It carries rendering data: kind,
title, description, and samples. The carrier block is an internal
representation and must not appear in generated HTML.

## Extension Registration

`scripts/asciidoc/extensions/index.ts` creates the Asciidoctor extension
registry with `asciidoctor.Extensions.create()`.

Focused files in `scripts/asciidoc/extensions/` receive the registry and
register one Asciidoctor extension family each:

- inline API macros such as `api:`, `ann:`, `mnapi:`, `jdk:`, `rs:`, `rx:`, and
  `reactor:`
- the `pkg:` inline macro
- the `[snippet]` block processor
- the `[dependency]` block processor

The snippet and dependency block processors render directly by calling
`renderSnippetBlock(...)`. They do not emit marker HTML and do not rely on a
postprocess step.

`renderSnippetBlock(...)` uses the active document `Reader` while the block
processor is running to absorb an immediately following callout list. Matching
callouts are rendered as the snippet footer, source callout numbers are
renumbered for display, and unmatched callout lines are pushed back into the
reader as manual callout list content. This keeps snippet callout handling inside
the AsciiDoc parsing pipeline instead of normalizing the full source string
before conversion.

The same extensions folder also adds shared component rendering extensions to
the registry:

- `[configuration]` listing blocks become generated code snippet cards.
- Internal `[snippet,payload=...]` and `[dependency,payload=...]` blocks are
  supported when no caller-provided registry already registered them.
- A tree processor attaches following callout lists to renderable listing
  blocks before conversion.

## Conversion

`scripts/asciidoc/rendering.ts` owns the final conversion call.

It creates an Asciidoctor memory logger, installs the component rendering
extensions, and calls `asciidoctor.convert(...)` with:

- `header_footer: false`
- `safe: "unsafe"`
- the caller's attributes and `base_dir`
- `MicronautComponentHtmlConverter` as the default converter
- the prepared extension registry

Diagnostics are collected from the memory logger. In strict mode, caller-supplied
fatal diagnostic filters decide which Asciidoctor warnings fail the render.

## Component Rendering

`MicronautComponentHtmlConverter` only handles regular Asciidoctor nodes that are
still best rendered by a converter:

- ordinary listing blocks
- configuration property tables

Snippet-like macro output is handled by block processors instead. The block
processors create pass blocks containing static HTML returned by
`renderSnippetBlock(...)`.

The renderer splits snippet markup by source shape:

- `snippets/macro-snippets.ts` renders extension-created snippet and dependency
  payloads.
- `snippets/listing-snippets.ts` renders ordinary source listing blocks.
- `snippets/properties-snippets.ts` renders configuration property tables.
- `configuration-samples.ts` converts `[configuration]` YAML into language
  variants such as YAML, TOML, properties, Groovy config, and HOCON.

All generated snippet cards use
`src/components/web/docs-generated-snippet.tsx`, which server-renders shared
React component markup into static HTML. React is not hydrated for generated
docs snippets.

## Syntax Highlighting

Shiki highlighting runs during build/server-side rendering.

- Snippet panels are highlighted while rendering the generated snippet card.
- Ordinary listing blocks are highlighted through the component converter.
- Configuration property tables keep their table HTML and are wrapped in shared
  snippet card chrome.

The browser enhancer does not perform syntax highlighting.

## Browser Enhancement

Generated fragments are usable as static HTML. The browser script in
`src/components/web/generated-docs-enhancer.astro` progressively adds:

- snippet language or dependency-format tab switching
- active-panel copy buttons
- copy controls for plain Shiki blocks

The enhancement script expects the static markup shape emitted by the AsciiDoc
pipeline. It should not be used as a replacement rendering path.

## Removed Legacy Paths

The current pipeline does not use:

- `<micronaut-snippet>` marker elements
- `static-snippets.ts`
- AsciiDoc HTML postprocessing for snippets
- `micronaut-snippet` wrapper parsing

All snippet, dependency, and configuration rendering must stay inside the
AsciiDoc rendering pipeline.

## Output

Docs rendering writes generated fragments under `src/content/generated-docs`.
Guides rendering writes generated fragments under `src/content/generated-guides`.
Those generated HTML files and copied assets are ignored by Git and are rebuilt
by dev, build, and surface build commands.

## Useful Checks

Run the shared AsciiDoc tests after changing this directory:

```bash
npm run test:asciidoc
```

Run script typechecking when changing Extension API types or renderer contracts:

```bash
npm run typecheck:scripts
```

Run the full repository check before merging broader rendering changes:

```bash
npm run check
```
