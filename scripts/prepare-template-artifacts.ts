import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceTemplatesDirectory = path.join(
  projectDirectory,
  "src",
  "templates",
);
const distDirectory = path.join(projectDirectory, "dist");
const outputDirectory = path.join(distDirectory, "micronaut-web");
const outputTemplatesDirectory = path.join(outputDirectory, "templates");
const manifestFile = path.join(outputDirectory, "assets-manifest.json");
const manifestDirectory = path.join(outputDirectory, "manifests");

type GeneratedTemplate = {
  html: string;
  placeholders: string[];
};

type TemplatePlaceholders = Record<string, string[]>;

const copiedTemplatePlaceholders: TemplatePlaceholders = {
  "docs/docs-index.html": [
    "pageTitle",
    "pageDescription",
    "assetBasePath",
    "headAssetsHtml",
    "themeScriptHtml",
    "sidebarHtml",
    "topNavigationHtml",
    "contentHtml",
    "searchIndexJson",
    "bodyScriptsHtml",
  ],
  "docs/docs-page.html": [
    "pageTitle",
    "pageDescription",
    "assetBasePath",
    "headAssetsHtml",
    "themeScriptHtml",
    "sidebarHtml",
    "topNavigationHtml",
    "contentHtml",
    "contentSubmenuHtml",
    "searchIndexJson",
    "bodyScriptsHtml",
  ],
  "guides/guides-index.html": [
    "pageTitle",
    "pageDescription",
    "assetBasePath",
    "headAssetsHtml",
    "themeScriptHtml",
    "topNavigationHtml",
    "contentHtml",
    "searchIndexJson",
    "bodyScriptsHtml",
  ],
  "guides/guides-page.html": [
    "pageTitle",
    "pageDescription",
    "assetBasePath",
    "headAssetsHtml",
    "themeScriptHtml",
    "topNavigationHtml",
    "contentHtml",
    "contentSubmenuHtml",
    "searchIndexJson",
    "bodyScriptsHtml",
  ],
};

const generatedSnippetTemplates = await renderGeneratedSnippetTemplates();
const requiredTemplates: TemplatePlaceholders = {
  ...copiedTemplatePlaceholders,
  ...Object.fromEntries(
    Object.entries(generatedSnippetTemplates).map(
      ([relativeTemplate, generated]: any): any => [
        relativeTemplate,
        generated.placeholders,
      ],
    ),
  ),
};

await fs.rm(outputTemplatesDirectory, { recursive: true, force: true });
await fs.mkdir(outputTemplatesDirectory, { recursive: true });

for (const [relativeTemplate, placeholders] of Object.entries(
  requiredTemplates,
)) {
  const source = path.join(sourceTemplatesDirectory, relativeTemplate);
  const destination = path.join(outputTemplatesDirectory, relativeTemplate);
  const generated = generatedSnippetTemplates[relativeTemplate];
  const content = generated?.html ?? (await fs.readFile(source, "utf8"));
  for (const placeholder of placeholders) {
    if (!content.includes(`{{${placeholder}}}`)) {
      throw new Error(
        `${relativeTemplate} is missing required placeholder {{${placeholder}}}.`,
      );
    }
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, content);
}

const assets = {
  astro: await listFiles(path.join(distDirectory, "_astro")),
  micronautAssets: await listFiles(
    path.join(distDirectory, "micronaut-assets"),
  ),
};
const allTemplates = Object.fromEntries(
  Object.keys(requiredTemplates).map((template: any): any => [
    template,
    {
      resource: `META-INF/micronaut-web/templates/${template.split("/").slice(1).join("/")}`,
      placeholders: requiredTemplates[template],
    },
  ]),
);
const manifest = {
  templateRoot: "META-INF/micronaut-web/templates",
  surfaceRoot: "META-INF/micronaut-web/surfaces",
  placeholders: Array.from(
    new Set(Object.values(requiredTemplates).flat()),
  ).sort(),
  templates: allTemplates,
  assets,
};

await fs.mkdir(manifestDirectory, { recursive: true });
await fs.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
for (const surface of ["docs", "guides"]) {
  const templates = Object.fromEntries(
    Object.entries(allTemplates).filter(([template]: any): any =>
      template.startsWith(`${surface}/`),
    ),
  );
  await fs.writeFile(
    path.join(manifestDirectory, `${surface}-assets-manifest.json`),
    `${JSON.stringify({ ...manifest, templates }, null, 2)}\n`,
  );
}
console.log(
  `Prepared ${Object.keys(requiredTemplates).length} HTML templates and asset manifest.`,
);

async function renderGeneratedSnippetTemplates(): Promise<
  Record<string, GeneratedTemplate>
> {
  await fs.mkdir(outputDirectory, { recursive: true });
  const tempDirectory = await fs.mkdtemp(
    path.join(outputDirectory, ".snippet-template-renderer-"),
  );
  const outfile = path.join(tempDirectory, "docs-snippet-templates.mjs");
  try {
    await build({
      entryPoints: [
        path.join(
          projectDirectory,
          "src",
          "components",
          "web",
          "docs-snippet-templates.tsx",
        ),
      ],
      outfile,
      bundle: true,
      format: "esm",
      jsx: "automatic",
      platform: "node",
      packages: "external",
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
    const module = await import(pathToFileURL(outfile).href);
    return module.renderDocsSnippetTemplates() as Record<
      string,
      GeneratedTemplate
    >;
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

async function listFiles(directory: any): Promise<any> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry: any): Promise<any> => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          return listFiles(fullPath);
        }
        return [
          path.relative(distDirectory, fullPath).split(path.sep).join("/"),
        ];
      }),
    );
    return files.flat().sort();
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
