import { NextRequest, NextResponse } from "next/server";
import { nullable, z, ZodTypeAny } from "zod";

const determineSchemaType = (schema: any) => {
  if (!schema.hasOwnProperty("type")) {
    if (Array.isArray(schema)) {
      return "array";
    } else {
      return typeof schema;
    }
  }
  return typeof schema
};

const jsonSchemaToZod = (schema: any): ZodTypeAny => {
  const type = determineSchemaType(schema);

  switch (type) {
    case "string":
      return z.string().nullable();
    case "number":
      return z.number().nullable();
    case "boolean":
      return z.boolean().nullable();
    case "array":
      return z.array(jsonSchemaToZod(schema.items)).nullable();
    case "object":
      const shape: Record<string, ZodTypeAny> = {};

      for (const key in schema) {
        if (key !== "type") {
          shape[key] = jsonSchemaToZod(schema[key]);
        }
      }

      return z.object(shape);

    default:
      throw new Error(`Unsupported data type: ${type}`);
  }
};

export const POST = async (req: NextRequest) => {
  const body = await req.json();

  // Data formatting
  const genericSchema = z.object({
    data: z.string(),
    format: z.object({}).passthrough(),
  });
  const { data, format } = genericSchema.parse(body);

  // Step: 2 - Create a schema from the expected user data format
  const dynamicSchema = jsonSchemaToZod(format);

  // Step: 3 - Retry robust mechanism
  type PromiseExecutor<T> = (
    resolve: (value: T) => void,
    reject: (reason?: any) => void
  ) => void;

  class RetryablePromise<T> extends Promise<T> {
    static async retry<T>(
      retries: number,
      executor: PromiseExecutor<T>
    ): Promise<T> {
      return new RetryablePromise(executor).catch((error) => {
        console.error(`Retrying due to error: ${error}`);

        return retries > 0
          ? RetryablePromise.retry(retries - 1, executor)
          : RetryablePromise.reject(error);
      });
    }
  }

  const validationResult = await RetryablePromise.retry(3, (resolve, reject) => {
    try {
      // Call AI (replace with your actual AI call)
      const res = "{name:'Anir'}";

      // Validate JSON
      const validationResult = dynamicSchema.parse(JSON.parse(res));
      return resolve(validationResult);
    } catch (error) {
      reject(error);
    }
  });

  return NextResponse.json(validationResult);
};