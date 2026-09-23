import { z } from 'zod';

export const sharedEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),

  STORAGE_ROOT: z.string().min(1),
});

export type SharedEnv = z.infer<typeof sharedEnvSchema>;

export function loadEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: NodeJS.ProcessEnv = process.env,
): z.infer<T> {
  try {
    // Zod's generic inference for a fully-generic `T` loses its output type here,
    // resolving to `any` - a known limitation of this "generic validator wrapper"
    // shape. The function's own `z.infer<T>` return annotation is what actually
    // keeps callers type-safe; z.ZodType<Output> was tried instead and silently
    // broke inference for schema fields with `.default()`, so that's not an option.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- see comment above
    return schema.parse(source);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid environment configuration:\n${issues}`);
    }
    throw err;
  }
}
