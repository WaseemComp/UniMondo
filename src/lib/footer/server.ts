import { randomUUID } from "node:crypto";
import { getContactFooterSummary } from "@/lib/data/contact-page";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canonical, rowsFor, type Payload } from "@/lib/publishing/model";
import { footerDefaults, resolveFooter, type FooterConfig } from "./model";
export async function getFooterDefaults(strict = false) {
  return footerDefaults(await getContactFooterSummary(strict));
}
export async function getPublicFooter() {
  const client = createSupabaseServerClient();
  const [defaults, block] = await Promise.all([
    getFooterDefaults(),
    client
      ? client
          .from("cms_content_blocks")
          .select("content,block_key,is_active")
          .eq("page_slug", "home")
          .eq("section_key", "footer")
          .eq("block_key", "configuration")
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  return resolveFooter(
    defaults,
    !block.error && block.data ? [block.data] : [],
  );
}
export async function footerBaseline(base: Payload, template: Payload) {
  const result = structuredClone(base),
    blocks = rowsFor(result, "cms_content_blocks");
  if (!blocks.some((row) => row.block_key === "configuration"))
    blocks.push({
      id:
        rowsFor(template, "cms_content_blocks").find(
          (row) => row.block_key === "configuration",
        )?.id ?? randomUUID(),
      page_slug: "home",
      section_key: "footer",
      block_key: "configuration",
      block_type: "footer_configuration",
      content: { footer: await getFooterDefaults(true) },
      media: {},
      is_active: true,
      sort_order: 0,
    });
  result.tables.cms_content_blocks = blocks;
  return canonical(result);
}
export type { FooterConfig };
