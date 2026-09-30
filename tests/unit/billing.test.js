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

describe('addMonths', () => {
  it('moves September 30 forward one month', () => {
    const { Breezy } = loadBilling();
    const next = Breezy.billing.addMonths(new Date(2026, 8, 30), 1);
    assert.deepEqual([next.getFullYear(), next.getMonth(), next.getDate()], [2026, 9, 30]);
  });

  it('clamps January 31 to the last day of February, including leap years', () => {
    const { Breezy } = loadBilling();
    const plain = Breezy.billing.addMonths(new Date(2027, 0, 31), 1);
    const leap = Breezy.billing.addMonths(new Date(2028, 0, 31), 1);
    assert.deepEqual([plain.getFullYear(), plain.getMonth(), plain.getDate()], [2027, 1, 28]);
    assert.deepEqual([leap.getFullYear(), leap.getMonth(), leap.getDate()], [2028, 1, 29]);
  });

  it('crosses a year and accepts a negative month count', () => {
    const { Breezy } = loadBilling();
    const january = Breezy.billing.addMonths(new Date(2026, 11, 15), 1);
    const february = Breezy.billing.addMonths(new Date(2026, 2, 31), -1);
    assert.deepEqual([january.getFullYear(), january.getMonth(), january.getDate()], [2027, 0, 15]);
    assert.deepEqual([february.getFullYear(), february.getMonth(), february.getDate()], [2026, 1, 28]);
  });

  it('keeps the time of day and does not mutate the input', () => {
    const { Breezy } = loadBilling();
    const start = new Date(2026, 8, 30, 15, 45, 12);
    const before = start.getTime();
    const next = Breezy.billing.addMonths(start, 1);
    assert.equal(start.getTime(), before);
    assert.equal(next.getHours(), 15);
    assert.equal(next.getMinutes(), 45);
    assert.equal(next.getSeconds(), 12);
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
