import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { GraphPanelComponent } from '../graph/graph-panel/graph-panel';
import { ChatStore } from '../state/chat-store';
import { ChatMessageComponent } from './chat-message/chat-message';

@Component({
  selector: 'app-chat',
  imports: [ChatMessageComponent, GraphPanelComponent],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat {
  private readonly store = inject(ChatStore);

  protected readonly messages = this.store.messages;
  protected readonly pending = this.store.pending;
  protected readonly inputValue = signal('');

  protected onInput(event: Event): void {
    this.inputValue.set((event.target as HTMLInputElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.onSend();
    }
  }

  protected onSend(): void {
    const question = this.inputValue();
    if (!question.trim() || this.pending()) return;
    this.inputValue.set('');
    void this.store.send(question);
  }

  protected onReset(): void {
    this.store.reset();
  }
}
