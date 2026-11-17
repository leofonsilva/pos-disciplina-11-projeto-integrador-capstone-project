import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { visibleText, type ChatMessage } from '../../state/chat-message';
import type { Citation } from '../../state/citation';

@Component({
  selector: 'app-chat-message',
  templateUrl: './chat-message.html',
  styleUrl: './chat-message.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageComponent {
  readonly message = input.required<ChatMessage>();

  protected readonly isUser = computed(() => this.message().role === 'user');
  protected readonly text = computed(() => visibleText(this.message()));
  protected readonly showCursor = computed(
    () => !this.isUser() && !this.message().done && this.message().words.length > 0,
  );

  protected readonly citations = computed(() =>
    this.message().done ? this.message().citations : [],
  );

  private readonly openCitationUrl = signal<string | null>(null);
  protected readonly openCitation = computed<Citation | null>(
    () => this.citations().find((citacao) => citacao.sourceUrl === this.openCitationUrl()) ?? null,
  );

  protected toggleCitation(sourceUrl: string): void {
    this.openCitationUrl.update((atual) => (atual === sourceUrl ? null : sourceUrl));
  }
}
