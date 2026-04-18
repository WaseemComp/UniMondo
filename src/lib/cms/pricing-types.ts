/** Published study package (main tier). */
export type StudyPackagePublic = {
  id: string;
  slug: string;
  name: string;
  teaser: string;
  description: string;
  bestFor: string | null;
  features: string[];
  priceFull: number;
  priceInstallment: number | null;
  sortOrder: number;
};

/** Published add-on. */
export type StudyAddOnPublic = {
  id: string;
  slug: string;
  name: string;
  description: string;
  bestFor: string | null;
  priceFull: number;
  priceInstallment: number | null;
  sortOrder: number;
};

export type PackageRowDb = {
  id: string;
  slug: string;
  name: string;
  teaser: string;
  description: string;
  best_for: string | null;
  features: unknown;
  price_full: string | number;
  price_installment: string | number | null;
  sort_order: number;
  is_published: boolean;
};

export type AddOnRowDb = {
  id: string;
  slug: string;
  name: string;
  description: string;
  best_for: string | null;
  price_full: string | number;
  price_installment: string | number | null;
  sort_order: number;
  is_published: boolean;
};

export function mapPackageRow(row: PackageRowDb): StudyPackagePublic {
  const features = Array.isArray(row.features) ? row.features.map((x) => String(x)) : [];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    teaser: row.teaser ?? "",
    description: row.description ?? "",
    bestFor: row.best_for,
    features,
    priceFull: Number(row.price_full),
    priceInstallment: row.price_installment == null ? null : Number(row.price_installment),
    sortOrder: row.sort_order ?? 0,
  };
}

export function mapAddOnRow(row: AddOnRowDb): StudyAddOnPublic {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    bestFor: row.best_for,
    priceFull: Number(row.price_full),
    priceInstallment: row.price_installment == null ? null : Number(row.price_installment),
    sortOrder: row.sort_order ?? 0,
  };
}
