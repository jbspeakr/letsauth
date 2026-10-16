import type { APIRoute } from "astro";
import { getDataset } from "@/lib/data";
import { buildExplorerExport } from "@/lib/explorer";

export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildExplorerExport(getDataset()), null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
