import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail } from './email.js';
test('normalizes valid email addresses', () => assert.equal(normalizeEmail('  User@Example.COM '), 'user@example.com'));
test('rejects malformed email addresses', () => assert.equal(normalizeEmail('invalid'), null));
