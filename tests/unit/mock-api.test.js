const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { loadScripts, makeStorage, plain } = require('./helpers/browser-env');

const CODES = ['VALIDATION_ERROR', 'EMAIL_TAKEN', 'CARD_DECLINED', 'NOT_FOUND', 'NOT_IMPLEMENTED'];

function loadApi(options) {
  return loadScripts(['plans-data', 'flow-state', 'mock-api'], options);
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

  it('createAccount is a stub until Phase 3', async () => {
    const { Breezy } = loadApi();
    const result = await settle(Breezy.api.createAccount({}));
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'NOT_IMPLEMENTED');
    assert.equal(typeof result.error.message, 'string');
    assert.deepEqual(plain(result.error.fields), {});
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
