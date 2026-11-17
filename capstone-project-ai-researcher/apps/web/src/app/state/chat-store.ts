import { Injectable, inject, signal } from '@angular/core';
import { ChatService } from '../api/chat.service';
import { parseAnswer } from './citation';
import { GraphStore } from './graph-store';
import { tokenize, type ChatMessage } from './chat-message';

const STREAM_SPEED_MS = 70;
const RESPOSTA_INDISPONIVEL =
  'Não foi possível obter uma resposta agora. Tente novamente em instantes.';

@Injectable({ providedIn: 'root' })
export class ChatStore {
  private readonly chatService = inject(ChatService);
  private readonly graphStore = inject(GraphStore);

  private readonly _messages = signal<ChatMessage[]>([]);
  readonly messages = this._messages.asReadonly();

  private readonly _pending = signal(false);
  readonly pending = this._pending.asReadonly();

  private nextId = 1;
  private revealTimer?: ReturnType<typeof setInterval>;

  async send(question: string): Promise<void> {
    const texto = question.trim();
    if (!texto || this._pending()) return;

    this.clearReveal();
    const userId = this.nextId++;
    const assistantId = this.nextId++;
    this._messages.update((mensagens) => [
      ...mensagens,
      { id: userId, role: 'user', words: [texto], revealed: 1, done: true, citations: [] },
      { id: assistantId, role: 'assistant', words: [], revealed: 0, done: false, citations: [] },
    ]);
    this._pending.set(true);
    this.graphStore.startRun();

    try {
      for await (const evento of this.chatService.ask(texto)) {
        this.graphStore.onEvent(evento);
        if (evento.node === 'answer' && evento.answerText) {
          this.startReveal(assistantId, evento.answerText);
        }
      }
    } catch {
      this.graphStore.failRun();
      this.finishWithText(assistantId, RESPOSTA_INDISPONIVEL);
    } finally {
      this._pending.set(false);
    }
  }

  reset(): void {
    this.clearReveal();
    this._messages.set([]);
    this._pending.set(false);
    this.graphStore.reset();
  }

  private startReveal(messageId: number, fullText: string): void {
    const { body, citations } = parseAnswer(fullText);
    const words = tokenize(body);
    this.updateMessage(messageId, { words, revealed: 0, done: words.length === 0, citations });
    if (words.length === 0) return;

    let revealed = 0;
    this.revealTimer = setInterval(() => {
      revealed++;
      const done = revealed >= words.length;
      this.updateMessage(messageId, { revealed, done });
      if (done) this.clearReveal();
    }, STREAM_SPEED_MS);
  }

  private finishWithText(messageId: number, text: string): void {
    this.updateMessage(messageId, { words: [text], revealed: 1, done: true, citations: [] });
  }

  private updateMessage(messageId: number, changes: Partial<ChatMessage>): void {
    this._messages.update((mensagens) =>
      mensagens.map((mensagem) =>
        mensagem.id === messageId ? { ...mensagem, ...changes } : mensagem,
      ),
    );
  }

  private clearReveal(): void {
    if (this.revealTimer) {
      clearInterval(this.revealTimer);
      this.revealTimer = undefined;
    }
  }
}
