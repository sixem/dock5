// The Clipboard API requires HTTPS or localhost. Some browsers still support
// the legacy copy command for an explicit user action on a local HTTP preview.
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const previousFocus = document.activeElement;
  const selection = document.getSelection();
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) =>
        selection.getRangeAt(index).cloneRange(),
      )
    : [];
  const input = document.createElement('textarea');
  input.value = text;
  input.readOnly = true;
  input.setAttribute('aria-hidden', 'true');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  try {
    input.focus({ preventScroll: true });
    input.select();
    if (!document.execCommand('copy'))
      throw new Error('Copy command was rejected');
  } finally {
    input.remove();
    if (previousFocus instanceof HTMLElement)
      previousFocus.focus({ preventScroll: true });
    if (selection) {
      selection.removeAllRanges();
      for (const range of ranges) selection.addRange(range);
    }
  }
}
