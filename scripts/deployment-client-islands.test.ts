import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as ts from "typescript";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceDirectory = path.join(projectDirectory, "src");
const hydratedDirectivePattern =
  /<([A-Z][\w.]*)\b[^>]*\bclient:(?:load|idle|media|only|visible)\b/g;
const nodeBuiltins = new Set(
  builtinModules.flatMap((moduleName) => {
    const bareModuleName = moduleName.replace(/^node:/, "");
    return [bareModuleName, `node:${bareModuleName}`];
  }),
);
const localScriptExtensions = [".ts", ".tsx", ".js", ".jsx", ".astro"];

type HydratedIsland = {
  astroFile: string;
  componentName: string;
  componentFile: string;
};

type PendingModule = {
  file: string;
  chain: string[];
};

test("hydrated Astro islands do not import server-only Node modules", async (): Promise<void> => {
  const hydratedIslands = await findHydratedIslands();
  assert.ok(
    hydratedIslands.length > 0,
    "expected to find hydrated Astro islands",
  );
  assert.ok(
    hydratedIslands.some(
      (island) =>
        relativePath(island.componentFile) ===
        path.join("src", "components", "web", "latest-guide-card.tsx"),
    ),
    "expected the latest guide card island to be covered",
  );

  const failures: string[] = [];
  for (const island of hydratedIslands) {
    failures.push(...(await nodeBuiltinImportFailures(island)));
  }

  assert.deepEqual(failures, []);
});

async function findHydratedIslands(): Promise<HydratedIsland[]> {
  const astroFiles = (await listFiles(sourceDirectory)).filter((file) =>
    file.endsWith(".astro"),
  );
  const islands: HydratedIsland[] = [];

  for (const astroFile of astroFiles) {
    const source = await fs.readFile(astroFile, "utf8");
    const frontmatter = astroFrontmatter(source);
    const importedBindings = importedComponentBindings(astroFile, frontmatter);
    const template = source.slice(frontmatter.length);
    const hydratedComponents = new Set<string>();
    for (const match of template.matchAll(hydratedDirectivePattern)) {
      hydratedComponents.add(match[1].split(".")[0]);
    }

    for (const componentName of hydratedComponents) {
      const importSource = importedBindings.get(componentName);
      assert.ok(
        importSource,
        `${relativePath(astroFile)} hydrates <${componentName}> but does not import it in frontmatter`,
      );
      const componentFile = await resolveLocalModule(importSource, astroFile);
      assert.ok(
        componentFile,
        `${relativePath(astroFile)} hydrates <${componentName}> from unresolved local module ${importSource}`,
      );
      islands.push({ astroFile, componentName, componentFile });
    }
  }

  return islands;
}

async function nodeBuiltinImportFailures(
  island: HydratedIsland,
): Promise<string[]> {
  const failures: string[] = [];
  const visited = new Set<string>();
  const pending: PendingModule[] = [
    {
      file: island.componentFile,
      chain: [
        `${relativePath(island.astroFile)} hydrates <${island.componentName}>`,
      ],
    },
  ];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current.file)) {
      continue;
    }
    visited.add(current.file);

    if (!localScriptExtensions.includes(path.extname(current.file))) {
      continue;
    }

    const source = await fs.readFile(current.file, "utf8");
    const imports = valueModuleSpecifiers(current.file, source);
    for (const importSource of imports) {
      if (isNodeBuiltin(importSource)) {
        failures.push(
          `${[...current.chain, relativePath(current.file)].join(" -> ")} imports ${importSource}`,
        );
        continue;
      }
      const resolved = await resolveLocalModule(importSource, current.file);
      if (resolved) {
        pending.push({
          file: resolved,
          chain: [...current.chain, relativePath(current.file)],
        });
      }
    }
  }

  return failures;
}

function astroFrontmatter(source: string): string {
  if (!source.startsWith("---")) {
    return "";
  }
  const endIndex = source.indexOf("\n---", 3);
  return endIndex < 0 ? "" : source.slice(0, endIndex + "\n---".length);
}

function importedComponentBindings(
  file: string,
  frontmatter: string,
): Map<string, string> {
  const bindings = new Map<string, string>();
  const sourceFile = ts.createSourceFile(
    file,
    frontmatter,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !hasValueImport(statement.importClause)
    ) {
      continue;
    }
    const importSource = statement.moduleSpecifier.text;
    const importClause = statement.importClause;
    if (importClause?.name) {
      bindings.set(importClause.name.text, importSource);
    }
    const namedBindings = importClause?.namedBindings;
    if (namedBindings && ts.isNamespaceImport(namedBindings)) {
      bindings.set(namedBindings.name.text, importSource);
    }
    if (namedBindings && ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) {
        if (!element.isTypeOnly) {
          bindings.set(element.name.text, importSource);
        }
      }
    }
  }

  return bindings;
}

function valueModuleSpecifiers(file: string, source: string): string[] {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const imports: string[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      hasValueImport(node.importClause)
    ) {
      imports.push(node.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      hasValueExport(node)
    ) {
      imports.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const importArgument = node.arguments[0];
      if (importArgument && ts.isStringLiteral(importArgument)) {
        imports.push(importArgument.text);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

function hasValueImport(importClause: ts.ImportClause | undefined): boolean {
  if (!importClause) {
    return true;
  }
  if (importClause.isTypeOnly) {
    return false;
  }
  if (importClause.name) {
    return true;
  }
  const namedBindings = importClause.namedBindings;
  if (!namedBindings) {
    return false;
  }
  return (
    ts.isNamespaceImport(namedBindings) ||
    namedBindings.elements.some((element) => !element.isTypeOnly)
  );
}

function hasValueExport(exportDeclaration: ts.ExportDeclaration): boolean {
  if (exportDeclaration.isTypeOnly) {
    return false;
  }
  const exportClause = exportDeclaration.exportClause;
  if (!exportClause || ts.isNamespaceExport(exportClause)) {
    return true;
  }
  return exportClause.elements.some((element) => !element.isTypeOnly);
}

async function resolveLocalModule(
  importSource: string,
  importerFile: string,
): Promise<string | undefined> {
  const source = importSource.split("?")[0];
  if (!source.startsWith(".") && !source.startsWith("@/")) {
    return undefined;
  }

  const basePath = source.startsWith("@/")
    ? path.join(projectDirectory, "src", source.slice(2))
    : path.resolve(path.dirname(importerFile), source);
  const candidates = [
    basePath,
    ...localScriptExtensions.map((extension) => `${basePath}${extension}`),
    ...localScriptExtensions.map((extension) =>
      path.join(basePath, `index${extension}`),
    ),
  ];

  for (const candidate of candidates) {
    if (await isFile(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
    }),
  );
  return files.flat();
}

async function isFile(file: string): Promise<boolean> {
  try {
    return (await fs.stat(file)).isFile();
  } catch {
    return false;
  }
}

function isNodeBuiltin(importSource: string): boolean {
  return nodeBuiltins.has(importSource);
}

function relativePath(file: string): string {
  return path.relative(projectDirectory, file);
}
