import { z } from "zod";

export const hotDateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

/**
 * `fixed` = `price` is an RM amount (the hot date price, or the extra on top of the state price in per-event state
 * pricing); `percent` = `price` is a % increase on the usual (or state) price. Missing = fixed.
 */
export const hotDatePriceTypeSchema = z.enum(["fixed", "percent"]);

export const MAX_HOT_DATE_PERCENT = 1000;

export const hotDateSchema = z
  .object({
    user_id: z.string().min(1),
    date: hotDateKeySchema,
    package_id: z.string().min(1).optional(),
    style_id: z.string().min(1).optional(),
    variant_order: z.number().int().optional(),
    price: z.number().min(0),
    price_type: hotDatePriceTypeSchema.optional(),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      const isPackage =
        Boolean(data.package_id) &&
        data.style_id === undefined &&
        data.variant_order === undefined;
      const isStyle =
        !data.package_id &&
        Boolean(data.style_id) &&
        data.variant_order !== undefined;
      return isPackage || isStyle;
    },
    { message: "Hot date must target a package or a style variant" }
  );

export const hotDateOverrideInputSchema = z
  .object({
    package_id: z.string().min(1).optional(),
    style_id: z.string().min(1).optional(),
    variant_order: z.number().int().optional(),
    /** Override amount (see `price_type`), or `null` to clear the override. */
    price: z.number().min(0).nullable(),
    price_type: hotDatePriceTypeSchema.optional(),
  })
  .refine(
    (data) => {
      const isPackage =
        Boolean(data.package_id) &&
        data.style_id === undefined &&
        data.variant_order === undefined;
      const isStyle =
        !data.package_id &&
        Boolean(data.style_id) &&
        data.variant_order !== undefined;
      return isPackage || isStyle;
    },
    { message: "Override must target a package or a style variant" }
  )
  .refine(
    (data) =>
      data.price_type !== "percent" ||
      data.price === null ||
      data.price <= MAX_HOT_DATE_PERCENT,
    { message: `A percentage increase can be at most ${MAX_HOT_DATE_PERCENT}%.` }
  );

export const hotDatesPutSchema = z
  .object({
    date: hotDateKeySchema.optional(),
    dates: z.array(hotDateKeySchema).min(1).max(62).optional(),
    overrides: z.array(hotDateOverrideInputSchema),
  })
  .refine((data) => Boolean(data.date) || Boolean(data.dates?.length), {
    message: "Choose at least one date.",
  });

export const publicHotDateSchema = z.object({
  date: hotDateKeySchema,
  package_id: z.string().optional(),
  style_id: z.string().optional(),
  variant_order: z.number().int().optional(),
  price: z.number().min(0),
  price_type: hotDatePriceTypeSchema.optional(),
});

export type HotDate = z.infer<typeof hotDateSchema>;
export type HotDatePriceType = z.infer<typeof hotDatePriceTypeSchema>;
export type HotDateOverrideInput = z.infer<typeof hotDateOverrideInputSchema>;
export type HotDatesPut = z.infer<typeof hotDatesPutSchema>;
export type PublicHotDate = z.infer<typeof publicHotDateSchema>;
