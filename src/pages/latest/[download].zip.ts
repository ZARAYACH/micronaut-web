import type { APIRoute, GetStaticPaths } from "astro";

import { readGeneratedGuidesManifest } from "@/lib/generated-guides";

export const getStaticPaths: GetStaticPaths = async () => {
  const manifest = await readGeneratedGuidesManifest();
  return manifest.guides.flatMap((guide) =>
    guide.options.map((option) => ({
      params: { download: option.zipUrl.replace(/\.zip$/, "") },
      props: { zipUrl: `https://guides.micronaut.io/latest/${option.zipUrl}` }
    }))
  );
};

export const GET: APIRoute<{ zipUrl: string }> = ({ props, redirect }) => {
  return redirect(props.zipUrl, 302);
};
