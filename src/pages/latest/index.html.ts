import type { APIRoute } from "astro";

import { withBasePath } from "@/lib/base-path";

export const GET: APIRoute = ({ redirect }) => {
  return redirect(withBasePath("/latest/"), 301);
};
