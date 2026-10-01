import { expect, test } from 'vitest';

test('uses the accepted Node 24 runtime', () => {
  expect(Number(process.versions.node.split('.')[0])).toBe(24);
});
