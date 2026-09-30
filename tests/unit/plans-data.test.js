const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { loadScripts, plain } = require('./helpers/browser-env');

function loadPlans(options) {
  return loadScripts(['plans-data'], options);
}

describe('plan list', () => {
  it('lists casual, power, and enterprise in that order', () => {
    const { Breezy } = loadPlans();
    assert.deepEqual(plain(Breezy.plans.list.map(plan => plan.id)), ['casual', 'power', 'enterprise']);
    const notSelfServe = Breezy.plans.list.filter(plan => plan.selfServe === false).map(plan => plan.id);
    assert.deepEqual(plain(notSelfServe), ['enterprise']);
    assert.equal(Breezy.plans.get('power').trialDays, 7);
    assert.equal(Breezy.plans.get('casual').trialDays, 0);
    assert.equal(Breezy.plans.get('enterprise').trialDays, 0);
  });

  it('returns the power plan and null for unknown ids', () => {
    const { Breezy } = loadPlans();
    assert.equal(Breezy.plans.get('power').name, 'Power Inhaler');
    assert.equal(Breezy.plans.get('nope'), null);
    assert.equal(Breezy.plans.get(null), null);
    assert.equal(Breezy.plans.get(undefined), null);
  });

  it('formats whole dollars without cents and keeps cents otherwise', () => {
    const { Breezy } = loadPlans();
    assert.equal(Breezy.plans.formatPrice(900), '$9');
    assert.equal(Breezy.plans.formatPrice(2900), '$29');
    assert.equal(Breezy.plans.formatPrice(2950), '$29.50');
    assert.equal(Breezy.plans.formatPrice(0), '$0');
  });
});

describe('comparison data', () => {
  it('has the seven comparison rows in order', () => {
    const { Breezy } = loadPlans();
    assert.deepEqual(
      plain(Breezy.plans.comparison.map(row => row.id)),
      ['breaths', 'blends', 'nostrils', 'support', 'airReport', 'sso', 'sla']
    );
  });

  it('reports no errors for the real comparison table', () => {
    const { Breezy } = loadPlans();
    assert.deepEqual(plain(Breezy.plans._findDataErrors(Breezy.plans.comparison)), []);
  });

  it('reports a missing plan id and a numeric value', () => {
    const { Breezy } = loadPlans();
    const missing = Breezy.plans._findDataErrors([
      { id: 'breaths', values: { casual: '23,000', power: 'Unlimited' } },
    ]);
    assert.equal(missing.length, 1);
    assert.match(missing[0], /breaths/);
    assert.match(missing[0], /enterprise/);

    const numeric = Breezy.plans._findDataErrors([
      { id: 'breaths', values: { casual: 5, power: 'Unlimited', enterprise: 'Unlimited' } },
    ]);
    assert.equal(numeric.length, 1);
    assert.match(numeric[0], /invalid value/);
    assert.match(numeric[0], /casual/);
  });

  it('freezes the plan list and comparison rows', () => {
    const { Breezy, context } = loadPlans();
    assert.equal(Object.isFrozen(Breezy.plans.list), true);
    Breezy.plans.list.forEach(plan => assert.equal(Object.isFrozen(plan), true));
    assert.equal(Object.isFrozen(Breezy.plans.comparison), true);
    Breezy.plans.comparison.forEach(row => {
      assert.equal(Object.isFrozen(row), true);
      assert.equal(Object.isFrozen(row.values), true);
    });

    const before = Breezy.plans.comparison[0].values.casual;
    vm.runInContext("Breezy.plans.comparison[0].values.casual = 'x';", context);
    assert.equal(Breezy.plans.comparison[0].values.casual, before);
  });

  it('does not log errors when the real data loads', () => {
    const error = mock.fn();
    loadPlans({ console: { error, log() {}, warn() {}, info() {} } });
    assert.equal(error.mock.callCount(), 0);
  });
});
