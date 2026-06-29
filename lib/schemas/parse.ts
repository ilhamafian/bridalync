import type { z } from "zod";

export function parseDocument<T extends z.ZodType>(
  schema: T,
  document: unknown,
): z.infer<T> {
  return schema.parse(document);
}
