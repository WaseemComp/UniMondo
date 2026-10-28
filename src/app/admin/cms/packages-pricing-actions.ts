"use server";
import { randomUUID } from "node:crypto";
import { savePriceDraft, readPriceDraft } from "./catalogue-actions";
import { z } from "zod";
async function save(kind: "packages" | "addons", input: unknown) {
  try {
    const p = z.record(z.string(), z.unknown()).parse(input),
      { id, version, currencyChangeConfirmed, featuresText, ...values } = p;
    return await savePriceDraft({
      kind,
      id: typeof id === "string" && id ? id : randomUUID(),
      version: typeof version === "number" ? version : 0,
      currencyChangeConfirmed: currencyChangeConfirmed === true,
      values: {
        ...values,
        ...(featuresText !== undefined
          ? {
              features: String(featuresText)
                .split(/\r?\n/)
                .map((x) => x.trim())
                .filter(Boolean),
            }
          : {}),
        price_full: Number(values.price_full),
        price_installment:
          values.price_installment == null || values.price_installment === ""
            ? null
            : Number(values.price_installment),
        currency_code: values.currency_code ?? null,
      },
    });
  } catch {
    return {
      ok: false as const,
      error: "Check package fields and use the current draft editor.",
    };
  }
}
export async function saveStudyPackage(input: unknown) {
  return save("packages", input);
}
export async function saveStudyAddOn(input: unknown) {
  return save("addons", input);
}
async function archive(kind: "packages" | "addons", id: string) {
  try {
    const { view } = await readPriceDraft(kind, id);
    return await savePriceDraft({
      kind,
      id,
      version: view.document?.version ?? 0,
      values: {},
      archive: true,
    });
  } catch {
    return {
      ok: false as const,
      error: "Could not prepare the archive draft.",
    };
  }
}
export async function deleteStudyPackage(id: string) {
  return archive("packages", id);
}
export async function deleteStudyAddOn(id: string) {
  return archive("addons", id);
}
