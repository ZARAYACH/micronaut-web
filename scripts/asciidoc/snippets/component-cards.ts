import { existsSync, promises as fs } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);

let componentRendererPromise: Promise<any> | undefined;

export async function renderGeneratedSnippetCard(input: any): Promise<string> {
  const renderer = await loadComponentRenderer();
  return renderer.renderGeneratedSnippetCard(input);
}

export async function renderGeneratedPropertiesCard(
  input: any,
): Promise<string> {
  const renderer = await loadComponentRenderer();
  return renderer.renderGeneratedPropertiesCard(input);
}

function loadComponentRenderer(): Promise<any> {
  if (!componentRendererPromise) {
    componentRendererPromise = bundleComponentRenderer();
  }
  return componentRendererPromise;
}

async function bundleComponentRenderer(): Promise<any> {
  const tempDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-direct-snippet-renderer-"),
  );
  const outfile = path.join(tempDirectory, "docs-generated-snippet.cjs");
  try {
    await build({
      entryPoints: [
        path.join(
          projectDirectory,
          "src",
          "components",
          "web",
          "docs-generated-snippet.tsx",
        ),
      ],
      outfile,
      bundle: true,
      format: "cjs",
      jsx: "automatic",
      platform: "node",
      logLevel: "silent",
      plugins: [
        {
          name: "micronaut-web-alias",
          setup(buildContext: any): any {
            buildContext.onResolve({ filter: /^@\// }, (args: any): any => ({
              path: resolveSourceImport(args.path),
            }));
          },
        },
      ],
    });
    const requireRendererBundle = createRequire(import.meta.url);
    return requireRendererBundle(outfile);
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

function resolveSourceImport(specifier: any): any {
  const candidate = path.join(projectDirectory, "src", specifier.slice(2));
  for (const extension of ["", ".tsx", ".ts", ".jsx", ".js"]) {
    const resolved = `${candidate}${extension}`;
    if (existsSync(resolved)) {
      return resolved;
    }
  }
  return candidate;
}
