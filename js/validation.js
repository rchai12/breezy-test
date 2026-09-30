(function () {
  'use strict';

  const Breezy = (window.Breezy = window.Breezy || {});
  const NAME_PATTERN = /^\p{L}[\p{L}\p{M}'’ .-]*$/u;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function cleanName(raw) {
    return String(raw ?? '').trim().replace(/\s+/g, ' ');
  }

  function checkName(raw, requiredMessage) {
    const value = cleanName(raw);
    if (!value) return { value, error: requiredMessage };
    if (value.length > 50) return { value, error: 'Keep it under 50 characters.' };
    if (!NAME_PATTERN.test(value)) {
      return { value, error: 'Use letters only. Spaces, hyphens, apostrophes and periods are fine.' };
    }
    return { value, error: null };
  }

  /**
   * @param {string} raw
   * @returns {{ value: string, error: string|null }}
   */
  function firstName(raw) {
    return checkName(raw, 'Enter your first name.');
  }

  /**
   * @param {string} raw
   * @returns {{ value: string, error: string|null }}
   */
  function lastName(raw) {
    return checkName(raw, 'Enter your last name.');
  }

  /**
   * @param {string} raw
   * @returns {{ value: string, error: string|null }}
   */
  function email(raw) {
    const value = String(raw ?? '').trim().toLowerCase();
    if (!value) return { value, error: 'Enter your email address.' };
    if (value.length > 254) return { value, error: "Email addresses can't be longer than 254 characters." };
    if (!EMAIL_PATTERN.test(value)) return { value, error: 'Enter an email like name@example.com.' };
    return { value, error: null };
  }

  /**
   * @param {string} raw
   * @returns {{ length: boolean, letter: boolean, number: boolean }}
   */
  function passwordChecks(raw) {
    const value = String(raw ?? '');
    return {
      length: value.length >= 8,
      letter: /\p{L}/u.test(value),
      number: /\d/.test(value),
    };
  }

  /**
   * @param {string} raw
   * @returns {{ value: string, error: string|null }}
   */
  function password(raw) {
    const value = String(raw ?? '');
    if (!value) return { value, error: 'Create a password.' };
    if (value.length > 128) return { value, error: 'Keep it under 128 characters.' };
    const checks = passwordChecks(value);
    if (!checks.length || !checks.letter || !checks.number) {
      return { value, error: 'Use at least 8 characters, including a letter and a number.' };
    }
    return { value, error: null };
  }

  /**
   * @param {string} passwordValue
   * @param {string} confirmRaw
   * @returns {{ value: string, error: string|null }}
   */
  function passwordConfirm(passwordValue, confirmRaw) {
    const value = String(confirmRaw ?? '');
    if (!value) return { value, error: 'Re-enter your password.' };
    if (value !== String(passwordValue ?? '')) return { value, error: "Passwords don't match." };
    return { value, error: null };
  }

  /**
   * @param {boolean} checked
   * @returns {{ value: boolean, error: string|null }}
   */
  function waiver(checked) {
    const value = !!checked;
    if (!value) return { value, error: 'Please accept the Nostril Waiver to continue.' };
    return { value, error: null };
  }

  /**
   * @param {{ firstName: string, lastName: string, email: string, password: string, passwordConfirm: string, waiver: boolean }} input
   * @returns {{ values: { firstName: string, lastName: string, email: string, password: string }, errors: Object<string, string> }}
   */
  function account(input) {
    const first = firstName(input.firstName);
    const last = lastName(input.lastName);
    const mail = email(input.email);
    const pass = password(input.password);
    const confirm = passwordConfirm(input.password, input.passwordConfirm);
    const accepted = waiver(input.waiver);
    const errors = {};
    if (first.error) errors.firstName = first.error;
    if (last.error) errors.lastName = last.error;
    if (mail.error) errors.email = mail.error;
    if (pass.error) errors.password = pass.error;
    if (confirm.error) errors.passwordConfirm = confirm.error;
    if (accepted.error) errors.waiver = accepted.error;
    return {
      values: {
        firstName: first.value,
        lastName: last.value,
        email: mail.value,
        password: pass.value,
      },
      errors,
    };
  }

  /**
   * @param {string} raw
   * @returns {{ value: string, error: string|null }}
   */
  function cardName(raw) {
    const value = cleanName(raw);
    if (!value) return { value, error: 'Enter the name on your card.' };
    if (value.length < 2) return { value, error: 'Enter the full name on your card.' };
    if (value.length > 100) return { value, error: 'Keep it under 100 characters.' };
    if (!NAME_PATTERN.test(value)) {
      return { value, error: 'Use letters only. Spaces, hyphens, apostrophes and periods are fine.' };
    }
    return { value, error: null };
  }

  /**
   * @param {string} raw
   * @returns {{ value: { digits: string, brand: string|null }, error: string|null }}
   */
  function cardNumber(raw) {
    const digits = Breezy.cardFormat.digitsOnly(raw);
    const brand = Breezy.cardFormat.detectBrand(digits);
    const value = { digits, brand };
    if (!digits) return { value, error: 'Enter your card number.' };
    if (!brand) return { value, error: 'We accept Visa, Mastercard, American Express and Discover.' };
    const length = Breezy.cardFormat.expectedLength(brand);
    if (digits.length !== length) return { value, error: `Enter the full ${length}-digit card number.` };
    if (!Breezy.cardFormat.luhnValid(digits)) return { value, error: "Check your card number. It doesn't look right." };
    return { value, error: null };
  }

  /**
   * @param {string} raw
   * @param {Date} [now]
   * @returns {{ value: { month: number|null, year: number|null }, error: string|null }}
   */
  function cardExpiry(raw, now = new Date()) {
    const digits = Breezy.cardFormat.digitsOnly(raw);
    const month = digits.length >= 2 ? Number(digits.slice(0, 2)) : null;
    const year = digits.length >= 4 ? 2000 + Number(digits.slice(2, 4)) : null;
    const value = { month, year };
    if (!digits) return { value, error: 'Enter the expiry date.' };
    if (digits.length !== 4) return { value, error: 'Use the format MM/YY.' };
    if (month < 1 || month > 12) return { value, error: 'Enter a month from 01 to 12.' };
    const nowIndex = now.getFullYear() * 12 + now.getMonth();
    const cardIndex = year * 12 + (month - 1);
    if (cardIndex < nowIndex) return { value, error: 'This card has expired.' };
    if (year > now.getFullYear() + 20) return { value, error: 'Check the expiry year.' };
    return { value, error: null };
  }

  /**
   * @param {string} raw
   * @param {string|null} brand
   * @returns {{ value: string, error: string|null }}
   */
  function cardCvc(raw, brand) {
    const value = Breezy.cardFormat.digitsOnly(raw);
    if (!value) return { value, error: 'Enter the security code.' };
    const length = Breezy.cardFormat.cvcLength(brand);
    if (value.length !== length) {
      if (brand === 'amex') {
        return { value, error: 'Enter the 4-digit security code on the front of your card.' };
      }
      return { value, error: 'Enter the 3-digit security code.' };
    }
    return { value, error: null };
  }

  /**
   * @param {string} raw
   * @returns {{ value: string, error: string|null }}
   */
  function postalCode(raw) {
    const value = String(raw ?? '').trim().toUpperCase();
    if (!value) return { value, error: 'Enter your postal code.' };
    if (!/^[A-Z0-9][A-Z0-9 -]{1,8}[A-Z0-9]$/.test(value)) {
      return { value, error: 'Use 3\u201310 letters, numbers, spaces or hyphens.' };
    }
    return { value, error: null };
  }

  /**
   * @param {{ cardName: string, cardNumber: string, cardExpiry: string, cardCvc: string, postalCode: string }} input
   * @param {Date} [now]
   * @returns {{ values: object, errors: Object<string, string> }}
   */
  function payment(input, now) {
    const name = cardName(input.cardName);
    const number = cardNumber(input.cardNumber);
    const expiry = cardExpiry(input.cardExpiry, now);
    const cvc = cardCvc(input.cardCvc, number.value.brand);
    const postal = postalCode(input.postalCode);
    const errors = {};
    if (name.error) errors.cardName = name.error;
    if (number.error) errors.cardNumber = number.error;
    if (expiry.error) errors.cardExpiry = expiry.error;
    if (cvc.error) errors.cardCvc = cvc.error;
    if (postal.error) errors.postalCode = postal.error;
    return {
      values: {
        cardName: name.value,
        cardNumber: number.value,
        cardExpiry: expiry.value,
        cardCvc: cvc.value,
        postalCode: postal.value,
      },
      errors,
    };
  }

  Breezy.validation = {
    firstName,
    lastName,
    email,
    password,
    passwordConfirm,
    waiver,
    passwordChecks,
    account,
    cardName,
    cardNumber,
    cardExpiry,
    cardCvc,
    postalCode,
    payment,
  };
})();
