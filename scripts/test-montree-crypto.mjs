#!/usr/bin/env node
// scripts/test-montree-crypto.mjs
//
// Self-contained audit test for lib/montree/messaging-crypto.ts.
// Does NOT touch the DB. Sets a test key, encrypts/decrypts a battery
// of inputs, verifies the rollback contract (version=null → plaintext
// pass-through, version=1 → decrypt, version=99 → sentinel).
//
// Run: node scripts/test-montree-crypto.mjs
// Exit code: 0 on all pass, 1 on any fail.

// Set test key BEFORE importing the module (it reads on each call so
// this is fine even after import, but cleaner this way).
process.env.MONTREE_ENCRYPTION_KEY = 'abcdefghijklmnopqrstuvwxyz012345';

const mod = await import('../lib/montree/messaging-crypto.ts');
const {
  encryptField,
  decryptField,
  readEncryptedField,
  writeEncryptedField,
  isEncryptionConfigured,
  DECRYPT_FAILURE_SENTINEL,
} = mod;

const tests = [];
const test = (name, condition) => tests.push({ name, ok: !!condition });

// 1. Config detection
test('isEncryptionConfigured() returns true with 32-char key', isEncryptionConfigured() === true);

// 2. Roundtrip ASCII
const ctA = encryptField('Hello, world');
test('Roundtrip ASCII', decryptField(ctA) === 'Hello, world');
test('Encrypt produces gcm: prefix', ctA.startsWith('gcm:'));
test('Encrypt produces 4 colon-parts', ctA.split(':').length === 4);

// 3. Roundtrip Unicode + emoji
const unicode = '你好,世界 — 🎓 Montessori "Quotes" \'apostrophe\'';
const ctU = encryptField(unicode);
test('Roundtrip Unicode + emoji + quotes', decryptField(ctU) === unicode);

// 4. Roundtrip empty string
const ctE = encryptField('');
test('Roundtrip empty string', decryptField(ctE) === '');

// 5. Roundtrip large
const long = 'x'.repeat(50000);
test('Roundtrip 50KB', decryptField(encryptField(long)) === long);

// 6. IV randomness (same plaintext → different ciphertexts)
const c1 = encryptField('same');
const c2 = encryptField('same');
test('IV randomness — same plaintext produces different ciphertexts', c1 !== c2);
test('Both still decrypt to original plaintext', decryptField(c1) === 'same' && decryptField(c2) === 'same');

// 7. Tampered ciphertext → sentinel (auth tag mismatch)
const tampered = ctA.slice(0, -2) + 'ff';
test('Tampered ciphertext returns sentinel', decryptField(tampered) === DECRYPT_FAILURE_SENTINEL);

// 8. Bad format → sentinel
test('No prefix returns sentinel', decryptField('not-encrypted') === DECRYPT_FAILURE_SENTINEL);
test('Wrong prefix returns sentinel', decryptField('cbc:abc:def:ghi') === DECRYPT_FAILURE_SENTINEL);
test('Too few parts returns sentinel', decryptField('gcm:abc:def') === DECRYPT_FAILURE_SENTINEL);
test('Too many parts returns sentinel', decryptField('gcm:a:b:c:d:e') === DECRYPT_FAILURE_SENTINEL);
test('Empty string returns sentinel', decryptField('') === DECRYPT_FAILURE_SENTINEL);

// 9. readEncryptedField version branching
test('readEncryptedField NULL passes through plaintext', readEncryptedField('hi', null) === 'hi');
test('readEncryptedField undefined passes through plaintext', readEncryptedField('hi', undefined) === 'hi');
test('readEncryptedField version=1 decrypts', readEncryptedField(ctA, 1) === 'Hello, world');
test('readEncryptedField version=99 unknown returns sentinel', readEncryptedField(ctA, 99) === DECRYPT_FAILURE_SENTINEL);
test('readEncryptedField null value returns empty string', readEncryptedField(null, 1) === '');
test('readEncryptedField undefined value returns empty string', readEncryptedField(undefined, 1) === '');
test('readEncryptedField null value version null returns empty string', readEncryptedField(null, null) === '');

// 10. writeEncryptedField flag gating
const off = writeEncryptedField('test', false);
test('writeEncryptedField flag=false returns plaintext + version null', off.value === 'test' && off.version === null);
const on = writeEncryptedField('test', true);
test('writeEncryptedField flag=true encrypts + version=1', on.value.startsWith('gcm:') && on.version === 1);

// 11. writeEncryptedField missing key falls back to plaintext loudly
const savedKey = process.env.MONTREE_ENCRYPTION_KEY;
delete process.env.MONTREE_ENCRYPTION_KEY;
const fallback = writeEncryptedField('test', true);
test('Missing key + flag=true falls back to plaintext + null version', fallback.value === 'test' && fallback.version === null);
process.env.MONTREE_ENCRYPTION_KEY = savedKey;

// 12. encryptField throws with bad key length / missing key
delete process.env.MONTREE_ENCRYPTION_KEY;
let threw = false;
try { encryptField('x'); } catch { threw = true; }
test('encryptField throws when key missing', threw);
process.env.MONTREE_ENCRYPTION_KEY = 'short';
threw = false;
try { encryptField('x'); } catch { threw = true; }
test('encryptField throws when key wrong length', threw);
process.env.MONTREE_ENCRYPTION_KEY = savedKey;

// 13. isEncryptionConfigured guards
delete process.env.MONTREE_ENCRYPTION_KEY;
test('isEncryptionConfigured() false when missing', isEncryptionConfigured() === false);
process.env.MONTREE_ENCRYPTION_KEY = 'short';
test('isEncryptionConfigured() false when wrong length', isEncryptionConfigured() === false);
process.env.MONTREE_ENCRYPTION_KEY = savedKey;
test('isEncryptionConfigured() true after restore', isEncryptionConfigured() === true);

// 14. Key change → old ciphertext fails to decrypt (auth tag mismatch)
const ctK1 = encryptField('secret');
process.env.MONTREE_ENCRYPTION_KEY = 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ';
test('Different key cannot decrypt original ciphertext', decryptField(ctK1) === DECRYPT_FAILURE_SENTINEL);
process.env.MONTREE_ENCRYPTION_KEY = savedKey;
test('Original key decrypts original ciphertext again', decryptField(ctK1) === 'secret');

// Report
let failed = 0;
console.log('');
for (const t of tests) {
  console.log(`${t.ok ? '✓' : '✗'} ${t.name}`);
  if (!t.ok) failed++;
}
console.log('');
console.log(`${tests.length - failed}/${tests.length} passed`);
process.exit(failed > 0 ? 1 : 0);
