const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { loadScripts, makeStorage, plain } = require('./helpers/browser-env');

const CODES = ['VALIDATION_ERROR', 'EMAIL_TAKEN', 'CARD_DECLINED', 'NOT_FOUND', 'NOT_IMPLEMENTED', 'ALREADY_SUBSCRIBED'];

function loadApi(options) {
  return loadScripts(['plans-data', 'billing', 'card-format', 'validation', 'flow-state', 'mock-api'], options);
}

async function settle(promise) {
  mock.timers.tick(900);
  return promise;
}

describe('mock api', () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ['setTimeout', 'Date'], now: new Date(2026, 8, 30, 12) });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  it('freezes the six error codes', () => {
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

  it('tokenizes a test card without storing the number', async () => {
    const localStorage = makeStorage();
    const { Breezy } = loadApi({ localStorage });
    const result = await settle(Breezy.api.tokenizeCard({
      cardName: 'Ada Breath',
      cardNumber: Breezy.api.TEST_CARDS.visa,
      cardExpiry: '1228',
      cardCvc: '123',
      postalCode: '10001',
    }));
    assert.equal(result.ok, true);
    assert.equal(result.data.brand, 'visa');
    assert.equal(result.data.last4, '4242');
    assert.match(result.data.token, /^tok_[0-9a-f]{16}$/);
    const raw = localStorage.getItem('breezy.db');
    assert.equal(raw.includes('4242424242424242'), false);
    const stored = JSON.parse(raw).paymentMethods[0];
    assert.deepEqual(Object.keys(stored).sort(), ['brand', 'createdAt', 'expMonth', 'expYear', 'last4', 'token', 'used']);
    assert.equal(stored.used, false);
  });

  it('rejects a real card that is not in the test list', async () => {
    const localStorage = makeStorage();
    const { Breezy } = loadApi({ localStorage });
    const result = await settle(Breezy.api.tokenizeCard({
      cardName: 'Ada Breath',
      cardNumber: '4111111111111111',
      cardExpiry: '1228',
      cardCvc: '123',
      postalCode: '10001',
    }));
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'VALIDATION_ERROR');
    assert.equal(result.error.fields.cardNumber, 'This demo only accepts test cards. Try 4242 4242 4242 4242.');
    assert.equal(localStorage.getItem('breezy.db'), null);
  });

  it('declines the designated test card and saves nothing', async () => {
    const localStorage = makeStorage();
    const { Breezy } = loadApi({ localStorage });
    const result = await settle(Breezy.api.tokenizeCard({
      cardName: 'Ada Breath',
      cardNumber: Breezy.api.TEST_CARDS.declined,
      cardExpiry: '1228',
      cardCvc: '123',
      postalCode: '10001',
    }));
    assert.equal(result.error.code, 'CARD_DECLINED');
    assert.equal(result.error.fields.cardNumber, 'Your card was declined. Try a different card.');
    assert.equal(localStorage.getItem('breezy.db'), null);
  });

  it('names the invalid payment fields', async () => {
    const localStorage = makeStorage();
    const { Breezy } = loadApi({ localStorage });
    const result = await settle(Breezy.api.tokenizeCard({}));
    assert.equal(result.error.code, 'VALIDATION_ERROR');
    assert.deepEqual(Object.keys(plain(result.error.fields)).sort(), ['cardCvc', 'cardExpiry', 'cardName', 'cardNumber', 'postalCode']);
    assert.equal(localStorage.getItem('breezy.db'), null);
  });

  it('starts a power trial and an immediate casual subscription', async () => {
    const localStorage = makeStorage();
    const { Breezy } = loadApi({ localStorage });
    const account = await settle(Breezy.api.createAccount({
      firstName: 'Ada',
      lastName: 'Breath',
      email: 'ada@example.com',
      password: 'breathe123',
      passwordConfirm: 'breathe123',
      waiver: true,
    }));
    const token = await settle(Breezy.api.tokenizeCard({
      cardName: 'Ada Breath',
      cardNumber: Breezy.api.TEST_CARDS.visa,
      cardExpiry: '1228',
      cardCvc: '123',
      postalCode: '10001',
    }));
    const power = await settle(Breezy.api.createSubscription({
      accountId: account.data.accountId,
      planId: 'power',
      paymentToken: token.data.token,
    }));
    assert.equal(power.ok, true);
    assert.equal(power.data.status, 'trialing');
    assert.equal(power.data.amountCents, 2900);
    assert.deepEqual(plain(power.data.card), { brand: 'visa', last4: '4242' });
    assert.equal(Object.hasOwn(power.data, 'accountId'), false);
    const charge = new Date(power.data.firstChargeAt);
    assert.deepEqual([charge.getFullYear(), charge.getMonth(), charge.getDate()], [2026, 9, 7]);

    Breezy.api.resetDb();
    const again = await settle(Breezy.api.createAccount({
      firstName: 'Ada',
      lastName: 'Breath',
      email: 'ada@example.com',
      password: 'breathe123',
      passwordConfirm: 'breathe123',
      waiver: true,
    }));
    const casualToken = await settle(Breezy.api.tokenizeCard({
      cardName: 'Ada Breath',
      cardNumber: Breezy.api.TEST_CARDS.visa,
      cardExpiry: '1228',
      cardCvc: '123',
      postalCode: '10001',
    }));
    const casual = await settle(Breezy.api.createSubscription({
      accountId: again.data.accountId,
      planId: 'casual',
      paymentToken: casualToken.data.token,
    }));
    assert.equal(casual.data.status, 'active');
    const started = new Date(casual.data.startedAt);
    const first = new Date(casual.data.firstChargeAt);
    assert.deepEqual(
      [first.getFullYear(), first.getMonth(), first.getDate()],
      [started.getFullYear(), started.getMonth(), started.getDate()]
    );
  });

  it('rejects a reused token, a second subscription, a missing account, and enterprise', async () => {
    const { Breezy } = loadApi();
    const account = await settle(Breezy.api.createAccount({
      firstName: 'Ada',
      lastName: 'Breath',
      email: 'ada@example.com',
      password: 'breathe123',
      passwordConfirm: 'breathe123',
      waiver: true,
    }));
    const firstToken = await settle(Breezy.api.tokenizeCard({
      cardName: 'Ada Breath',
      cardNumber: Breezy.api.TEST_CARDS.visa,
      cardExpiry: '1228',
      cardCvc: '123',
      postalCode: '10001',
    }));
    const missing = await settle(Breezy.api.createSubscription({
      accountId: 'acc_missing',
      planId: 'power',
      paymentToken: firstToken.data.token,
    }));
    assert.equal(missing.error.code, 'NOT_FOUND');
    const enterprise = await settle(Breezy.api.createSubscription({
      accountId: account.data.accountId,
      planId: 'enterprise',
      paymentToken: firstToken.data.token,
    }));
    assert.equal(enterprise.error.message, "That plan can't be purchased online.");
    const subscribed = await settle(Breezy.api.createSubscription({
      accountId: account.data.accountId,
      planId: 'power',
      paymentToken: firstToken.data.token,
    }));
    assert.equal(subscribed.ok, true);
    const reused = await settle(Breezy.api.createSubscription({
      accountId: account.data.accountId,
      planId: 'casual',
      paymentToken: firstToken.data.token,
    }));
    assert.equal(reused.error.fields.cardNumber, "This payment method can't be used. Please re-enter your card.");
    const fresh = await settle(Breezy.api.tokenizeCard({
      cardName: 'Ada Breath',
      cardNumber: Breezy.api.TEST_CARDS.amex,
      cardExpiry: '1228',
      cardCvc: '1234',
      postalCode: '10001',
    }));
    const second = await settle(Breezy.api.createSubscription({
      accountId: account.data.accountId,
      planId: 'casual',
      paymentToken: fresh.data.token,
    }));
    assert.equal(second.error.code, 'ALREADY_SUBSCRIBED');
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
