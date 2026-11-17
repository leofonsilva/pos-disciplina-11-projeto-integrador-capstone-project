import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { criarSearchProvider } from './index.js';

const ORIGINAL_ENV = { ...process.env };

describe('criarSearchProvider', () => {
  beforeEach(() => {
    delete process.env.SEARCH_PROVIDER;
    delete process.env.SERPER_API_KEY;
    delete process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    delete process.env.GOOGLE_CUSTOM_SEARCH_CX;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('usa serper por default e exige SERPER_API_KEY', () => {
    expect(() => criarSearchProvider()).toThrow('SERPER_API_KEY');

    process.env.SERPER_API_KEY = 'chave';
    expect(() => criarSearchProvider()).not.toThrow();
  });

  it('troca pra google via SEARCH_PROVIDER e exige API key + cx', () => {
    process.env.SEARCH_PROVIDER = 'google';
    expect(() => criarSearchProvider()).toThrow('GOOGLE_CUSTOM_SEARCH');

    process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'chave';
    process.env.GOOGLE_CUSTOM_SEARCH_CX = 'cx';
    expect(() => criarSearchProvider()).not.toThrow();
  });

  it('rejeita provider desconhecido', () => {
    process.env.SEARCH_PROVIDER = 'bing';
    expect(() => criarSearchProvider()).toThrow('desconhecido');
  });
});
