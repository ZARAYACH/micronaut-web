# Micronaut Web Agent Guide

## Project Overview

This repository is an Astro static site for Micronaut web, docs, guides, and launch surfaces. It uses Astro, React islands, Tailwind CSS, shadcn/ui components, Radix primitives, and npm scripts.

Use the current repository structure as the source of truth. Do not apply Gradle or Micronaut module workflows unless a Gradle wrapper is later added.

## Commands

- Install dependencies with `npm install` when needed.
- Typecheck: `npm run typecheck`
- Script typecheck: `npm run typecheck:scripts`
- Docs tests: `npm run test:docs`
- Main site tests: `npm run test:main-site`
- Guides tests: `npm run test:guides`
- Deployment tests: `npm run test:deployment`
- Full check: `npm run check`
- Build main surface: `npm run build:main`
- Build all surfaces: `npm run build`
- Build docs surface: `npm run build:docs`
- Build guides surface: `npm run build:guides`

## UI Implementation Rules

- Use existing shadcn/ui components from `src/components/ui` whenever a matching primitive exists.
- Prefer Radix-backed shadcn components for interactive controls: `Button`, `Dialog`, `Sheet`, `DropdownMenu`, `NavigationMenu`, `Command`, `Tabs`, `Select`, `Checkbox`, `Tooltip`, `Accordion`, `Sidebar`, and similar primitives.
- Do not reinvent components that shadcn/ui already provides. Avoid custom dropdowns, dialogs, sheets, popovers, tabs, command palettes, buttons, sidebars, inputs, or menus unless there is no suitable shadcn/Radix primitive.
- Compose shadcn components with `asChild` and Tailwind classes before creating new abstractions.
- Keep component styling in Tailwind utilities and existing design tokens. Do not add custom CSS for patterns that can be expressed with Tailwind and existing shadcn classes.
- Follow the shadcn typography guidance at `https://ui.shadcn.com/docs/components/radix/typography`: use utility classes for headings, paragraphs, lists, blockquotes, tables, inline code, lead text, small text, and muted text instead of global typography CSS.
- Do not add typography framework CSS or broad prose classes unless explicitly requested and justified.

## Astro Islands

- Use Astro islands deliberately. Hydrate only UI that must run in the browser.
- The top navigation/menu should be a client island.
- Docs version switching should be its own client island.
- Keep docs content, generated HTML, and static navigation markup outside large React islands where possible.
- Prefer `client:load` only for controls that must be interactive immediately. Use `client:idle` or `client:visible` for lower-priority UI.

## Generated Content

- Syntax highlighting, Asciidoctor rendering, properties/YAML/TOML/config conversion, and generated-content transformations must run at build time.
- Do not ship `shiki`, `@shikijs/*`, `asciidoctor`, `@asciidoctor/*`, or config conversion/parsing libraries to the browser runtime.

## Code Style

- Prefer small, focused components over broad layout islands.
- Use existing helpers from `src/lib`, especially base-path and deployment helpers, instead of hard-coded deployment paths.
- Preserve accessibility behavior from shadcn/Radix primitives.
- Use lucide icons through existing project conventions.
- Avoid unrelated refactors and generated-content churn.

## Verification

After UI or layout changes, run the narrowest relevant checks first, then broader checks as needed:

1. `npm run typecheck`
2. `npm run typecheck:scripts` when scripts, tests, or build tooling changed
3. Relevant tests such as `npm run test:docs`, `npm run test:guides`, or `npm run test:main-site`
4. Browser verification for changed interactive UI

Before pushing to `main`, do not stop at typecheck. Run the affected surface build:

- Main-site, shared runtime, layout, header, routing, or deployment changes: `npm run build:main`
- Docs-surface changes: `npm run build:docs`
- Guides-surface changes: `npm run build:guides`

If a change touches shared browser/runtime scripts, generated content rendering, snippets, search, navigation, or surface routing, run the browser test under the deploy surface that will be pushed. For a fast main-surface guard, run:

```sh
MICRONAUT_DEPLOY_SURFACE=main ASTRO_BASE=/micronaut-web/ npm run test:main-site:browser
```
