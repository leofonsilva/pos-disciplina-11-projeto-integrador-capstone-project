import { Injectable } from '@angular/core';
import { chatStreamEventSchema, type ChatRequest, type ChatStreamEvent } from '@hero/contracts';

interface SseFrame {
  event?: string;
  data: string;
}

// Parseia o corpo de um POST /api/chat (text/event-stream) em frames — sem EventSource, que só
// suporta GET. O formato é o mesmo escrito por apps/api/src/routes/chat.ts: blocos separados por
// linha em branco, cada um com uma linha "event: " opcional e uma linha "data: ".
async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const blocos = buffer.split('\n\n');
    buffer = blocos.pop() ?? '';

    for (const bloco of blocos) {
      if (!bloco.trim()) continue;
      const linhas = bloco.split('\n');
      const dataLinha = linhas.find((linha) => linha.startsWith('data: '));
      if (!dataLinha) continue;
      const eventoLinha = linhas.find((linha) => linha.startsWith('event: '));
      yield { event: eventoLinha?.slice('event: '.length), data: dataLinha.slice('data: '.length) };
    }
  }
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  async *ask(question: string): AsyncGenerator<ChatStreamEvent> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question } satisfies ChatRequest),
    });

    if (!response.ok || !response.body) {
      throw new Error(`POST /api/chat falhou com status ${response.status}`);
    }

    for await (const frame of parseSse(response.body)) {
      if (frame.event === 'error') {
        const erro = JSON.parse(frame.data) as { message: string };
        throw new Error(erro.message);
      }
      yield chatStreamEventSchema.parse(JSON.parse(frame.data));
    }
  }
}
