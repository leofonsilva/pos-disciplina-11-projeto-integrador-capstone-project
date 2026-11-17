import { z } from 'zod';

export const chatRequestSchema = z.object({
  question: z.string().min(1),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

// Resumo do documento pro painel de progresso — sem o paragraph inteiro, que já
// volta citado (fonte + data-base) no evento de answer.
const chatDocumentSummarySchema = z.object({
  id: z.string(),
  ticker: z.string().optional(),
  period: z.string().optional(),
  title: z.string().optional(),
  sourceUrl: z.string(),
});

export const chatStreamEventSchema = z.object({
  node: z.enum(['retrieve', 'grade', 'webSearch', 'answer']),
  documents: z.array(chatDocumentSummarySchema).optional(),
  sufficient: z.boolean().optional(),
  missingAspects: z.array(z.string()).optional(),
  iterations: z.number().optional(),
  answerText: z.string().optional(),
});

export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;
