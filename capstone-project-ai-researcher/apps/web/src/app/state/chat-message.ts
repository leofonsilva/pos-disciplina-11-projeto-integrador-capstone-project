import type { Citation } from './citation';

export interface ChatMessage {
  readonly id: number;
  readonly role: 'user' | 'assistant';
  // Tokens (palavras + espaços) já quebrados, revelados um a um pelo ChatStore — ver
  // startReveal em docs/design/prototype/ai-researcher-chat.dc.html. Mensagem do usuário
  // aparece inteira de uma vez: um token só, já revelado.
  readonly words: string[];
  readonly revealed: number;
  readonly done: boolean;
  // Extraídas do bloco "Fontes:" no fim do answerText (ver state/citation.ts) — não fazem
  // parte de words/revealed, aparecem de uma vez quando a mensagem termina, não streamadas.
  readonly citations: Citation[];
}

export function visibleText(message: ChatMessage): string {
  return message.words.slice(0, message.revealed).join('');
}

// Mantém os espaços como tokens próprios — juntar de volta com join('') reconstrói o texto
// original sem precisar recolocar separador.
export function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
}
