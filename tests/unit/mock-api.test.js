const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { loadScripts, makeStorage, plain } = require('./helpers/browser-env');

const CODES = ['VALIDATION_ERROR', 'EMAIL_TAKEN', 'CARD_DECLINED', 'NOT_FOUND', 'NOT_IMPLEMENTED'];

function loadApi(options) {
  return loadScripts(['plans-data', 'validation', 'flow-state', 'mock-api'], options);
}

async function settle(promise) {
  mock.timers.tick(900);
  return promise;
}

describe('mock api', () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ['setTimeout'] });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  it('freezes the five error codes', () => {
    const { Breezy } = loadApi();
    assert.equal(Object.isFrozen(Breezy.api.ERRORS), true);
    assert.deepEqual(Object.keys(Breezy.api.ERRORS).sort(), CODES.slice().sort());
    CODES.forEach(code => assert.equal(Breezy.api.ERRORS[code], code));
  });

  it('createAccount waits between 400 and 900 ms', async () => {
    const { Breezy } = loadApi();
    let settled = false;
    const pending = Breezy.api.createAccount({}).then(() => {
      settled = true;
    });
    mock.timers.tick(399);
    await Promise.resolve();
    assert.equal(settled, false);
    mock.timers.tick(501);
    await pending;
    assert.equal(settled, true);
  });

  it('creates an account and stores only a salted hash', async () => {
    const localStorage = makeStorage();
    const { Breezy } = loadApi({ localStorage });
    const input = {
      firstName: 'Ada',
      lastName: 'Breath',
      email: 'ada@example.com',
      password: 'breathe123',
      passwordConfirm: 'breathe123',
      waiver: true,
    };
    const result = await settle(Breezy.api.createAccount(input));
    assert.equal(result.ok, true);
    assert.deepEqual(Object.keys(result.data).sort(), ['accountId', 'createdAt', 'email', 'firstName', 'lastName']);
    assert.match(result.data.accountId, /^acc_[0-9a-f]{12}$/);
    const raw = localStorage.getItem('breezy.db');
    assert.equal(raw.includes('breathe123'), false);
    const stored = JSON.parse(raw).accounts.find(account => account.email === 'ada@example.com');
    assert.match(stored.passwordHash, /^[0-9a-f]{64}$/);
    assert.match(stored.salt, /^[0-9a-f]{32}$/);
  });

  it('gives two accounts with the same password different salts', async () => {
    const localStorage = makeStorage();
    const { Breezy } = loadApi({ localStorage });
    const base = {
      firstName: 'Ada',
      lastName: 'Breath',
      password: 'breathe123',
      passwordConfirm: 'breathe123',
      waiver: true,
    };
    await settle(Breezy.api.createAccount({ ...base, email: 'one@example.com' }));
    await settle(Breezy.api.createAccount({ ...base, email: 'two@example.com' }));
    const accounts = JSON.parse(localStorage.getItem('breezy.db')).accounts.filter(account => account.salt);
    assert.equal(accounts.length, 2);
    assert.notEqual(accounts[0].salt, accounts[1].salt);
    assert.notEqual(accounts[0].passwordHash, accounts[1].passwordHash);
  });

  it('rejects invalid input without saving an account', async () => {
    const localStorage = makeStorage();
    const { Breezy } = loadApi({ localStorage });
    const result = await settle(Breezy.api.createAccount({
      firstName: 'R2D2',
      lastName: '',
      email: 'ada',
      password: 'password',
      passwordConfirm: '',
      waiver: false,
    }));
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'VALIDATION_ERROR');
    assert.deepEqual(Object.keys(plain(result.error.fields)).sort(), ['email', 'firstName', 'lastName', 'password', 'passwordConfirm', 'waiver']);
    assert.equal(localStorage.getItem('breezy.db'), null);
  });

  it('rejects the seeded demo email regardless of case', async () => {
    const { Breezy } = loadApi();
    const base = {
      firstName: 'Ada',
      lastName: 'Breath',
      password: 'breathe123',
      passwordConfirm: 'breathe123',
      waiver: true,
    };
    const lower = await settle(Breezy.api.createAccount({ ...base, email: 'taken@breezy.io' }));
    const upper = await settle(Breezy.api.createAccount({ ...base, email: 'TAKEN@Breezy.IO' }));
    assert.equal(lower.error.code, 'EMAIL_TAKEN');
    assert.equal(lower.error.fields.email, 'An account with this email already exists.');
    assert.equal(upper.error.code, 'EMAIL_TAKEN');
    assert.equal(upper.error.fields.email, 'An account with this email already exists.');
  });

  it('rejects a second registration of the same email', async () => {
    const { Breezy } = loadApi();
    const input = {
      firstName: 'Ada',
      lastName: 'Breath',
      email: 'ada@example.com',
      password: 'breathe123',
      passwordConfirm: 'breathe123',
      waiver: true,
    };
    const first = await settle(Breezy.api.createAccount(input));
    const second = await settle(Breezy.api.createAccount(input));
    assert.equal(first.ok, true);
    assert.equal(second.ok, false);
    assert.equal(second.error.code, 'EMAIL_TAKEN');
  });

  it('brings the demo account back after reset', async () => {
    const localStorage = makeStorage();
    const { Breezy } = loadApi({ localStorage });
    const input = {
      firstName: 'Ada',
      lastName: 'Breath',
      email: 'ada@example.com',
      password: 'breathe123',
      passwordConfirm: 'breathe123',
      waiver: true,
    };
    await settle(Breezy.api.createAccount(input));
    Breezy.api.resetDb();
    const again = await settle(Breezy.api.createAccount({ ...input, email: 'taken@breezy.io' }));
    assert.equal(again.error.code, 'EMAIL_TAKEN');
  });

  it('tokenizeCard is a stub until Phase 4', async () => {
    const { Breezy } = loadApi();
    const result = await settle(Breezy.api.tokenizeCard({}));
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'NOT_IMPLEMENTED');
    assert.equal(typeof result.error.message, 'string');
    assert.deepEqual(plain(result.error.fields), {});
  });

  it('createSubscription is a stub until Phase 4', async () => {
    const { Breezy } = loadApi();
    const result = await settle(Breezy.api.createSubscription({}));
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'NOT_IMPLEMENTED');
    assert.equal(typeof result.error.message, 'string');
    assert.deepEqual(plain(result.error.fields), {});
  });

  it('resetDb removes breezy.db immediately', () => {
    const localStorage = makeStorage();
    localStorage.setItem('breezy.db', '{"version":1,"accounts":[],"paymentMethods":[],"subscriptions":[]}');
    const { Breezy } = loadApi({ localStorage });
    const result = Breezy.api.resetDb();
    assert.equal(result, undefined);
    assert.equal(localStorage.getItem('breezy.db'), null);
  });
});
