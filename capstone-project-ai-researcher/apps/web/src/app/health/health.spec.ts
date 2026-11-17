import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Health } from './health';

describe('Health', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renderiza o status vindo de /api/health', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ status: 'ok', database: 'ok' }), { status: 200 }),
        ),
    );

    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(Health);
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('status: ok');
    expect(compiled.textContent).toContain('database: ok');
  });
});
