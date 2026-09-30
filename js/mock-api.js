(function () {
  'use strict';

  const Breezy = (window.Breezy = window.Breezy || {});
  const DB_KEY = 'breezy.db';

  let storageAvailable = true;
  let memoryDb = null;

  function emptyDb() {
    return {
      version: 1,
      accounts: [],
      paymentMethods: [],
      subscriptions: [],
    };
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
   * Phase 3.
   * @param {{name: string, email: string, password: string}} input
   * @returns {Promise<object>} data: { accountId, name, email, createdAt }
   */
  async function createAccount(input) {
    await delay();
    return notImplemented('createAccount');
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
