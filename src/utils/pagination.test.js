import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePagination } from './pagination.js';
test('clamps pagination to safe limits', () => assert.deepEqual(parsePagination({ limit: '999', offset: '-3' }), { limit: 100, offset: 0 }));
test('uses defaults for malformed pagination', () => assert.deepEqual(parsePagination({ limit: 'x', offset: 'x' }), { limit: 100, offset: 0 }));
