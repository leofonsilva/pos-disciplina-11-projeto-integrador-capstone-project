import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });
  });

  it('monta o chat na rota raiz', async () => {
    const harness = await RouterTestingHarness.create('/');

    expect(harness.routeNativeElement?.tagName.toLowerCase()).toBe('app-chat');
  });

  it('monta a página de status na rota /health', async () => {
    const harness = await RouterTestingHarness.create('/health');

    expect(harness.routeNativeElement?.tagName.toLowerCase()).toBe('app-health');
  });
});
