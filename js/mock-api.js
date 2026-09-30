(function () {
  'use strict';

  const Breezy = (window.Breezy = window.Breezy || {});
  const DB_KEY = 'breezy.db';

  let storageAvailable = true;
  let memoryDb = null;

  function emptyDb() {
    return {
      version: 1,
      accounts: [{
        accountId: 'acc_demo',
        firstName: 'Tay',
        lastName: 'Ken',
        email: 'taken@breezy.io',
        passwordHash: null,
        salt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      }],
      paymentMethods: [],
      subscriptions: [],
    };
  }

  function toHex(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // A real system hashes on the server with a slow algorithm (bcrypt, scrypt or Argon2).
  // PBKDF2 in the browser only shows the principle: store a salted hash, never the password.
  async function hashPassword(password, saltBytes) {
    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
      material,
      256
    );
    return toHex(new Uint8Array(bits));
  }

  function loadDb() {
    let raw = null;
    try {
      if (typeof localStorage === 'undefined') throw new Error('localStorage unavailable');
      raw = localStorage.getItem(DB_KEY);
    } catch (err) {
      storageAvailable = false;
      return memoryDb ? memoryDb : emptyDb();
    }

    if (!raw) return emptyDb();

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1) return emptyDb();
      return {
        version: 1,
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        paymentMethods: Array.isArray(parsed.paymentMethods) ? parsed.paymentMethods : [],
        subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
      };
    } catch (err) {
      return emptyDb();
    }
  }

  function saveDb(db) {
    memoryDb = db;
    if (!storageAvailable) return;
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (err) {
      storageAvailable = false;
    }
  }

  function delay() {
    const ms = 400 + Math.floor(Math.random() * 501);
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function notImplemented(name) {
    return {
      ok: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: `${name} is not implemented yet`,
        fields: {},
      },
    };
  }

  /**
   * @param {{ firstName: string, lastName: string, email: string, password: string, passwordConfirm: string, waiver: boolean }} input
   * @returns {Promise<object>} data: { accountId, firstName, lastName, email, createdAt }
   */
  async function createAccount(input) {
    await delay();
    if (!crypto || !crypto.subtle) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: "This browser can't create accounts securely.",
          fields: {},
        },
      };
    }

    const checked = Breezy.validation.account(input);
    if (Object.keys(checked.errors).length) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please fix the highlighted fields.',
          fields: checked.errors,
        },
      };
    }

    const db = loadDb();
    const emailTaken = db.accounts.some(account => account.email === checked.values.email);
    if (emailTaken) {
      return {
        ok: false,
        error: {
          code: 'EMAIL_TAKEN',
          message: 'An account with this email already exists.',
          fields: { email: 'An account with this email already exists.' },
        },
      };
    }

    const saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
    const passwordHash = await hashPassword(checked.values.password, saltBytes);
    const account = {
      accountId: `acc_${toHex(crypto.getRandomValues(new Uint8Array(6)))}`,
      firstName: checked.values.firstName,
      lastName: checked.values.lastName,
      email: checked.values.email,
      passwordHash,
      salt: toHex(saltBytes),
      createdAt: new Date().toISOString(),
    };
    db.accounts.push(account);
    saveDb(db);
    return {
      ok: true,
      data: {
        accountId: account.accountId,
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        createdAt: account.createdAt,
      },
    };
  }

  /**
   * Phase 4. Simulates a payment provider turning a card into a token.
   * @param {{number: string, expMonth: number, expYear: number, cvc: string, name: string, postalCode: string}} card
   * @returns {Promise<object>} data: { token, brand, last4, expMonth, expYear }
   */
  async function tokenizeCard(card) {
    await delay();
    return notImplemented('tokenizeCard');
  }

  /**
   * Phase 4.
   * @param {{accountId: string, planId: string, paymentToken: string}} input
   * @returns {Promise<object>} data: { subscriptionId, planId, status, startedAt, firstChargeAt, amountCents, card: { brand, last4 } }
   */
  async function createSubscription(input) {
    await delay();
    return notImplemented('createSubscription');
  }

  // Clears breezy.db. For manual testing only.
  function resetDb() {
    memoryDb = emptyDb();
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(DB_KEY);
    } catch (err) {
      storageAvailable = false;
    }
  }

  Breezy.api = {
    ERRORS: Object.freeze({
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      EMAIL_TAKEN: 'EMAIL_TAKEN',
      CARD_DECLINED: 'CARD_DECLINED',
      NOT_FOUND: 'NOT_FOUND',
      NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
    }),
    createAccount,
    tokenizeCard,
    createSubscription,
    resetDb,
  };
})();
