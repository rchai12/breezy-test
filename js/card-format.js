(function () {
  'use strict';

  const Breezy = (window.Breezy = window.Breezy || {});

  const BRAND_NAMES = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
  };

  /**
   * @param {string} raw
   * @returns {string}
   */
  function digitsOnly(raw) {
    return String(raw ?? '').replace(/\D/g, '');
  }

  /**
   * @param {string} digits
   * @returns {'visa'|'mastercard'|'amex'|'discover'|null}
   */
  function detectBrand(digits) {
    const value = digitsOnly(digits);
    if (!value) return null;
    if (value.startsWith('34') || value.startsWith('37')) return 'amex';
    if (/^5[1-5]/.test(value)) return 'mastercard';
    if (value.length >= 4) {
      const prefix = Number(value.slice(0, 4));
      if (prefix >= 2221 && prefix <= 2720) return 'mastercard';
    }
    if (value.startsWith('6011') || value.startsWith('65')) return 'discover';
    if (value.length >= 3) {
      const prefix = Number(value.slice(0, 3));
      if (prefix >= 644 && prefix <= 649) return 'discover';
    }
    if (value.startsWith('4')) return 'visa';
    return null;
  }

  /**
   * @param {string} digits
   * @returns {boolean}
   */
  function luhnValid(digits) {
    const value = digitsOnly(digits);
    if (!value) return false;
    let sum = 0;
    let alternate = false;
    for (let i = value.length - 1; i >= 0; i -= 1) {
      let n = Number(value[i]);
      if (alternate) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }

  /**
   * @param {string|null} brand
   * @returns {number}
   */
  function expectedLength(brand) {
    return brand === 'amex' ? 15 : 16;
  }

  /**
   * @param {string|null} brand
   * @returns {number}
   */
  function cvcLength(brand) {
    return brand === 'amex' ? 4 : 3;
  }

  /**
   * @param {string} digits
   * @param {string|null} brand
   * @returns {string}
   */
  function formatCardNumber(digits, brand) {
    const clean = digitsOnly(digits);
    const sizes = brand === 'amex' ? [4, 6, 5] : [4, 4, 4, 4, 4];
    const parts = [];
    let index = 0;
    sizes.forEach(size => {
      if (index >= clean.length) return;
      parts.push(clean.slice(index, index + size));
      index += size;
    });
    if (index < clean.length) parts.push(clean.slice(index));
    return parts.join(' ');
  }

  /**
   * @param {string} digits
   * @returns {string}
   */
  function formatExpiry(digits) {
    const clean = digitsOnly(digits).slice(0, 4);
    if (clean.length <= 2) return clean;
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  }

  Breezy.cardFormat = {
    digitsOnly,
    detectBrand,
    luhnValid,
    expectedLength,
    cvcLength,
    formatCardNumber,
    formatExpiry,
    BRAND_NAMES,
  };
})();
