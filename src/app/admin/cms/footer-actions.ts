"use server";
import { getFooterDefaults } from "@/lib/footer/server";
import { z } from "zod";
import {
  planDraft,
  createContentServiceClient,
} from "@/lib/publishing/planning";
import { FOOTER_RESOURCE, footerSchema } from "@/lib/footer/model";
export async function saveFooterDraft(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const value = z
      .object({
        config: footerSchema,
        expectedDefaults: z.string().max(100000),
        expectedVersion: z.number().int().min(0),
      })
      .strict()
      .parse(input);
    return await planDraft(
      FOOTER_RESOURCE,
      async () => {
        const service = createContentServiceClient();
        if (!service) throw new Error("Footer saving is unavailable.");
        const read = await service
          .from("cms_content_blocks")
          .select("*")
          .eq("page_slug", "home")
          .eq("section_key", "footer")
          .eq("block_key", "configuration");
        if (read.error || (read.data?.length ?? 0) > 1)
          throw new Error(
            "The existing footer could not be verified. Reload before saving.",
          );
        const current = read.data?.[0];
        if (
          !current &&
          JSON.stringify(await getFooterDefaults(true)) !==
            value.expectedDefaults
        )
          throw new Error(
            "Inherited contact details changed in another session. Reload before saving the footer.",
          );
        const result = await service.from("cms_content_blocks").upsert(
          {
            ...(current ?? {}),
            ...(current?.id ? {} : { id: crypto.randomUUID() }),
            page_slug: "home",
            section_key: "footer",
            block_key: "configuration",
            block_type: "footer_configuration",
            content: { ...(current?.content ?? {}), footer: value.config },
            media: current?.media ?? {},
            is_active: true,
            sort_order: 0,
          },
          { onConflict: "id" },
        );
        if (result.error)
          throw new Error("The private footer draft could not be saved.");
        return { ok: true as const };
      },
      value.expectedVersion,
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "The footer draft could not be confirmed. Reload before retrying.",
    };
  }
}
