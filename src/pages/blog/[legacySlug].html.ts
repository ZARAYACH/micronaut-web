import type { APIRoute, GetStaticPaths } from "astro";

import { withBasePath } from "@/lib/base-path";
import { getLegacyBlogRedirects } from "@/lib/blog-redirects";
import { getBlogPosts } from "@/lib/main-site-content";

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getBlogPosts();
  return getLegacyBlogRedirects(posts, withBasePath)
    .map(({ legacySlug, destination }) => ({
      params: {
        legacySlug
      },
      props: {
        destination
      }
    }));
};

export const GET: APIRoute<{ destination: string }> = ({ props, redirect }) => {
  return redirect(props.destination, 301);
};
