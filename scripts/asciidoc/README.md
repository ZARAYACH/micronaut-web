# AsciiDoc Rendering Pipeline

This directory contains the shared AsciiDoc rendering pipeline used by generated
Micronaut docs and guides. The build reads adoc sources, registers focused
Asciidoctor.js extensions, and emits static HTML fragments. Snippets,
dependencies, configuration examples, and source listings are rendered as shared
React component markup during conversion.

## Inputs

Docs rendering starts in `scripts/docs/renderer.ts`.

- The renderer reads a checked-out Micronaut project from `.docs/repos`.
- It reads each project's `src/main/docs/guide/toc.yml`.
- Each TOC node points at an adoc file under `src/main/docs/guide`.
- Project attributes are built from platform metadata, checked-in project
  metadata, and the project's `gradle.properties`.
- Raw adoc source is passed to Asciidoctor with `micronautExtensionRegistry(...)`.

Guides rendering starts in `scripts/guides/renderer.ts`.

- The renderer reads the selected guide adoc file directly.
- Guide metadata and the selected language/build/test option become a
  `GuideRenderContext`.
- Raw guide source is passed to Asciidoctor with `guideExtensionRegistry(...)`.

There is no separate source expansion step before Asciidoctor conversion. Source
shape fixes, guide macro expansion, and snippet rendering are extension
responsibilities.

## Docs Extensions

`scripts/asciidoc/extensions/index.ts` creates a registry with
`asciidoctor.Extensions.create()` and passes it to focused register functions.

The docs registry registers:

- `registerDocsSourcePreprocessor(...)`, which handles legacy docs source shapes
  that must be adjusted before parsing.
- inline API macros such as `api:`, `ann:`, `mnapi:`, `jdk:`, `rs:`, `rx:`, and
  `reactor:`
- the `pkg:` inline macro
- the `snippet::target[]` block macro
- the `dependency:target[]` block macro
- shared component rendering extensions for `[snippet]`, `[dependency]`, and
  `[configuration]` blocks

The old `normalizeAsciiDocSource(...)` function and the old pre-conversion
snippet/dependency expansion helpers are not used. Equivalent behavior now lives
in register files under `scripts/asciidoc/extensions/`.

## Guide Extensions

`scripts/guides/extensions/index.ts` creates the guide registry and registers all
guide-specific Asciidoctor behavior.

The guide registry registers:

- `registerGuidePreprocessor(...)`, which replaces guide placeholders, appends
  the license include, rewrites include targets, applies language/build/JDK
  exclusions, rewrites guide macros into internal blocks, and groups
  `:dependencies:` sections.
- `registerGuideSnippetBlocks(...)`, which resolves `source:`, `test:`,
  `rawTest:`, `resource:`, `testResource:`, and `zipInclude:` payloads and
  renders them as snippet cards.
- `registerGuideDependenciesBlock(...)`, which renders single `dependency:`
  macros and grouped `:dependencies:` blocks as Gradle or Maven snippets.
- `registerGuideCalloutMacro(...)` and `guideCalloutLineResolver(...)`, which
  resolve shared guide callout includes.
- `registerGuideContentBlocks(...)`, which resolves `common:`,
  `common-template:`, `external:`, `external-template:`, `rocker:`, and
  `diffLink:` content.
- `registerGuideLinkMacro(...)`, which handles guide links.

There is no `scripts/guides/preprocessor.ts` or `scripts/guides/guide-blocks.ts`
path. The guide renderer does not expand snippets before Asciidoctor runs.

## Snippet Rendering

Snippet-like output is rendered by block processors, not by HTML postprocessing.

Docs snippets and dependencies are registered from
`scripts/asciidoc/extensions/register-snippet-block.ts` and
`scripts/asciidoc/extensions/register-dependency-block.ts`. Guide snippets and
dependencies are registered from guide extension files.

All of these processors build a payload and call the shared snippet renderer in
`scripts/asciidoc/extensions/snippet-block-renderer.ts`. That renderer creates
pass blocks containing static HTML from `renderSnippetBlock(...)`.

The active Asciidoctor `Reader` is used while a snippet block is processed to
absorb an immediately following callout list. Matching callouts are rendered in
the snippet footer. Unmatched callout lines are pushed back into the reader so
AsciiDoc can still parse them as normal callout content.

This keeps callout handling inside the AsciiDoc pipeline. Generated HTML should
not contain carrier blocks, marker elements, or unconsumed guide macro syntax.

## Conversion

`scripts/asciidoc/rendering.ts` owns the final conversion call.

It creates an Asciidoctor memory logger, installs component rendering
extensions, and calls `asciidoctor.convert(...)` with:

- `header_footer: false`
- `safe: "unsafe"`
- the caller's attributes and `base_dir`
- `MicronautComponentHtmlConverter` as the default converter
- the prepared extension registry

Diagnostics are collected from the memory logger. In strict mode,
caller-supplied fatal diagnostic filters decide which Asciidoctor warnings fail
the render.

## Component Converter

`MicronautComponentHtmlConverter` only handles regular Asciidoctor nodes that are
still best rendered by a converter:

- ordinary listing blocks
- configuration property tables

Snippet and dependency macro output is handled by block processors. The
converter should not own guide macro expansion, snippet payload resolution, or
dependency snippet generation.

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
- `micronaut-snippet` wrapper parsing
- `normalizeAsciiDocSource(...)`
- `scripts/guides/preprocessor.ts`
- `scripts/guides/guide-blocks.ts`
- pre-conversion snippet or dependency expansion outside Asciidoctor extensions
- AsciiDoc HTML postprocessing for snippets or callouts

All snippet, dependency, callout, guide macro, and configuration rendering must
stay inside the AsciiDoc rendering pipeline.

## Output

Docs rendering writes generated fragments under `src/content/generated-docs`.
Guides rendering writes generated fragments under
`src/content/generated-guides`. Those generated HTML files and copied assets are
ignored by Git and rebuilt by dev, build, and surface build commands.

## Useful Checks

Run the shared AsciiDoc tests after changing this directory:

```bash
npm run test:asciidoc
```

Run guide tests after changing guide extensions:

```bash
npm run test:guides
```

Run script typechecking when changing Extension API types or renderer contracts:

```bash
npm run typecheck:scripts
```

Run the full repository check before merging broader rendering changes:

```bash
npm run check
```
