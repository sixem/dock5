// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { copyText } from './copyText';

const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const command = Object.getOwnPropertyDescriptor(document, 'execCommand');

afterEach(() => {
  if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard);
  else Reflect.deleteProperty(navigator, 'clipboard');
  if (command) Object.defineProperty(document, 'execCommand', command);
  else Reflect.deleteProperty(document, 'execCommand');
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

it('uses the legacy copy command when the Clipboard API is unavailable', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: undefined,
  });
  const previous = document.createElement('button');
  document.body.append(previous);
  previous.focus();
  const exec = vi.fn(() => {
    expect(document.activeElement).toBeInstanceOf(HTMLTextAreaElement);
    expect((document.activeElement as HTMLTextAreaElement).value).toBe(
      'text to copy',
    );
    return true;
  });
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: exec,
  });
  await copyText('text to copy');
  expect(exec).toHaveBeenCalledWith('copy');
  expect(document.activeElement).toBe(previous);
  expect(document.querySelector('textarea')).toBeNull();
});

it('reports failure and removes the temporary input when copying is rejected', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: () => false,
  });
  await expect(copyText('x')).rejects.toThrow('Copy command was rejected');
  expect(document.querySelector('textarea')).toBeNull();
});
