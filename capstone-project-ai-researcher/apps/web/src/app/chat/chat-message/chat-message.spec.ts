import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../../state/chat-message';
import { ChatMessageComponent } from './chat-message';

function render(message: ChatMessage) {
  const fixture = TestBed.createComponent(ChatMessageComponent);
  fixture.componentRef.setInput('message', message);
  fixture.detectChanges();
  return fixture;
}

describe('ChatMessageComponent', () => {
  it('mensagem do usuário aparece à direita, sem cabeçalho de avatar', () => {
    const fixture = render({
      id: 1,
      role: 'user',
      words: ['Qual a receita da Vale?'],
      revealed: 1,
      done: true,
      citations: [],
    });

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.bubble--user')?.textContent).toContain(
      'Qual a receita da Vale?',
    );
    expect(compiled.querySelector('.bubble__avatar')).toBeFalsy();
  });

  it('mensagem do assistente em streaming mostra só os tokens revelados e o cursor', () => {
    const fixture = render({
      id: 2,
      role: 'assistant',
      words: ['A ', 'receita ', 'foi ', 'X.'],
      revealed: 2,
      done: false,
      citations: [],
    });

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.bubble__text')?.textContent?.trim()).toBe('A receita');
    expect(compiled.querySelector('.bubble__cursor')).toBeTruthy();
  });

  it('mensagem do assistente concluída não mostra cursor', () => {
    const fixture = render({
      id: 3,
      role: 'assistant',
      words: ['ok.'],
      revealed: 1,
      done: true,
      citations: [],
    });

    expect((fixture.nativeElement as HTMLElement).querySelector('.bubble__cursor')).toBeFalsy();
  });

  it('não mostra citações enquanto a mensagem ainda está em streaming', () => {
    const fixture = render({
      id: 4,
      role: 'assistant',
      words: ['A ', 'receita.'],
      revealed: 1,
      done: false,
      citations: [
        {
          label: 'VALE (3T25)',
          periodEnd: '2025-09-30',
          origem: 'Base local (CVM)',
          sourceUrl: 'https://x.com',
        },
      ],
    });

    expect((fixture.nativeElement as HTMLElement).querySelector('.citation-pill')).toBeFalsy();
  });

  it('mensagem concluída mostra uma pílula por citação, e clicar abre o painel com data-base e origem', () => {
    const fixture = render({
      id: 5,
      role: 'assistant',
      words: ['A ', 'receita ', 'foi ', 'X.'],
      revealed: 4,
      done: true,
      citations: [
        {
          label: 'VALE (3T25)',
          periodEnd: '2025-09-30',
          origem: 'Base local (CVM)',
          sourceUrl: 'https://dados.cvm.gov.br/exemplo',
        },
        {
          label: 'Release de resultados do 2T25',
          origem: 'ri.petrobras.com.br',
          sourceUrl: 'https://ri.petrobras.com.br/releases',
        },
      ],
    });
    const compiled = fixture.nativeElement as HTMLElement;

    const pills = compiled.querySelectorAll('.citation-pill');
    expect(pills).toHaveLength(2);
    expect(pills[0].textContent?.trim()).toBe('VALE (3T25)');
    expect(compiled.querySelector('.citation-panel')).toBeFalsy();

    (pills[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    const painel = compiled.querySelector('.citation-panel') as HTMLElement;
    expect(painel).toBeTruthy();
    expect(painel.textContent).toContain('2025-09-30');
    expect(painel.textContent).toContain('Base local (CVM)');
    const link = painel.querySelector('.citation-panel__link') as HTMLAnchorElement;
    expect(link.href).toBe('https://dados.cvm.gov.br/exemplo');
    expect(link.target).toBe('_blank');

    (pills[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(compiled.querySelector('.citation-panel')).toBeFalsy();
  });
});
