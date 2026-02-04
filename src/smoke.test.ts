// Smoke test to ensure the test runner + DOM environment are wired correctly.
import { describe, expect, it } from 'vitest';

describe('smoke', () => {
  it('provides a DOM environment', () => {
    expect(document).toBeDefined();

    const el = document.createElement('div');
    el.textContent = 'ok';
    expect(el.textContent).toBe('ok');
  });
});
