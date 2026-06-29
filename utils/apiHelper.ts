import { NextRequest, NextResponse } from "next/server";
import { sanitizeObject } from "@/utils/sanitize";
import { ZodSchema } from "zod";

type HandlerOptions = {
  method?: string;
  validateSchema?: ZodSchema<any>;
};

type HandlerFn = (
  req: NextRequest,
  opts: { sanitizedBody: any }
) => Promise<NextResponse>;

// Usage:
// export const POST = withApiHandler(
//   async (req, { sanitizedBody }) => {
//     // your handler logic
//   },
//   { method: "POST", validateSchema: mySchema }
// );
export function withApiHandler(handler: HandlerFn, options: HandlerOptions = {}) {
  return async (req: NextRequest) => {
    try {
      const { method, validateSchema } = options;

      if (method && req.method !== method.toUpperCase()) {
        return createResponse({ error: "Method not allowed" }, 405);
      }

      let sanitizedBody = {};
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const rawBody = await req.json();
        sanitizedBody = sanitizeObject(rawBody);

        if (validateSchema) {
          const parsed = validateSchema.safeParse(sanitizedBody);
          if (!parsed.success) {
            return createResponse({ error: parsed.error.format() }, 400);
          }
          sanitizedBody = parsed.data;
        }
      }

      return await handler(req, { sanitizedBody });
    } catch (error) {
      console.error("API Handler Error:", error);
      return createResponse({ error: "Internal server error" }, 500);
    }
  };
}

export const createResponse = (data: any, status: number = 200) => {
  return NextResponse.json(data, { status });
};

export const handleError = (error: unknown) => {
  console.error("API Error:", error);
  return createResponse({ message: "Internal server error" }, 500);
};
