import { z } from 'zod';

// RFC 7807 (application/problem+json) — formato único de erro em toda a API.
export const problemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string(),
});

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
