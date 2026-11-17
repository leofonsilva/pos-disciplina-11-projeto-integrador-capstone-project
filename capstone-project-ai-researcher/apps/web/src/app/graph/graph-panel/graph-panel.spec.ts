import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { GraphStore } from '../../state/graph-store';
import { GraphPanelComponent } from './graph-panel';

function render(): { fixture: ReturnType<typeof TestBed.createComponent>; store: GraphStore } {
  TestBed.configureTestingModule({});
  const store = TestBed.inject(GraphStore);
  const fixture = TestBed.createComponent(GraphPanelComponent);
  fixture.detectChanges();
  return { fixture, store };
}

describe('GraphPanelComponent', () => {
  it('sem execução em andamento, não mostra nenhuma etapa nem o banner de fallback', () => {
    const { fixture } = render();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('.step')).toHaveLength(0);
    expect(compiled.querySelector('.fallback-banner')).toBeFalsy();
  });

  it('mostra a etapa em execução com o spinner e a tag "Em execução"', () => {
    const { fixture, store } = render();
    store.startRun();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const steps = compiled.querySelectorAll('.step');
    expect(steps).toHaveLength(1);
    expect(steps[0].textContent).toContain('Retrieve');
    expect(steps[0].textContent).toContain('Em execução');
    expect(steps[0].querySelector('.spin')).toBeTruthy();
  });

  it('etapa concluída mostra a duração no lugar de "Em execução", sem o spinner', () => {
    const { fixture, store } = render();
    store.startRun();
    store.onEvent({ node: 'retrieve', documents: [] });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const primeiraEtapa = compiled.querySelectorAll('.step')[0];
    expect(primeiraEtapa.querySelector('.spin')).toBeFalsy();
    expect(primeiraEtapa.textContent).not.toContain('Em execução');
    expect(primeiraEtapa.textContent).toMatch(/\d+(ms|s)/);
  });

  it('não colapsa o loop: uma segunda passagem por retrieve aparece como etapa própria, rotulada com a iteração', () => {
    const { fixture, store } = render();
    store.startRun();
    store.onEvent({ node: 'retrieve', documents: [] });
    store.onEvent({
      node: 'grade',
      sufficient: false,
      missingAspects: ['fato relevante'],
      iterations: 1,
    });
    store.onEvent({ node: 'webSearch' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fallback-banner')).toBeTruthy();

    // onEvent(webSearch) já marca a busca concluída e empurra o retrieve da 2ª iteração como
    // "running" no mesmo passo — o stream só avisa nó concluído, nunca nó iniciado.
    const rotulos = Array.from(compiled.querySelectorAll('.step__label')).map(
      (el) => el.textContent,
    );
    expect(rotulos).toEqual(['Retrieve', 'Grade', 'Search', 'Retrieve · iteração 2']);
  });
});
