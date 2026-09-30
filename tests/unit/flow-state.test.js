const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadScripts, makeStorage, makeBlockedStorage, plain } = require('./helpers/browser-env');

const EMPTY = { version: 1, planId: null, account: null, subscription: null };
const SCRIPTS = ['plans-data', 'flow-state'];

function loadFlow(options) {
  return loadScripts(SCRIPTS, options);
}

describe('readPlanParam', () => {
  it('returns a self-serve plan id and ignores the rest', () => {
    const cases = [
      ['?plan=power', 'power'],
      ['?plan=casual', 'casual'],
      ['?plan=enterprise', null],
      ['?plan=bogus', null],
      ['?plan=', null],
      ['', null],
    ];
    cases.forEach(([search, expected]) => {
      const { Breezy } = loadFlow({ search });
      assert.equal(Breezy.flow.readPlanParam(), expected);
    });
  });
});

describe('guard', () => {
  it('allows the plans page and sends an empty signup back to plans', () => {
    const plans = loadFlow();
    assert.equal(plans.Breezy.flow.guard('plans'), true);
    assert.deepEqual(plans.replaced, []);

    ['register', 'payment', 'confirmation'].forEach(step => {
      const loaded = loadFlow();
      assert.equal(loaded.Breezy.flow.guard(step), false);
      assert.deepEqual(loaded.replaced, ['plans.html']);
    });
  });

  it('allows register but not payment or confirmation when only a plan is chosen', () => {
    const register = loadFlow();
    register.Breezy.flow.update({ planId: 'power' });
    assert.equal(register.Breezy.flow.guard('register'), true);
    assert.deepEqual(register.replaced, []);

    const payment = loadFlow();
    payment.Breezy.flow.update({ planId: 'power' });
    assert.equal(payment.Breezy.flow.guard('payment'), false);
    assert.deepEqual(payment.replaced, ['register.html']);

    const confirmation = loadFlow();
    confirmation.Breezy.flow.update({ planId: 'power' });
    assert.equal(confirmation.Breezy.flow.guard('confirmation'), false);
    assert.deepEqual(confirmation.replaced, ['register.html']);
  });

  it('allows payment and sends confirmation back to payment when an account exists', () => {
    const account = { accountId: 'acc_test', name: 'Ada Breath', email: 'ada@example.com' };
    const payment = loadFlow();
    payment.Breezy.flow.update({ planId: 'power', account });
    assert.equal(payment.Breezy.flow.guard('payment'), true);

    const confirmation = loadFlow();
    confirmation.Breezy.flow.update({ planId: 'power', account });
    assert.equal(confirmation.Breezy.flow.guard('confirmation'), false);
    assert.deepEqual(confirmation.replaced, ['payment.html']);
  });

  it('allows confirmation when a subscription is set', () => {
    const { Breezy } = loadFlow();
    Breezy.flow.update({
      subscription: { subscriptionId: 'sub_test', planId: 'power', status: 'trialing' },
    });
    assert.equal(Breezy.flow.guard('confirmation'), true);
  });

  it('sends enterprise back to plans because it is not self-serve', () => {
    const { Breezy, replaced } = loadFlow();
    Breezy.flow.update({ planId: 'enterprise' });
    assert.equal(Breezy.flow.guard('register'), false);
    assert.deepEqual(replaced, ['plans.html']);
  });
});

describe('flow state', () => {
  it('rejects a password and leaves the state unchanged', () => {
    const { Breezy } = loadFlow();
    assert.throws(() => Breezy.flow.update({ password: 'x' }), /password/);
    assert.deepEqual(plain(Breezy.flow.get()), EMPTY);
  });

  it('returns a copy from get', () => {
    const { Breezy } = loadFlow();
    Breezy.flow.update({ account: { accountId: 'acc_test', name: 'Ada', email: 'ada@example.com' } });
    const copy = Breezy.flow.get();
    copy.planId = 'power';
    copy.account.name = 'Changed';
    assert.equal(Breezy.flow.get().planId, null);
    assert.equal(Breezy.flow.get().account.name, 'Ada');
  });

  it('clears back to the empty state', () => {
    const { Breezy } = loadFlow();
    Breezy.flow.update({ planId: 'power' });
    Breezy.flow.clear();
    assert.deepEqual(plain(Breezy.flow.get()), EMPTY);
  });

  it('keeps planId when the same session storage is loaded again', () => {
    const sessionStorage = makeStorage();
    const first = loadFlow({ sessionStorage });
    first.Breezy.flow.update({ planId: 'casual' });
    const second = loadFlow({ sessionStorage });
    assert.equal(second.Breezy.flow.get().planId, 'casual');
  });

  it('discards damaged json and a mismatched version', () => {
    const damaged = makeStorage();
    damaged.setItem('breezy.signup', '{bad json');
    assert.deepEqual(plain(loadFlow({ sessionStorage: damaged }).Breezy.flow.get()), EMPTY);

    const wrongVersion = makeStorage();
    wrongVersion.setItem('breezy.signup', '{"version": 2, "planId": "power"}');
    assert.deepEqual(plain(loadFlow({ sessionStorage: wrongVersion }).Breezy.flow.get()), EMPTY);
  });

  it('keeps working in memory when storage is blocked', () => {
    const { Breezy } = loadFlow({ sessionStorage: makeBlockedStorage() });
    assert.equal(Breezy.flow.storageAvailable, false);
    assert.equal(Breezy.flow.update({ planId: 'casual' }).planId, 'casual');
    assert.equal(Breezy.flow.get().planId, 'casual');
  });
});
