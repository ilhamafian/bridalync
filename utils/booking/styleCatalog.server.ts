import { LookModel } from "@/models/Look";
import { StyleModel } from "@/models/Style";
import type { DepositType } from "@/schemas/packageSchema";
import { toIdString } from "@/schemas/objectId";
import type { User } from "@/schemas/userSchema";
import { usesLooks } from "@/utils/styleTerms";

/** A style or look category in one shape, so pricing and booking treat them the same. */
export type CatalogStyle = {
  _id: string;
  user_id: string;
  name: string;
  order: number;
  variants: Array<{
    name: string;
    order: number;
    price: number;
    deposit: number;
    deposit_type?: DepositType;
    /** Styles have at most one; looks up to five. */
    image_urls: string[];
  }>;
};

type StoredVariant = {
  name: string;
  order: number;
  price: number;
  deposit: number;
  deposit_type?: DepositType;
  image_url?: string;
  image_urls?: string[];
};

function toCatalogStyle(doc: {
  _id: unknown;
  user_id: string;
  name: string;
  order: number;
  variants: StoredVariant[];
}): CatalogStyle {
  return {
    _id: toIdString(doc._id as never),
    user_id: doc.user_id,
    name: doc.name,
    order: doc.order,
    variants: doc.variants.map((variant) => ({
      name: variant.name,
      order: variant.order,
      price: variant.price,
      deposit: variant.deposit,
      ...(variant.deposit_type ? { deposit_type: variant.deposit_type } : {}),
      image_urls:
        variant.image_urls ?? (variant.image_url ? [variant.image_url] : []),
    })),
  };
}

/** The user's styles, or looks for makeup artists, sorted by `order`. */
export async function loadStyleCatalog(
  userId: string,
  role: User["role"] | null | undefined
): Promise<CatalogStyle[]> {
  const docs = usesLooks(role)
    ? await new LookModel().find({ user_id: userId }, { sort: { order: 1 } })
    : await new StyleModel().find({ user_id: userId }, { sort: { order: 1 } });
  return docs.map(toCatalogStyle);
}

/** A style or look by id (ids are unique across both collections). */
export async function findCatalogStyle(id: string): Promise<CatalogStyle | null> {
  const style = await new StyleModel().findById(id);
  if (style) return toCatalogStyle(style);
  const look = await new LookModel().findById(id);
  return look ? toCatalogStyle(look) : null;
}
