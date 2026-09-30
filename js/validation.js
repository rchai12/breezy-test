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

  Breezy.validation = {
    firstName,
    lastName,
    email,
    password,
    passwordConfirm,
    waiver,
    passwordChecks,
    account,
  };
})();
