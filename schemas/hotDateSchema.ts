import { z } from "zod";

export const hotDateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const hotDateSchema = z
  .object({
    user_id: z.string().min(1),
    date: hotDateKeySchema,
    package_id: z.string().min(1).optional(),
    style_id: z.string().min(1).optional(),
    variant_order: z.number().int().optional(),
    price: z.number().min(0),
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
    /** Absolute override price, or `null` to clear the override. */
    price: z.number().min(0).nullable(),
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
});

export type HotDate = z.infer<typeof hotDateSchema>;
export type HotDateOverrideInput = z.infer<typeof hotDateOverrideInputSchema>;
export type HotDatesPut = z.infer<typeof hotDatesPutSchema>;
export type PublicHotDate = z.infer<typeof publicHotDateSchema>;
