const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadScripts, plain } = require('./helpers/browser-env');

const GOOD_NAMES = ['Zoë', "O'Brien", 'O’Brien', 'Jean-Luc', 'St. John', 'José María', 'Ng', 'Ó'];
const BAD_NAMES = ['R2D2', '123', '-Bob', "'Ann", 'Ada!', '', '   '];

function loadValidation() {
  return loadScripts(['validation']).Breezy.validation;
}

describe('names', () => {
  it('accepts letters, accents, apostrophes, hyphens, spaces and periods', () => {
    const validation = loadValidation();
    GOOD_NAMES.forEach(name => {
      const first = validation.firstName(name);
      const last = validation.lastName(name);
      assert.equal(first.error, null, name);
      assert.equal(last.error, null, name);
      assert.equal(first.value, name);
      assert.equal(last.value, name);
    });
  });

  it('rejects digits, punctuation, and empty names', () => {
    const validation = loadValidation();
    BAD_NAMES.forEach(name => {
      assert.ok(validation.firstName(name).error, JSON.stringify(name));
      assert.ok(validation.lastName(name).error, JSON.stringify(name));
    });
  });

  it('collapses whitespace and stops at the first failing rule', () => {
    const validation = loadValidation();
    const cleaned = validation.firstName('  Ada   Mae  ');
    assert.equal(cleaned.value, 'Ada Mae');
    assert.equal(cleaned.error, null);
    assert.equal(validation.firstName('').error, 'Enter your first name.');
    assert.equal(validation.lastName('').error, 'Enter your last name.');
    assert.equal(validation.firstName('A'.repeat(51)).error, 'Keep it under 50 characters.');
  });
});

describe('email', () => {
  it('trims and lowercases a valid address', () => {
    const validation = loadValidation();
    const result = validation.email('ADA@Example.COM ');
    assert.equal(result.value, 'ada@example.com');
    assert.equal(result.error, null);
  });

  it('rejects incomplete and oversized addresses with the matching message', () => {
    const validation = loadValidation();
    const format = 'Enter an email like name@example.com.';
    assert.equal(validation.email('ada').error, format);
    assert.equal(validation.email('ada@').error, format);
    assert.equal(validation.email('ada@example').error, format);
    assert.equal(validation.email('ada@example.c').error, format);
    assert.equal(validation.email('a b@example.com').error, format);
    assert.equal(validation.email('a'.repeat(255)).error, "Email addresses can't be longer than 254 characters.");
  });
});

describe('password', () => {
  it('requires a letter and a number and keeps spaces', () => {
    const validation = loadValidation();
    const complexity = 'Use at least 8 characters, including a letter and a number.';
    assert.equal(validation.password('password').error, complexity);
    assert.equal(validation.password('12345678').error, complexity);
    const good = validation.password('breathe123');
    assert.equal(good.error, null);
    assert.equal(good.value, 'breathe123');
    const spaced = validation.password('  spaced 1');
    assert.equal(spaced.error, null);
    assert.equal(spaced.value, '  spaced 1');
    assert.equal(validation.password('a'.repeat(129)).error, 'Keep it under 128 characters.');
  });

  it('reports checklist flags without waiting for a full password', () => {
    const validation = loadValidation();
    assert.deepEqual(plain(validation.passwordChecks('abc1')), { length: false, letter: true, number: true });
  });
});

describe('passwordConfirm and waiver', () => {
  it('requires a matching confirmation and a checked waiver', () => {
    const validation = loadValidation();
    assert.equal(validation.passwordConfirm('breathe123', '').error, 'Re-enter your password.');
    assert.equal(validation.passwordConfirm('breathe123', 'other123').error, "Passwords don't match.");
    assert.equal(validation.passwordConfirm('breathe123', 'breathe123').error, null);
    assert.equal(validation.waiver(false).error, 'Please accept the Nostril Waiver to continue.');
    assert.equal(validation.waiver(true).error, null);
  });
});

describe('account', () => {
  it('returns cleaned values and only the fields that failed', () => {
    const validation = loadValidation();
    const valid = validation.account({
      firstName: '  Ada  ',
      lastName: 'Breath',
      email: 'ADA@Example.COM',
      password: 'breathe123',
      passwordConfirm: 'breathe123',
      waiver: true,
    });
    assert.deepEqual(plain(valid.errors), {});
    assert.deepEqual(plain(valid.values), {
      firstName: 'Ada',
      lastName: 'Breath',
      email: 'ada@example.com',
      password: 'breathe123',
    });

    const invalid = validation.account({
      firstName: '',
      lastName: 'Breath',
      email: 'ada',
      password: 'breathe123',
      passwordConfirm: 'nope1234',
      waiver: true,
    });
    assert.deepEqual(Object.keys(plain(invalid.errors)).sort(), ['email', 'firstName', 'passwordConfirm']);
  });
});
