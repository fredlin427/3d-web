import { NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";

/**
 * Validate request body against a Zod schema.
 * Returns parsed data on success, or sends a 400 JSON response on failure.
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: "Validation failed",
            details: error.issues.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 }
        ),
      };
    }
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      ),
    };
  }
}
