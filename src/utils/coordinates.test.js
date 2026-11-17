import test from 'node:test';
import assert from 'node:assert/strict';
import { areValidCoordinates } from './coordinates.js';

test('accepts coordinates within world bounds', () => assert.equal(areValidCoordinates(4.7, -74.1), true));
test('rejects non-numeric and out-of-range coordinates', () => {
  assert.equal(areValidCoordinates('x', -74), false);
  assert.equal(areValidCoordinates(91, 0), false);
  assert.equal(areValidCoordinates(0, -181), false);
});
