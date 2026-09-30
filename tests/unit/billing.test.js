const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadScripts } = require('./helpers/browser-env');

function loadBilling() {
  return loadScripts(['plans-data', 'billing']);
}

describe('firstChargeDate', () => {
  it('adds the trial length and leaves a plan without a trial on the start date', () => {
    const { Breezy } = loadBilling();
    const start = new Date(2026, 8, 30);
    const power = Breezy.billing.firstChargeDate(Breezy.plans.get('power'), start);
    const casual = Breezy.billing.firstChargeDate(Breezy.plans.get('casual'), start);
    assert.deepEqual([power.getFullYear(), power.getMonth(), power.getDate()], [2026, 9, 7]);
    assert.deepEqual([casual.getFullYear(), casual.getMonth(), casual.getDate()], [2026, 8, 30]);
  });

  it('rolls across a month and a year', () => {
    const { Breezy } = loadBilling();
    const power = Breezy.plans.get('power');
    const october = Breezy.billing.firstChargeDate(power, new Date(2026, 8, 28));
    const january = Breezy.billing.firstChargeDate(power, new Date(2026, 11, 28));
    assert.deepEqual([october.getFullYear(), october.getMonth(), october.getDate()], [2026, 9, 5]);
    assert.deepEqual([january.getFullYear(), january.getMonth(), january.getDate()], [2027, 0, 4]);
  });

  it('does not mutate the start date', () => {
    const { Breezy } = loadBilling();
    const start = new Date(2026, 8, 30);
    const before = start.getTime();
    Breezy.billing.firstChargeDate(Breezy.plans.get('power'), start);
    assert.equal(start.getTime(), before);
  });
});

describe('formatDate', () => {
  it('omits the year in the same year and includes it across years', () => {
    const { Breezy } = loadBilling();
    assert.equal(
      Breezy.billing.formatDate(new Date(2026, 9, 7), new Date(2026, 8, 30)),
      'Oct 7'
    );
    assert.equal(
      Breezy.billing.formatDate(new Date(2027, 0, 4), new Date(2026, 11, 28)),
      'Jan 4, 2027'
    );
  });
});
