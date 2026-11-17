import { describe, expect, it } from 'vitest';
import { tokenize, visibleText, type ChatMessage } from './chat-message';

describe('tokenize', () => {
  it('quebra em palavras e espaços, e a junção reconstrói o texto original', () => {
    const texto = 'A receita foi R$ 122,4 bilhões.';
    const tokens = tokenize(texto);
    expect(tokens.join('')).toBe(texto);
    expect(tokens).toContain('receita');
  });

  it('não gera tokens vazios', () => {
    expect(tokenize('  duplo   espaço  ')).not.toContain('');
  });
});

describe('visibleText', () => {
  it('mostra só os tokens já revelados', () => {
    const message: ChatMessage = {
      id: 1,
      role: 'assistant',
      words: ['A ', 'receita ', 'foi ', 'X.'],
      revealed: 2,
      done: false,
      citations: [],
    };
    expect(visibleText(message)).toBe('A receita ');
  });
});
