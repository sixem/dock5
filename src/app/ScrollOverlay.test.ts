import { expect, it } from 'vitest';
import { scrollMetrics } from './ScrollOverlay';

it('calculates an overlay thumb and clamps scroll progress', () => {
  expect(scrollMetrics(100, 100, 100, 0)).toEqual({
    size: 1,
    progress: 0,
    max: 0,
    page: 100,
  });
  expect(scrollMetrics(100, 1000, 100, 450)).toEqual({
    size: 0.24,
    progress: 0.5,
    max: 900,
    page: 100,
  });
  expect(scrollMetrics(100, 200, 100, 200).progress).toBe(1);
  expect(scrollMetrics(100, 200, 100, -10).progress).toBe(0);
});
