import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidPassword } from './password.js';

test('accepts a strong password without whitespace', () => {
  assert.equal(isValidPassword('secure-pass-123'), true);
});

test('rejects short or whitespace-containing passwords', () => {
  assert.equal(isValidPassword('short'), false);
  assert.equal(isValidPassword('secure pass 123'), false);
});
