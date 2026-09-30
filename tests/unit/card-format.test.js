const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadScripts } = require('./helpers/browser-env');

function loadFormat() {
  return loadScripts(['card-format']).Breezy.cardFormat;
}

describe('digitsOnly and brands', () => {
  it('drops letters, spaces, and dashes', () => {
    const format = loadFormat();
    assert.equal(format.digitsOnly('42a4 2-4'), '42424');
  });

  it('detects the four brands from their prefixes', () => {
    const format = loadFormat();
    assert.equal(format.detectBrand('4'), 'visa');
    assert.equal(format.detectBrand('51'), 'mastercard');
    assert.equal(format.detectBrand('55'), 'mastercard');
    assert.equal(format.detectBrand('2221'), 'mastercard');
    assert.equal(format.detectBrand('2720'), 'mastercard');
    assert.equal(format.detectBrand('2220'), null);
    assert.equal(format.detectBrand('56'), null);
    assert.equal(format.detectBrand('34'), 'amex');
    assert.equal(format.detectBrand('37'), 'amex');
    assert.equal(format.detectBrand('6011'), 'discover');
    assert.equal(format.detectBrand('65'), 'discover');
    assert.equal(format.detectBrand('644'), 'discover');
    assert.equal(format.detectBrand('1234'), null);
    assert.equal(format.detectBrand(''), null);
  });
});

describe('length and grouping', () => {
  it('checks Luhn for the test cards and a changed last digit', () => {
    const { Breezy } = loadScripts(['plans-data', 'billing', 'card-format', 'validation', 'flow-state', 'mock-api']);
    Object.values(Breezy.api.TEST_CARDS).forEach(digits => {
      assert.equal(Breezy.cardFormat.luhnValid(digits), true, digits);
    });
    assert.equal(Breezy.cardFormat.luhnValid('4242424242424241'), false);
  });

  it('groups Visa in fours and Amex as 4-6-5 without a trailing space', () => {
    const format = loadFormat();
    assert.equal(format.formatCardNumber('4242424242424242', 'visa'), '4242 4242 4242 4242');
    assert.equal(format.formatCardNumber('378282246310005', 'amex'), '3782 822463 10005');
    assert.equal(format.formatCardNumber('42424', 'visa'), '4242 4');
  });

  it('inserts the expiry slash only after the second digit', () => {
    const format = loadFormat();
    assert.equal(format.formatExpiry('1'), '1');
    assert.equal(format.formatExpiry('12'), '12');
    assert.equal(format.formatExpiry('122'), '12/2');
    assert.equal(format.formatExpiry('1227'), '12/27');
  });

  it('gives Amex a shorter number and a longer security code', () => {
    const format = loadFormat();
    assert.equal(format.expectedLength('amex'), 15);
    assert.equal(format.cvcLength('amex'), 4);
    ['visa', 'mastercard', 'discover', null].forEach(brand => {
      assert.equal(format.expectedLength(brand), 16, String(brand));
      assert.equal(format.cvcLength(brand), 3, String(brand));
    });
  });
});
