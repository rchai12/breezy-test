(function () {
  'use strict';

  const Breezy = (window.Breezy = window.Breezy || {});
  const STORAGE_KEY = 'breezy.signup';
  const STATE_KEYS = ['version', 'planId', 'account', 'subscription'];

  let storageAvailable = true;
  let memoryState = null;

  function emptyState() {
    return {
      version: 1,
      planId: null,
      account: null,
      subscription: null,
    };
  }

  function copyState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function load() {
    let raw = null;
    try {
      if (typeof sessionStorage === 'undefined') throw new Error('sessionStorage unavailable');
      raw = sessionStorage.getItem(STORAGE_KEY);
    } catch (err) {
      storageAvailable = false;
      return memoryState ? copyState(memoryState) : emptyState();
    }

    if (!raw) return emptyState();

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1) return emptyState();
      return {
        version: 1,
        planId: parsed.planId ?? null,
        account: parsed.account ?? null,
        subscription: parsed.subscription ?? null,
      };
    } catch (err) {
      return emptyState();
    }
  }

  function persist(state) {
    memoryState = copyState(state);
    if (!storageAvailable) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
    } catch (err) {
      storageAvailable = false;
    }
  }

  memoryState = load();

  /**
   * @returns {object}
   */
  function get() {
    return copyState(memoryState);
  }

  /**
   * @param {object} partial
   * @returns {object}
   */
  function update(partial) {
    Object.keys(partial).forEach(key => {
      if (!STATE_KEYS.includes(key)) {
        throw new Error(`Unknown signup state key: ${key}`);
      }
    });
    persist({ ...memoryState, ...partial });
    return get();
  }

  function clear() {
    persist(emptyState());
  }

  /**
   * @returns {string|null}
   */
  function readPlanParam() {
    const id = new URLSearchParams(window.location.search).get('plan');
    const plan = id && Breezy.plans.get(id);
    if (!plan || !plan.selfServe) return null;
    return plan.id;
  }

  /**
   * @param {string} step
   * @returns {boolean}
   */
  function guard(step) {
    const state = get();
    const plan = Breezy.plans.get(state.planId);
    const hasPlan = !!(plan && plan.selfServe);
    const hasAccount = state.account != null;
    const hasSubscription = state.subscription != null;
    let redirect = null;

    if ((step === 'register' || step === 'payment') && hasSubscription) {
      redirect = 'plans.html';
    } else if (step === 'register' && !hasPlan) {
      redirect = 'plans.html';
    } else if (step === 'payment') {
      if (!hasPlan) redirect = 'plans.html';
      else if (!hasAccount) redirect = 'register.html';
    } else if (step === 'confirmation' && !hasSubscription) {
      if (!hasPlan) redirect = 'plans.html';
      else if (!hasAccount) redirect = 'register.html';
      else redirect = 'payment.html';
    }

    if (redirect) {
      window.location.replace(redirect);
      return false;
    }
    return true;
  }

  Breezy.flow = {
    get storageAvailable() {
      return storageAvailable;
    },
    get,
    update,
    clear,
    readPlanParam,
    guard,
    STEPS: ['plans', 'register', 'payment', 'confirmation'],
  };
})();
