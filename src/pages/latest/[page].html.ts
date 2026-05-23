import type { APIRoute, GetStaticPaths } from "astro";

import {
  allGeneratedGuideTags,
  guideOptionPath,
  guideOverviewPath,
  guideTagPath,
  readGeneratedGuidesManifest,
  tagSlug
} from "@/lib/generated-guides";
import { withBasePath } from "@/lib/base-path";
import { micronautProtocol } from "@/lib/protocol";

const legacyGuidesBase = "https://guides.micronaut.io/latest/";

export const getStaticPaths: GetStaticPaths = async () => {
  const manifest = await readGeneratedGuidesManifest();
  const paths: Array<{ params: { page: string }; props: { destination: string; external?: boolean } }> = [];
  const pages = new Set<string>();
  const addPath = (page: string, destination: string, external = false) => {
    if (pages.has(page)) {
      return;
    }
    pages.add(page);
    paths.push({
      params: { page },
      props: { destination, external }
    });
  };

  for (const tag of allGeneratedGuideTags(manifest.guides)) {
    addPath(`tag-${tagSlug(tag)}`, guideTagPath(tag).replace(/\.html$/, "/"));
  }
  for (const guide of manifest.guides) {
    addPath(guide.slug, guideOverviewPath(guide).replace(/\.html$/, "/"));
    for (const option of guide.options) {
      addPath(option.file.replace(/\.html$/, ""), guideOptionPath(option).replace(/\.html$/, "/"));
    }
  }

  for (const guide of micronautProtocol.guides.guides) {
    addPath(guide.slug, `${legacyGuidesBase}${guide.slug}.html`, true);
    for (const variant of guide.variants) {
      const page = `${guide.slug}-${variant.buildTool.toLowerCase()}-${variant.language.toLowerCase()}`;
      addPath(page, `${legacyGuidesBase}${page}.html`, true);
    }
  }

  return paths;
};

export const GET: APIRoute<{ destination: string; external?: boolean }> = ({ props, redirect }) => {
  return redirect(props.external ? props.destination : withBasePath(props.destination), props.external ? 302 : 301);
};
