// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { expect, it } from 'vitest';
import { Search } from './Search';

it('offers keyboard-accessible local results and an empty state', () => {
  const container = document.createElement('div');
  document.body.append(container);
  try {
    act(() =>
      render(
        <Search
          pages={[
            {
              slug: '/guide',
              title: 'Guide',
              html: '<h2 id="launch">Launch</h2><p>Rocket checklist.</p>',
              headings: [{ id: 'launch', depth: 2, text: 'Launch' }],
            },
          ]}
        />,
        container,
      ),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    act(() => {
      input.focus();
      input.value = 'rocket';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const link =
      container.querySelector<HTMLAnchorElement>('.search__results a');
    expect(link?.getAttribute('href')).toBe('#/guide#launch');
    expect(link?.textContent).toContain('Guide — Launch');
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(link);
    act(() => {
      link?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(input);
    expect(container.querySelector('.search__results')).toBeNull();
    act(() => {
      input.value = 'not found';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'No results',
    );
  } finally {
    act(() => render(null, container));
    container.remove();
  }
});
